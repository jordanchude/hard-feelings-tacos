import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function element(tagName = 'div') {
  return {
    tagName: tagName.toUpperCase(), attributes: {}, children: [], value: '', style: {}, disabled: false, listeners: {},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name]; },
    addEventListener(name, listener) { this.listeners[name] = listener; }
  };
}

function descendants(node, found = []) {
  if (!node || !node.children) return found;
  found.push(node);
  node.children.forEach((child) => descendants(child, found));
  return found;
}

function registeredContent() {
  const window = {};
  vm.runInNewContext(fs.readFileSync('js/content-registry.js', 'utf8'), { window, Map, Set, Object });
  return window.HFT_CONTENT_REGISTRY;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

function setupController({ response = Promise.resolve({ data: [], error: null }) } = {}) {
  const mount = element();
  const calls = [];
  const flashes = [];
  const client = {
    from(table) {
      const call = { table };
      calls.push(call);
      return {
        select(columns) {
          call.method = 'select';
          call.columns = columns;
          return { in(column, keys) { call.column = column; call.keys = keys; return typeof response === 'function' ? response(call) : response; } };
        },
        upsert(rows, options) {
          Object.assign(call, { method: 'upsert', rows, options });
          return typeof response === 'function' ? response(call) : response;
        }
      };
    }
  };
  const window = { HFT_CONTENT_REGISTRY: registeredContent() };
  const document = { createElement: element };
  vm.runInNewContext(fs.readFileSync('js/admin-content.js', 'utf8'), { window, document, Map, Set, Array, Object, String, Promise });
  const controller = window.HFT_ADMIN_CONTENT.createContentController({ client, mount, showFlash(message, isError) { flashes.push({ message, isError }); } });
  return { controller, mount, calls, flashes, registry: window.HFT_CONTENT_REGISTRY };
}

function controlFor(mount, key) {
  return descendants(mount).find((node) => node.getAttribute && node.getAttribute('data-content-key') === key);
}

function buttonFor(mount, sectionId) {
  return descendants(mount).find((node) => node.getAttribute && node.getAttribute('data-section-id') === sectionId);
}

test('content controller remains isolated from pop-up event loading', () => {
  const controllerSource = fs.readFileSync('js/admin-content.js', 'utf8');
  const adminSource = fs.readFileSync('js/admin.js', 'utf8');
  assert.equal(controllerSource.includes("from('popups')"), false);
  assert.equal(adminSource.includes('loadAdminPopups()'), true);
});

test('renders all 66 fields in grouped accessible cards with the fixed page links', () => {
  const { mount, registry } = setupController();
  const controls = descendants(mount).filter((node) => node.tagName === 'INPUT' || node.tagName === 'TEXTAREA');
  assert.equal(registry.length, 66);
  assert.equal(controls.length, 66);
  for (const control of controls) {
    const key = control.getAttribute('data-content-key');
    const entry = registry.find((item) => item.key === key);
    const label = descendants(mount).find((node) => node.tagName === 'LABEL' && node.getAttribute('for') === control.id);
    assert.ok(label, `missing label for ${key}`);
    const helpId = control.getAttribute('aria-describedby');
    assert.ok(descendants(mount).some((node) => node.id === helpId), `missing help for ${key}`);
    assert.equal(control.getAttribute('maxlength'), entry.mode === 'paragraphs' ? '5000' : '160');
    assert.equal(control.disabled, true);
  }
  const links = descendants(mount).filter((node) => node.tagName === 'A');
  assert.deepEqual(links.map((link) => ({ text: link.textContent, href: link.href, target: link.target, rel: link.rel })), [
    { text: 'View homepage', href: '/index.html', target: '_blank', rel: 'noopener noreferrer' },
    { text: 'View homepage', href: '/index.html', target: '_blank', rel: 'noopener noreferrer' },
    { text: 'View About page', href: '/about-us.html', target: '_blank', rel: 'noopener noreferrer' }
  ]);
});

test('load hydrates all registry keys once and enables editing only after success', async () => {
  const request = deferred();
  const { controller, mount, calls, registry } = setupController({ response: request.promise });
  const first = controller.load();
  const second = controller.load();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, 'site_content');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].keys)), JSON.parse(JSON.stringify(registry.map(({ key }) => key))));
  const hero = controlFor(mount, 'home_hero_heading');
  assert.equal(hero.disabled, true);
  assert.equal(mount.getAttribute('aria-busy'), 'true');
  request.resolve({ data: [{ key: 'home_hero_heading', body: 'Fresh tacos' }], error: null });
  await Promise.all([first, second]);
  assert.equal(hero.value, 'Fresh tacos');
  assert.equal(hero.disabled, false);
  assert.equal(mount.getAttribute('aria-busy'), 'false');
  await controller.load();
  assert.equal(calls.length, 1);
});

