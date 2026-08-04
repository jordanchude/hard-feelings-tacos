import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScript } from './helpers/load-browser-script.js';

test('registry defines each key once and only safe rendering modes', () => {
  const { window } = loadBrowserScript('js/content-registry.js');
  const registry = window.HFT_CONTENT_REGISTRY;
  assert.ok(registry.length > 60);
  assert.equal(new Set(registry.map((item) => item.key)).size, registry.length);
  assert.deepEqual(new Set(registry.map((item) => item.mode)), new Set(['text', 'paragraphs', 'placeholder', 'value']));
  assert.doesNotThrow(() => window.HFT_CONTENT_REGISTRY_TEST_API.validateRegistry(registry));
});
