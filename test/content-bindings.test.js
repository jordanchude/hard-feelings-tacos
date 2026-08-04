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

test('public bindings cover registered content and only allowlisted runtime strings are unbound', () => {
  const result = verify();
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('binding verifier catches a removed registered key in a copied public page', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hft-content-bindings-'));
  fs.mkdirSync(path.join(fixtureRoot, 'js'));
  fs.mkdirSync(path.join(fixtureRoot, 'scripts'));
  fs.copyFileSync('index.html', path.join(fixtureRoot, 'index.html'));
  fs.copyFileSync('about-us.html', path.join(fixtureRoot, 'about-us.html'));
  fs.copyFileSync('package.json', path.join(fixtureRoot, 'package.json'));
  fs.copyFileSync('js/content-registry.js', path.join(fixtureRoot, 'js/content-registry.js'));
  fs.copyFileSync('scripts/verify-content-bindings.js', path.join(fixtureRoot, 'scripts/verify-content-bindings.js'));
  const indexPath = path.join(fixtureRoot, 'index.html');
  fs.writeFileSync(indexPath, fs.readFileSync(indexPath, 'utf8').replace('data-site-content-key="home_hero_heading"', ''));

  const result = verify(fixtureRoot);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /index\.html.*home_hero_heading/);
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});
