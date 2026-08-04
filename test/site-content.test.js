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

function staticMetadataFallbackDocument() {
  const { doc, tags } = metadataDocument();
  const heading = fakeElement('Fallback heading');
  heading.dataset = { siteContentKey: 'home_hero_heading' };
  doc.targets = [heading];
  doc.querySelectorAll = (selector) => {
    if (selector === '[data-site-content-key]') return doc.targets;
    return {
      'meta[name="description"]': [tags.description],
      'meta[property="og:title"]': [tags['og:title']],
      'meta[property="og:description"]': [tags['og:description']],
      'meta[name="twitter:title"], meta[property="twitter:title"]': [tags['twitter:title']],
      'meta[name="twitter:description"], meta[property="twitter:description"]': [tags['twitter:description']]
    }[selector] || [];
  };
  doc.title = 'Static title';
  tags.description.setAttribute('content', 'Static description');
  tags['og:title'].setAttribute('content', 'Static title');
  tags['og:description'].setAttribute('content', 'Static description');
  tags['twitter:title'].setAttribute('content', 'Static title');
  tags['twitter:description'].setAttribute('content', 'Static description');
  return { doc, tags, heading };
}

test('paragraph rendering treats markup as text and creates only controlled breaks', () => {
  const api = loadSiteContent(fakeDocument());
  const el = fakeElement('fallback');
  api.renderValue(el, '<img src=x onerror=1>\n\nsecond', 'paragraphs');
  assert.equal(el.textContent, '<img src=x onerror=1>second');
  assert.equal(el.children.filter((node) => node.tagName === 'BR').length, 2);
});

test('placeholder and value bindings update their attributes without replacing fallback text', () => {
  const api = loadSiteContent(fakeDocument());
  const placeholder = fakeElement('Name field fallback');
  const value = fakeElement('Send request fallback');
  value.value = 'Send Pop-up Request';

  assert.equal(api.renderValue(placeholder, ' Your name ', 'placeholder'), true);
  assert.equal(placeholder.getAttribute('placeholder'), 'Your name');
  assert.equal(placeholder.textContent, 'Name field fallback');

  assert.equal(api.renderValue(value, ' Send inquiry ', 'value'), true);
  assert.equal(value.value, 'Send inquiry');
  assert.equal(value.textContent, 'Send request fallback');
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

test('public loader requests exactly the registered keys bound by its page', async () => {
  const heading = fakeElement('Fallback heading');
  const prompt = fakeElement('Fallback prompt');
  const ignored = fakeElement('Must remain');
  const doc = fakeDocument({ home_hero_heading: heading, home_host_name_placeholder: prompt, unknown_key: ignored });
  const requested = [];
  const client = {
    from: () => ({ select: () => ({ in: (column, keys) => {
      assert.equal(column, 'key');
      requested.push(...keys);
      return Promise.resolve({
        data: [
          { key: 'home_hero_heading', body: 'Fresh tacos' },
          { key: 'home_host_name_placeholder', body: 'Your name' },
          { key: 'shared_footer_tagline', body: 'Not on this page' }
        ],
        error: null
      });
    } }) })
  };
  const api = loadSiteContent(doc, {
    home_hero_heading: { key: 'home_hero_heading', mode: 'text' },
    home_host_name_placeholder: { key: 'home_host_name_placeholder', mode: 'placeholder' },
    shared_footer_tagline: { key: 'shared_footer_tagline', mode: 'text' }
  }, client);

  await api.loadSiteContent();

  assert.deepEqual([...requested].sort(), ['home_hero_heading', 'home_host_name_placeholder']);
  assert.equal(doc.targets[0].textContent, 'Fresh tacos');
  assert.equal(doc.targets[1].getAttribute('placeholder'), 'Your name');
  assert.equal(doc.targets[2].textContent, 'Must remain');
});

test('public loader preserves fallback content when the request rejects', async () => {
  const { doc, tags, heading } = staticMetadataFallbackDocument();
  const initialMetadata = {
    title: doc.title,
    description: tags.description.getAttribute('content'),
    ogTitle: tags['og:title'].getAttribute('content'),
    ogDescription: tags['og:description'].getAttribute('content'),
    twitterTitle: tags['twitter:title'].getAttribute('content'),
    twitterDescription: tags['twitter:description'].getAttribute('content')
  };
  const client = {
    from: () => ({ select: () => ({ in: () => Promise.reject(new Error('network unavailable')) }) })
  };
  const api = loadSiteContent(doc, { home_hero_heading: { key: 'home_hero_heading', mode: 'text', metadataRole: 'title' } }, client);
  await assert.doesNotReject(api.loadSiteContent());
  assert.equal(heading.textContent, 'Fallback heading');
  assert.deepEqual({
    title: doc.title,
    description: tags.description.getAttribute('content'),
    ogTitle: tags['og:title'].getAttribute('content'),
    ogDescription: tags['og:description'].getAttribute('content'),
    twitterTitle: tags['twitter:title'].getAttribute('content'),
    twitterDescription: tags['twitter:description'].getAttribute('content')
  }, initialMetadata);
});

test('public loader preserves public and metadata fallbacks when Supabase resolves with an error', async () => {
  const { doc, tags, heading } = staticMetadataFallbackDocument();
  const client = {
    from: () => ({ select: () => ({ in: () => Promise.resolve({ data: null, error: { message: 'RLS denied' } }) }) })
  };
  const api = loadSiteContent(doc, { home_hero_heading: { key: 'home_hero_heading', mode: 'text', metadataRole: 'title' } }, client);

  await assert.doesNotReject(api.loadSiteContent());

  assert.equal(heading.textContent, 'Fallback heading');
  assert.equal(doc.title, 'Static title');
  assert.equal(tags.description.getAttribute('content'), 'Static description');
  assert.equal(tags['og:title'].getAttribute('content'), 'Static title');
  assert.equal(tags['og:description'].getAttribute('content'), 'Static description');
  assert.equal(tags['twitter:title'].getAttribute('content'), 'Static title');
  assert.equal(tags['twitter:description'].getAttribute('content'), 'Static description');
});
