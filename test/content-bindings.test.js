import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function verify(root = process.cwd()) {
  return spawnSync(process.execPath, ['scripts/verify-content-bindings.js'], {
    cwd: root,
    encoding: 'utf8'
  });
}

function copiedSite() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hft-content-bindings-'));
  fs.mkdirSync(path.join(root, 'js'));
  fs.mkdirSync(path.join(root, 'scripts'));
  for (const file of ['index.html', 'about-us.html', 'package.json']) fs.copyFileSync(file, path.join(root, file));
  fs.copyFileSync('js/content-registry.js', path.join(root, 'js/content-registry.js'));
  fs.copyFileSync('scripts/verify-content-bindings.js', path.join(root, 'scripts/verify-content-bindings.js'));
  return root;
}

function withCopiedSite(change, assertion) {
  const root = copiedSite();
  try {
    change(root);
    assertion(verify(root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('public bindings cover registered content and only allowlisted runtime strings are unbound', () => {
  const result = verify();
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('binding verifier catches a removed registered key in a copied public page', () => {
  withCopiedSite((root) => {
    const file = path.join(root, 'index.html');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('data-site-content-key="home_hero_heading"', ''));
  }, (result) => {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /index\.html.*home_hero_heading/);
  });
});

test('binding verifier rejects missing placeholder and invalid submit value bindings', () => {
  withCopiedSite((root) => {
    const file = path.join(root, 'index.html');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
      .replace('placeholder="Your name"', '')
      .replace('type="submit" data-wait="Please wait..."', 'type="button" data-wait="Please wait..."')
      .replace('value="Send Pop-up Request"', ''));
  }, (result) => {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /index\.html.*home_host_name_placeholder/);
    assert.match(result.stderr, /index\.html.*home_host_submit_label/);
  });
});

test('binding verifier catches removal of one required duplicate target', () => {
  withCopiedSite((root) => {
    const file = path.join(root, 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    const first = html.indexOf('data-site-content-key="home_values_body"');
    const second = html.indexOf('data-site-content-key="home_values_body"', first + 1);
    fs.writeFileSync(file, `${html.slice(0, second)}${html.slice(second).replace('data-site-content-key="home_values_body"', '')}`);
  }, (result) => {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /index\.html.*home_values_body/);
  });
});

test('binding verifier rejects an authored aria-label that overrides editable banner copy', () => {
  withCopiedSite((root) => {
    const file = path.join(root, 'index.html');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(
      'id="anniversary-banner" class="anniversary-banner"',
      'id="anniversary-banner" class="anniversary-banner" aria-label="Stale fixed promotion"'
    ));
  }, (result) => {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /index\.html.*aria-label.*shared_banner_badge|index\.html.*aria-label.*editable/i);
  });
});
