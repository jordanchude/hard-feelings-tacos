import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadBrowserScript } from './helpers/load-browser-script.js';

const sqlFile = 'supabase/seed-site-content.sql';
const preflightFile = 'supabase/check-site-content-access.sql';
const registry = loadBrowserScript('js/content-registry.js').window.HFT_CONTENT_REGISTRY;

function readNormalized(file) {
  return readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&(nbsp|amp|middot|lsquo|rsquo|quot|lt|gt);/gi, (_, name) => ({
      nbsp: ' ', amp: '&', middot: '·', lsquo: '‘', rsquo: '’', quot: '"', lt: '<', gt: '>'
    })[name.toLowerCase()]);
}

function normalizeFallback(value) {
  return decodeHtml(value
    .replace(/<br\s*\/?\s*>\s*<br\s*\/?\s*>/gi, '\n\n')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\u200d/g, '')
    .replace(/[ \t]+\n/g, '\n'));
}

function fallbacksFrom(file) {
  const html = readNormalized(file);
  const found = new Map();
  const tagPattern = /<([a-z][\w:-]*)(\s[^>]*)?>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const [, tagName, attributes = ''] = match;
    const keyMatch = attributes.match(/\bdata-site-content-key="([^"]+)"/);
    if (!keyMatch) continue;
    const key = keyMatch[1];
    let value;
    if (tagName.toLowerCase() === 'input' || tagName.toLowerCase() === 'textarea') {
      const attribute = tagName.toLowerCase() === 'input' && /\btype="submit"/.test(attributes) ? 'value' : 'placeholder';
      const valueMatch = attributes.match(new RegExp(`\\b${attribute}="([^"]*)"`));
      assert.ok(valueMatch, `${file}: ${key} needs a ${attribute} fallback`);
      value = decodeHtml(valueMatch[1]);
    } else {
      const close = new RegExp(`</${tagName}\\s*>`, 'ig');
      close.lastIndex = tagPattern.lastIndex;
      const closeMatch = close.exec(html);
      assert.ok(closeMatch, `${file}: ${key} is missing </${tagName}>`);
      value = normalizeFallback(html.slice(tagPattern.lastIndex, closeMatch.index));
    }
    const values = found.get(key) || [];
    values.push(value);
    found.set(key, values);
  }
  return found;
}

function expectedBodies() {
  const byKey = new Map();
  for (const [file, values] of [['index.html', fallbacksFrom('index.html')], ['about-us.html', fallbacksFrom('about-us.html')]]) {
    for (const [key, bodies] of values) {
      assert.ok(bodies.every((body) => body === bodies[0]), `${file}: duplicate ${key} fallbacks disagree`);
      if (byKey.has(key)) assert.equal(byKey.get(key), bodies[0], `${key}: shared fallbacks disagree`);
      byKey.set(key, bodies[0]);
    }
  }
  assert.equal(registry.length, 66, 'Task 5 has a fixed registry size');
  assert.equal(byKey.size, 66, 'every one of the 66 keys has a public fallback');
  assert.deepEqual([...byKey.keys()].sort(), [...registry].map(({ key }) => key).sort());
  return byKey;
}

function seededBodies(sql) {
  const values = new Map();
  const row = /\('([^']+)',\s*'((?:''|[^'])*)'\)/g;
  const insertStart = sql.indexOf('INSERT INTO public.site_content');
  const seedValues = sql.slice(insertStart, sql.indexOf('ON CONFLICT (key)', insertStart));
  let match;
  while ((match = row.exec(seedValues))) {
    assert.ok(!values.has(match[1]), `duplicate seed row for ${match[1]}`);
    values.set(match[1], match[2].replace(/''/g, "'"));
  }
  return values;
}

test('seed bodies exactly match the normalized public fallbacks for every registry key', () => {
  const sql = readNormalized(sqlFile);
  const seeded = seededBodies(sql);
  assert.equal(seeded.size, 66, 'the seed has one row for each fixed registry key');
  assert.deepEqual(seeded, expectedBodies());
  assert.equal(seeded.get('shared_notice_body'), 'Thaliwala will be Closing on Wed, Feb 22 & Thursday, Feb 23. Thank you for understanding.');
  assert.equal(seeded.get('home_menu_papas_title'), 'Papas con Huevo (Veg)');
  assert.equal(seeded.get('home_menu_vegan_title'), 'Man! I Feel Like a Vegan (V)');
  assert.equal(seeded.get('home_values_heading'), 'our Values');
});

test('seed transaction only fills blank site content and never touches popups', () => {
  const sql = readNormalized(sqlFile);
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /COMMIT;\s*$/);
  assert.match(sql, /INSERT INTO public\.site_content AS site_content \(key, body\)/);
  assert.match(sql, /ON CONFLICT \(key\) DO UPDATE/);
  assert.match(sql, /WHERE btrim\(site_content\.body\) = ''/);
  assert.doesNotMatch(sql, /\b(?:from|into|update|table)\s+(?:public\.)?popups\b/i);
});

test('access preflight is a separate read-only stop gate with no seed transaction', () => {
  const sql = readNormalized(preflightFile);
  assert.match(sql, /pg_constraint/);
  assert.match(sql, /attname\s*=\s*'key'/);
  assert.match(sql, /contype\s+IN\s*\('p',\s*'u'\)/);
  assert.match(sql, /relrowsecurity/);
  assert.match(sql, /information_schema\.role_table_grants/);
  assert.match(sql, /'anon'.*'SELECT'/s);
  assert.match(sql, /'authenticated'.*'SELECT'/s);
  assert.match(sql, /'authenticated'.*'INSERT'/s);
  assert.match(sql, /'authenticated'.*'UPDATE'/s);
  assert.match(sql, /pg_policies/);
  assert.match(sql, /policyname.*permissive.*roles.*cmd.*qual.*with_check/s);
  assert.match(sql, /AS candidate_policy/);
  assert.match(sql, /combined SELECT.*anon.*authenticated/i);
  assert.match(sql, /INSERT WITH CHECK.*authenticated/i);
  assert.match(sql, /UPDATE USING and WITH CHECK.*authenticated/i);
  assert.match(sql, /UPDATE requires SELECT/i);
  assert.match(sql, /restrictive/i);
  assert.match(sql, /STOP.*authorized operator.*confirms.*semantics/is);
  assert.doesNotMatch(sql, /IS NOT NULL AS effective/i);
  assert.doesNotMatch(sql, /\b(?:create|drop|alter)\s+(?:policy|table)\b/i);
  assert.doesNotMatch(sql, /^\s*GRANT\b/im);
  assert.doesNotMatch(sql, /\b(?:insert|update|delete)\s+(?:into\s+|from\s+)?public\.site_content\b/i);
  assert.doesNotMatch(sql, /^\s*(?:BEGIN|COMMIT);/im);
  assert.doesNotMatch(sql, /[ \t]+\n/);
});

test('seed is explicitly second-step only and contains no same-run preflight inspection', () => {
  const sql = readNormalized(sqlFile);
  assert.match(sql, /SECOND STEP/i);
  assert.match(sql, /check-site-content-access\.sql/);
  assert.doesNotMatch(sql, /pg_constraint|pg_policies|information_schema\.role_table_grants|relrowsecurity/);
  assert.doesNotMatch(sql, /inspect.*then|run.*queries.*then.*seed/is);
});
