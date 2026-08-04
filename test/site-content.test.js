import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function fakeElement(text = '') {
  return {
    attributes: {},
    children: [],
    textContent: text,
    value: '',
    append(...nodes) {
      this.children.push(...nodes);
      this.textContent = this.children.map((node) => node.textContent || '').join('');
    },
    replaceChildren(...nodes) {
      this.children = [];
      this.textContent = '';
      if (nodes.length) this.append(...nodes);
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; }
  };
}

function fakeDocument(targets = {}) {
  const elements = Object.entries(targets).map(([key, element]) => ({
    ...element,
    dataset: { siteContentKey: key }
  }));
  return {
    readyState: 'loading',
    target: elements[0],
    targets: elements,
    title: 'Fallback title',
    addEventListener() {},
    createElement(tagName) { return { tagName: tagName.toUpperCase(), textContent: '' }; },
    createTextNode(textContent) { return { textContent }; },
    querySelectorAll(selector) { return selector === '[data-site-content-key]' ? elements : []; },
    querySelector() { return null; }
  };
}

function loadSiteContent(document, registry = {}, client) {
  const window = {
    HFT_CONTENT_BY_KEY: registry,
    supabase: { createClient: () => client || ({ from: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }) }) }
  };
  vm.runInNewContext(fs.readFileSync('js/site-content.js', 'utf8'), { window, document, console: { error() {} }, Map, Set, Array, Object, String });
  return window.HFT_SITE_CONTENT_TEST_API;
}

function metadataDocument() {
  const doc = fakeDocument();
  const tags = {
    description: fakeElement(),
    'og:title': fakeElement(),
    'og:description': fakeElement(),
    'twitter:title': fakeElement(),
    'twitter:description': fakeElement()
  };
  const selectors = {
    'meta[name="description"]': [tags.description],
    'meta[property="og:title"]': [tags['og:title']],
    'meta[property="og:description"]': [tags['og:description']],
    'meta[name="twitter:title"], meta[property="twitter:title"]': [tags['twitter:title']],
    'meta[name="twitter:description"], meta[property="twitter:description"]': [tags['twitter:description']]
  };
  doc.querySelectorAll = (selector) => selectors[selector] || [];
  return { doc, tags };
}

test('paragraph rendering treats markup as text and creates only controlled breaks', () => {
  const api = loadSiteContent(fakeDocument());
  const el = fakeElement('fallback');
  api.renderValue(el, '<img src=x onerror=1>\n\nsecond', 'paragraphs');
  assert.equal(el.textContent, '<img src=x onerror=1>second');
  assert.equal(el.children.filter((node) => node.tagName === 'BR').length, 2);
});

test('blank values preserve fallback content', () => {
  const doc = fakeDocument({ home_hero_heading: fakeElement('fallback heading') });
  const api = loadSiteContent(doc, { home_hero_heading: { mode: 'text' } });
  assert.deepEqual(api.applyContent(doc, [{ key: 'home_hero_heading', body: '   ' }]), new Map());
  assert.equal(doc.target.textContent, 'fallback heading');
});

test('metadata mirrors the designated resolved heading and intro', () => {
  const { doc, tags } = metadataDocument();
  const api = loadSiteContent(doc, {
    home_hero_heading: { key: 'home_hero_heading', metadataRole: 'title' },
    home_hero_intro: { key: 'home_hero_intro', metadataRole: 'description' }
  });
  api.applyMetadata(doc, new Map([
    ['home_hero_heading', 'Breakfast tacos'],
    ['home_hero_intro', 'Made fresh\n\nEvery Sunday']
  ]));
  assert.equal(doc.title, 'Breakfast tacos | Hard Feelings Tacos');
  assert.equal(tags['og:title'].getAttribute('content'), doc.title);
  assert.equal(tags['twitter:title'].getAttribute('content'), doc.title);
  assert.equal(tags.description.getAttribute('content'), 'Made fresh Every Sunday');
  assert.equal(tags['og:description'].getAttribute('content'), 'Made fresh Every Sunday');
  assert.equal(tags['twitter:description'].getAttribute('content'), 'Made fresh Every Sunday');
});

test('public loader requests and renders only registered keys on the page', async () => {
  const valid = fakeElement('fallback');
  const ignored = fakeElement('must remain');
  const doc = fakeDocument({ home_hero_heading: valid, unregistered_key: ignored });
  const requested = [];
  const client = {
    from(table) {
      assert.equal(table, 'site_content');
      return {
        select(columns) {
          assert.equal(columns, 'key, body');
          return { in(column, keys) {
            assert.equal(column, 'key');
            requested.push(...keys);
            return Promise.resolve({ data: [{ key: 'home_hero_heading', body: 'Fresh tacos' }], error: null });
          } };
        }
      };
    }
  };
  const api = loadSiteContent(doc, { home_hero_heading: { key: 'home_hero_heading', mode: 'text' } }, client);
  await api.loadSiteContent();
  assert.deepEqual(requested, ['home_hero_heading']);
  assert.equal(doc.targets[0].textContent, 'Fresh tacos');
  assert.equal(doc.targets[1].textContent, 'must remain');
});

test('public loader preserves fallback content when the request rejects', async () => {
  const doc = fakeDocument({ home_hero_heading: fakeElement('fallback heading') });
  const client = {
    from: () => ({ select: () => ({ in: () => Promise.reject(new Error('network unavailable')) }) })
  };
  const api = loadSiteContent(doc, { home_hero_heading: { key: 'home_hero_heading', mode: 'text' } }, client);
  await assert.doesNotReject(api.loadSiteContent());
  assert.equal(doc.target.textContent, 'fallback heading');
});