test('load failures flash, retain disabled controls, and permit a later retry', async () => {
  const responses = [
    Promise.resolve({ data: null, error: { message: 'read denied' } }),
    Promise.reject(new Error('network unavailable')),
    Promise.resolve({ data: [{ key: 'home_hero_heading', body: 'Recovered' }], error: null })
  ];
  const { controller, mount, calls, flashes } = setupController({ response: () => responses.shift() });
  await assert.doesNotReject(controller.load());
  assert.equal(controlFor(mount, 'home_hero_heading').disabled, true);
  await assert.doesNotReject(controller.load());
  assert.equal(controlFor(mount, 'home_hero_heading').disabled, true);
  await controller.load();
  assert.equal(controlFor(mount, 'home_hero_heading').value, 'Recovered');
  assert.equal(calls.length, 3);
  assert.deepEqual(flashes, [
    { message: 'Failed to load site content: read denied', isError: true },
    { message: 'Failed to load site content: network unavailable', isError: true }
  ]);
});

test('saveSection rejects blanks and prevents duplicate writes while its button is pending', async () => {
  const save = deferred();
  const heroRows = registeredContent()
    .filter((entry) => entry.page === 'Homepage' && entry.section === 'hero')
    .map((entry) => ({ key: entry.key, body: `Original ${entry.key}` }));
  const { controller, mount, calls, flashes } = setupController({ response: (call) => (
    call.method === 'select'
      ? Promise.resolve({ data: heroRows, error: null })
      : save.promise
  ) });
  await controller.load();
  calls.length = 0;
  const hero = controlFor(mount, 'home_hero_heading');
  const sectionId = 'Homepage:hero';
  const button = buttonFor(mount, sectionId);
  hero.value = '  ';
  await controller.saveSection(sectionId);
  assert.equal(calls.length, 0);
  hero.value = 'Fresh copy';
  const firstSave = controller.saveSection(sectionId);
  assert.equal(button.disabled, true);
  assert.equal(buttonFor(mount, 'Homepage:menu marquee').disabled, false);
  const secondSave = controller.saveSection(sectionId);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, 'site_content');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].rows)), [
    { key: 'home_hero_heading', body: 'Fresh copy' },
    { key: 'home_hero_subtitle', body: 'Original home_hero_subtitle' },
    { key: 'home_hero_intro', body: 'Original home_hero_intro' },
    { key: 'home_hero_cta', body: 'Original home_hero_cta' }
  ]);
  save.resolve({ error: null });
  await Promise.all([firstSave, secondSave]);
  assert.equal(button.disabled, false);
  assert.deepEqual(flashes, [{ message: 'Content saved.', isError: undefined }]);
  assert.equal(calls.some((call) => call.table === 'popups'), false);
});

test('save rejections flash and restore the active section button', async () => {
  const heroRows = registeredContent()
    .filter((entry) => entry.page === 'Homepage' && entry.section === 'hero')
    .map((entry) => ({ key: entry.key, body: `Original ${entry.key}` }));
  const { controller, mount, flashes } = setupController({ response: (call) => (
    call.method === 'select'
      ? Promise.resolve({ data: heroRows, error: null })
      : Promise.reject(new Error('write unavailable'))
  ) });
  await controller.load();
  const button = buttonFor(mount, 'Homepage:hero');
  await assert.doesNotReject(controller.saveSection('Homepage:hero'));
  assert.equal(button.disabled, false);
  assert.deepEqual(flashes, [{ message: 'Save failed: write unavailable', isError: true }]);
});
