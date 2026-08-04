import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function element(tagName = 'div') {
  return {
    tagName: tagName.toUpperCase(), attributes: {}, children: [], value: '', style: {},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    addEventListener() {},
    getAttribute(name) { return this.attributes[name]; }
  };
}

function inputs(node, found = []) {
  if (!node || !node.children) return found;
  if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') found.push(node);
  for (const child of node.children) inputs(child, found);
  return found;
}

function setupController() {
  const mount = element();
  const calls = [];
  const client = {
    from(table) {
      const call = { table };
      calls.push(call);
      return {
        upsert(rows, options) { Object.assign(call, { method: 'upsert', rows, options }); return Promise.resolve({ error: null }); },
        select() { return { in: async () => ({ data: [], error: null }) }; }
      };
    }
  };
  const window = {
    HFT_CONTENT_REGISTRY: [
      { key: 'home_hero_heading', page: 'Homepage', section: 'hero', label: 'Hero heading', mode: 'text', help: 'Shown at the top.', viewUrl: '/index.html' },
      { key: 'about_bio', page: 'About', section: 'story', label: 'About bio', mode: 'paragraphs', help: 'Shown in the story.', viewUrl: '/about-us.html' }
    ]
  };
  const document = { createElement: element };
  vm.runInNewContext(fs.readFileSync('js/admin-content.js', 'utf8'), { window, document, Map, Set, Array, Object, String, Promise });
  const controller = window.HFT_ADMIN_CONTENT.createContentController({ client, mount, showFlash() {} });
  const fields = inputs(mount);
  return { controller, client: { calls }, section: { id: 'Homepage:hero', fields: [fields[0]] } };
}

test('saveSection rejects blanks and upserts only its section keys', async () => {
  const { controller, client, section } = setupController();
  section.fields[0].value = '  ';
  await controller.saveSection(section.id);
  assert.equal(client.calls.length, 0);
  section.fields[0].value = 'Fresh copy';
  await controller.saveSection(section.id);
  assert.deepEqual(JSON.parse(JSON.stringify(client.calls)), [{
    table: 'site_content', method: 'upsert',
    rows: [{ key: section.fields[0].getAttribute('data-content-key'), body: 'Fresh copy' }],
    options: { onConflict: 'key' }
  }]);
});
