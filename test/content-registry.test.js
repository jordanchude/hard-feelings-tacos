import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScript } from './helpers/load-browser-script.js';

test('registry defines each key once and only safe rendering modes', () => {
  const { window } = loadBrowserScript('js/content-registry.js');
  const registry = window.HFT_CONTENT_REGISTRY;
  const byKey = window.HFT_CONTENT_BY_KEY;
  assert.ok(registry.length > 60);
  assert.equal(new Set(registry.map((item) => item.key)).size, registry.length);
  assert.deepEqual(new Set(registry.map((item) => item.mode)), new Set(['text', 'paragraphs', 'placeholder', 'value']));
  assert.ok(Object.isFrozen(registry));
  assert.ok(registry.every(Object.isFrozen));
  assert.ok(Object.isFrozen(byKey));
  assert.deepEqual([...Object.keys(byKey)].sort(), [...registry].map((item) => item.key).sort());
  registry.forEach((entry) => assert.equal(byKey[entry.key], entry));
  registry.forEach((entry) => {
    assert.ok(['Homepage', 'About', 'Shared'].includes(entry.page));
    assert.equal(entry.viewUrl, entry.page === 'About' ? '/about-us.html' : '/index.html');
    entry.selector.split(',').forEach((selector) => {
      assert.equal(selector.trim(), `[data-site-content-key="${entry.key}"]`);
    });
  });
  assert.deepEqual(
    Object.fromEntries(registry.filter((entry) => entry.metadataRole).map((entry) => [entry.key, entry.metadataRole])),
    {
      home_hero_heading: 'title',
      home_hero_intro: 'description',
      about_heading: 'title',
      about_intro: 'description'
    }
  );
  assert.doesNotThrow(() => window.HFT_CONTENT_REGISTRY_TEST_API.validateRegistry(registry));
});

test('registry validator rejects invalid structural and metadata definitions', () => {
  const { window } = loadBrowserScript('js/content-registry.js');
  const registry = window.HFT_CONTENT_REGISTRY;
  const { validateRegistry } = window.HFT_CONTENT_REGISTRY_TEST_API;
  const invalidEntries = [
    { ...registry[0], page: 'Elsewhere' },
    { ...registry[0], viewUrl: '/about-us.html' },
    { ...registry[0], selector: '[data-site-content-key="different_key"]' },
    { ...registry[0], help: '' },
    { ...registry[0], metadataRole: 'title' },
    { ...registry.find((entry) => entry.key === 'home_hero_heading'), metadataRole: 'description' }
  ];
  invalidEntries.forEach((entry) => assert.throws(() => validateRegistry([entry])));
});
