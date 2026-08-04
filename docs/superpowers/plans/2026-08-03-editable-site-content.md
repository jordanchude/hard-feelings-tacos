# Editable Site Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every human-authored visitor-visible string on the homepage, About page, and shared areas editable from the authenticated admin dashboard while retaining static public fallbacks.

**Architecture:** Introduce one browser-global content registry that defines all editable content keys, their safe rendering mode, their public target metadata, and their admin grouping. Public HTML binds static-fallback elements to that registry; the public loader safely applies successful database values and derives metadata. The admin builds grouped section forms from the same registry and saves each section with conflict-safe upserts; pop-up CRUD remains untouched.

**Tech Stack:** Static HTML, browser JavaScript, Supabase JS v2, Supabase PostgreSQL SQL editor, Node.js built-in `node:test` and `node:assert/strict`.

## Global Constraints

- Use the existing Supabase `site_content(key, body)` model; each registry key is one plain-text value.
- Keep every current public string in its HTML element as the immediate fallback; replace only successful, nonempty database values.
- The shared registry lives only in `js/content-registry.js`; do not duplicate key definitions.
- Render authored text as text, never as executable or author-supplied HTML; only controlled paragraph breaks may create `<br>` elements.
- Permit only the rendering modes `text`, `paragraphs`, `placeholder`, and `value`.
- Preserve link destinations, layout, event CRUD/schema, authentication flows, system messages, banner timing/countdown, generated event values, and public form result states.
- Metadata has no editor fields: title fields derive from the designated visible heading and description fields derive from the designated visible introduction, mirroring browser/OG/Twitter values.
- Admin content forms are grouped by recognizable page section, include labels, help, and page links, and save a section independently with `upsert(..., { onConflict: 'key' })`.
- The repo has no package/test tooling; add only a focused Node built-in test command and no third-party test dependency.
- Do not commit database credentials, service-role keys, or production content values beyond the existing static fallbacks.

---

## Planned file structure

| File | Action | Responsibility |
| --- | --- | --- |
| `package.json` | Create | Expose one `test` script using Node's built-in runner. |
| `js/content-registry.js` | Create | Define and validate the complete `window.HFT_CONTENT_REGISTRY` and safe rendering metadata. |
| `js/site-content.js` | Modify | Export/test-load pure rendering/metadata helpers and load registered keys into public bindings without removing fallback content on failure. |
| `js/admin-content.js` | Create | Build grouped admin content forms, fetch registry values, validate sections, and perform per-section upserts. |
| `js/admin.js` | Modify | Preserve existing authentication/pop-up code and initialize the new content controller only in the authenticated view. |
| `index.html` | Modify | Add registry keys to every editable homepage/shared target while retaining the exact text fallback; load registry and public scripts. |
| `about-us.html` | Modify | Add registry keys to every editable About/shared target while retaining the exact text fallback; load registry and public scripts. |
| `admin/index.html` | Modify | Add accessible Site content mount point, grouped-card styles, and the registry/content scripts without changing Pop-ups UI. |
| `scripts/verify-content-bindings.js` | Create | Parse the two public HTML files and fail on registry/binding/allowlist coverage drift. |
| `supabase/check-site-content-access.sql` | Create | Run read-only prerequisite checks with explicit operator stop criteria before any seed execution. |
| `supabase/seed-site-content.sql` | Create | Idempotently seed missing or blank rows from static fallback values without overwriting nonempty production content. |
| `test/content-registry.test.js` | Create | Assert registry completeness, valid modes, grouping, and source-target metadata. |
| `test/site-content.test.js` | Create | Assert safe rendering, fallback preservation, metadata derivation, and public loader behavior with fake DOM/Supabase objects. |
| `test/admin-content.test.js` | Create | Assert grouped field construction, validation, scoped upserts, and no pop-up calls. |
| `test/content-bindings.test.js` | Create | Invoke the static binding verifier as a Node test. |

The registry must include every key in the approved design's **Content registry** table exactly, including shared modal/notice/navigation/banner/footer keys, all homepage hero/marquee/menu/values/pop-up/host keys, and all About story/follow keys. The implementation copies that table's key, page, section, label, help, view URL, and mode values into the registry; no HTML binding may name an unregistered key.

### Task 1: Establish the dependency-free test harness and registry contract

**Files:**
- Create: `package.json`
- Create: `js/content-registry.js`
- Create: `test/helpers/load-browser-script.js`
- Create: `test/content-registry.test.js`

**Interfaces:**
- Produces: `window.HFT_CONTENT_REGISTRY`, an immutable array of `{ key, page, section, label, help, viewUrl, mode, selector, metadataRole? }`.
- Produces: `window.HFT_CONTENT_BY_KEY`, a frozen `Record<string, ContentDefinition>`.
- Produces: `window.HFT_CONTENT_REGISTRY_TEST_API.validateRegistry(registry)`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing registry contract test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/content-registry.test.js`
Expected: FAIL because the registry and browser-script test helper do not exist.

- [ ] **Step 3: Add the minimal Node test setup and helper**

```json
{ "private": true, "type": "module", "scripts": { "test": "node --test" } }
```

```js
import vm from 'node:vm';
import fs from 'node:fs';
export function loadBrowserScript(file) {
  const window = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window, Object, Set, Error });
  return { window };
}
```

- [ ] **Step 4: Implement the complete registry and validator**

Treat the approved design's **Content registry** table as the normative input: transcribe each table row into one literal object, without wildcard-generated keys. Set `page` to `Homepage`, `About`, or `Shared`; copy the section, label, mode, and help verbatim; set `viewUrl` to `/index.html` for Homepage/Shared and `/about-us.html` for About; and set `selector` to `[data-site-content-key="<key>"]`. For example, the first and last records are:

```js
(function (global) {
  const allowedModes = new Set(['text', 'paragraphs', 'placeholder', 'value']);
  const registry = [
    {
      key: 'shared_promo_cta', page: 'Shared', section: 'Promo modal',
      label: 'Promo button label', mode: 'text',
      help: 'Button in the promotional image modal on both pages; destination stays fixed.',
      viewUrl: '/index.html', selector: '[data-site-content-key="shared_promo_cta"]'
    },
    {
      key: 'shared_footer_tagline', page: 'Shared', section: 'Footer',
      label: 'Footer tagline', mode: 'text',
      help: '"Made with love" line in the shared footer.',
      viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_tagline"]'
    }
  ];
  function validateRegistry(entries) {
    const seen = new Set();
    for (const entry of entries) {
      if (!entry.key || seen.has(entry.key) || !allowedModes.has(entry.mode)) throw new Error('Invalid content registry');
      if (!entry.page || !entry.section || !entry.label || !entry.help || !entry.viewUrl || !entry.selector) throw new Error('Incomplete content registry entry');
      seen.add(entry.key);
    }
  }
  validateRegistry(registry);
  global.HFT_CONTENT_REGISTRY = Object.freeze(registry.map(Object.freeze));
  global.HFT_CONTENT_BY_KEY = Object.freeze(Object.fromEntries(registry.map((entry) => [entry.key, entry])));
  global.HFT_CONTENT_REGISTRY_TEST_API = { validateRegistry };
})(window);
```

Use one key with a comma-separated selector for duplicated banner/navigation/footer targets. Assign `metadataRole` only to `home_hero_heading`, `home_hero_intro`, `about_heading`, and `about_intro`.

- [ ] **Step 5: Run the focused test**

Run: `npm test -- --test-name-pattern="registry defines"`
Expected: PASS; registry has unique keys, valid modes, and complete admin metadata.

- [ ] **Step 6: Commit**

```bash
git add package.json js/content-registry.js test/helpers/load-browser-script.js test/content-registry.test.js
git commit -m "feat: add editable content registry"
```

### Task 2: Build safe public rendering and derived metadata

**Files:**
- Modify: `js/site-content.js`
- Create: `test/site-content.test.js`

**Interfaces:**
- Consumes: `window.HFT_CONTENT_BY_KEY` and Supabase `from('site_content').select('key, body').in('key', keys)`.
- Produces: `window.HFT_SITE_CONTENT_TEST_API.renderValue(element, body, mode)`.
- Produces: `applyContent(document, rows): Map<string, string>` and `applyMetadata(document, resolved): void`.
- Must not call `innerHTML` with authored values.

- [ ] **Step 1: Write failing renderer and fallback tests**

```js
test('paragraph rendering treats markup as text and creates only controlled breaks', () => {
  const el = fakeElement('fallback');
  api.renderValue(el, '<img src=x onerror=1>\n\nsecond', 'paragraphs');
  assert.equal(el.textContent, '<img src=x onerror=1>second');
  assert.equal(el.children.filter((node) => node.tagName === 'BR').length, 2);
});

test('blank values preserve fallback content', () => {
  const doc = fakeDocument({ home_hero_heading: fakeElement('fallback heading') });
  assert.deepEqual(api.applyContent(doc, [{ key: 'home_hero_heading', body: '   ' }]), new Map());
  assert.equal(doc.target.textContent, 'fallback heading');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/site-content.test.js`
Expected: FAIL because the renderer test API is absent.

- [ ] **Step 3: Implement safe text/attribute rendering**

```js
function renderValue(element, body, mode) {
  const value = body.trim();
  if (!value) return false;
  if (mode === 'placeholder') { element.setAttribute('placeholder', value); return true; }
  if (mode === 'value') { element.value = value; return true; }
  element.replaceChildren();
  if (mode === 'paragraphs') {
    value.split(/\n{2,}/).forEach((paragraph, index) => {
      if (index) element.append(document.createElement('br'), document.createElement('br'));
      element.append(document.createTextNode(paragraph));
    });
  } else element.textContent = value;
  return true;
}
```

Implement `applyContent` so it uses only registered `[data-site-content-key]` bindings, applies the declared mode, and changes nothing when Supabase returns an error.

- [ ] **Step 4: Add metadata test and minimal implementation**

```js
test('metadata mirrors the designated resolved heading and intro', () => {
  const resolved = new Map([['home_hero_heading', 'Breakfast tacos'], ['home_hero_intro', 'Made fresh\n\nEvery Sunday']]);
  api.applyMetadata(homeDocument, resolved);
  assert.equal(homeDocument.title, 'Breakfast tacos | Hard Feelings Tacos');
  assert.equal(meta('og:title').content, homeDocument.title);
  assert.equal(meta('twitter:title').content, homeDocument.title);
  assert.equal(meta('description').content, 'Made fresh Every Sunday');
});
```

Normalize description whitespace. Update `<title>`, `meta[name="description"]`, `meta[property="og:title"]`, `meta[property="og:description"]`, `meta[name="twitter:title"]`, and `meta[name="twitter:description"]` only when their designated resolved key exists.

- [ ] **Step 5: Run tests**

Run: `npm test -- --test-name-pattern="rendering|fallback|metadata"`
Expected: PASS; markup is literal text, error/blank paths keep fallback, and metadata mirrors agree.

- [ ] **Step 6: Commit**

```bash
git add js/site-content.js test/site-content.test.js
git commit -m "feat: safely render editable public content"
```

### Task 3: Bind all public content and prove exhaustive coverage

**Files:**
- Modify: `index.html`
- Modify: `about-us.html`
- Create: `scripts/verify-content-bindings.js`
- Create: `test/content-bindings.test.js`

**Interfaces:**
- Consumes: registry and renderer from Tasks 1–2.
- Produces: public `data-site-content-key` bindings and `node scripts/verify-content-bindings.js`.

- [ ] **Step 1: Write the failing binding-verifier test**

```js
test('public bindings cover registered content and only allowlisted runtime strings are unbound', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-content-bindings.js'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
```

- [ ] **Step 2: Run it before markup changes**

Run: `node --test test/content-bindings.test.js`
Expected: FAIL with unbound registry keys.

- [ ] **Step 3: Add complete fallback-preserving bindings**

Add `data-site-content-key` to every registry-table row in `index.html` and `about-us.html`. Keep literal current strings inside the elements. Bind host field prompts to their existing input/textarea and the submit caption to its existing submit input. Give duplicated shared elements the same key in each page. Add scripts after Supabase config:

```html
<script src="js/content-registry.js"></script>
<script src="js/site-content.js"></script>
```

Do not alter Webflow, event-toggle, contact-mailto, pop-up, or anniversary scripts.

- [ ] **Step 4: Implement the verifier**

```js
const systemAllowlist = new Set([
  'HAPPENING TODAY', 'soon',
  'No upcoming pop-ups right now — check back soon!',
  'No past pop-ups to show yet.',
  "Thank you! Your pop-up request has been received! We'll get back to you soon.",
  'Oops! Something went wrong while submitting the form.'
]);
```

Load the registry in a VM and scan the two HTML files. Exit 1, naming file/key/value, for unregistered bindings, unbound registry keys, incompatible tag/mode pairs, or visitor-visible text/`placeholder`/`value` not bound and not allowlisted. Exclude SVG paths and empty event containers as structural content.

- [ ] **Step 5: Run coverage and unit checks**

Run: `node scripts/verify-content-bindings.js && npm test`
Expected: PASS; all public authored copy is bound once or explicitly classified as runtime/system text.

- [ ] **Step 6: Commit**

```bash
git add index.html about-us.html scripts/verify-content-bindings.js test/content-bindings.test.js
git commit -m "feat: bind public copy to content registry"
```

### Task 4: Add grouped accessible admin editing with section-scoped upserts

**Files:**
- Modify: `admin/index.html`
- Create: `js/admin-content.js`
- Modify: `js/admin.js`
- Create: `test/admin-content.test.js`

**Interfaces:**
- Consumes: `window.HFT_CONTENT_REGISTRY`, authenticated Supabase client, and `showFlash(message, isError)`.
- Produces: `window.HFT_ADMIN_CONTENT.createContentController({ client, mount, showFlash })`.
- Produces: controller `load(): Promise<void>` and `saveSection(sectionId): Promise<void>`.
- Never calls the `popups` table.

- [ ] **Step 1: Write the failing controller test**

```js
test('saveSection rejects blanks and upserts only its section keys', async () => {
  const { controller, client, section } = setupController();
  section.fields[0].value = '  ';
  await controller.saveSection(section.id);
  assert.equal(client.calls.length, 0);
  section.fields[0].value = 'Fresh copy';
  await controller.saveSection(section.id);
  assert.deepEqual(client.calls, [{
    table: 'site_content', method: 'upsert',
    rows: [{ key: section.fields[0].key, body: 'Fresh copy' }],
    options: { onConflict: 'key' }
  }]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/admin-content.test.js`
Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Add mount point and accessible markup/styles**

Add `<section id="site-content-manager" aria-labelledby="site-content-heading"></section>` after Past pop-ups and before Change password. Add responsive grouped-card styles. Render page groups with their fixed view URL using `target="_blank" rel="noopener noreferrer"`. Inputs receive a unique `id`, matched `label[for]`, help text referenced by `aria-describedby`, `maxlength="160"` for text/attributes, and `maxlength="5000"` for paragraphs.

Load `../js/content-registry.js` then `../js/admin-content.js` before `../js/admin.js`.

- [ ] **Step 4: Implement the controller and integrate auth**

```js
function createContentController({ client, mount, showFlash }) {
  async function load() {
    const keys = window.HFT_CONTENT_REGISTRY.map(({ key }) => key);
    const { data, error } = await client.from('site_content').select('key, body').in('key', keys);
    if (error) return showFlash('Failed to load site content: ' + error.message, true);
    hydrateFields(new Map((data || []).map(({ key, body }) => [key, body])));
  }
  async function saveSection(sectionId) {
    const rows = sectionFields(sectionId).map(({ key, input }) => ({ key, body: input.value.trim() }));
    if (rows.some(({ body }) => !body)) return showSectionError(sectionId, 'All fields need text before saving.');
    const { error } = await client.from('site_content').upsert(rows, { onConflict: 'key' });
    if (error) return showFlash('Save failed: ' + error.message, true);
    showFlash('Content saved.');
  }
  return { load, saveSection };
}
```

In `admin.js`, initialize one controller and call `contentController.load()` inside `showAuthedView()`. Preserve `loadAdminPopups()`, auth/recovery, and password code. Remove the standalone bio form only after registry-generated About story includes `about_bio`.

- [ ] **Step 5: Run targeted tests**

Run: `npm test -- --test-name-pattern="saveSection|grouped|popups"`
Expected: PASS; blank values write nothing, each section writes only its own rows, and no call targets `popups`.

- [ ] **Step 6: Commit**

```bash
git add admin/index.html js/admin.js js/admin-content.js test/admin-content.test.js
git commit -m "feat: add grouped site content admin"
```

### Task 5: Add safe Supabase seed and operator preflight

**Files:**
- Create: `supabase/check-site-content-access.sql`
- Create: `supabase/seed-site-content.sql`
- Create: `test/seed-site-content.test.js`

**Interfaces:**
- Consumes: exact static fallback values for every Task 1 registry key.
- Produces: a standalone read-only operator gate followed, only after review, by a separately run transaction that inserts missing/blank rows without overwriting nonempty content.
- Does not reference `popups`.

- [ ] **Step 1: Write the failing SQL contract test**

```js
test('seed protects nonempty content and declares every registry key', () => {
  const sql = readFileSync('supabase/seed-site-content.sql', 'utf8');
  assert.match(sql, /ON CONFLICT \(key\) DO UPDATE/);
  assert.match(sql, /WHERE btrim\(site_content\.body\) = ''/);
  for (const { key } of registry) assert.match(sql, new RegExp("'" + key + "'", 'g'));
  assert.doesNotMatch(sql, /popups/i);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/seed-site-content.test.js`
Expected: FAIL because the seed file is absent.

- [ ] **Step 3: Implement the separate preflight and full idempotent seed**

```sql
-- supabase/check-site-content-access.sql (run and inspect by itself)
SELECT c.conname
FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'site_content' AND c.contype IN ('p', 'u');

SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'site_content';
```

Stop after the read-only file. An authorized operator must confirm the unique-key, grant, RLS, and policy semantics stated in that artifact before opening the seed as a separate second step. The preflight must contain no DML or seed transaction and must not create or loosen grants or policies.

```sql
-- supabase/seed-site-content.sql (second step only)
BEGIN;
INSERT INTO public.site_content AS site_content (key, body)
VALUES ('home_hero_heading', 'b''fast tacos by texans, for texans')
ON CONFLICT (key) DO UPDATE
SET body = EXCLUDED.body
WHERE btrim(site_content.body) = '';
COMMIT;
```

Use the actual homepage fallback in that example—`b''fast tacos by texans, for texans` with SQL apostrophe escaping—and add one literal row for every registry entry by reading its bound fallback from `index.html` or `about-us.html`. When a shared key occurs on both pages, first assert the normalized fallback strings match and then use that shared value. The seed contract test must compare the SQL keys and bodies to the bound HTML fallbacks, so a missing or invented value fails deterministically.

Put a literal `VALUES` row for every registry key, including `about_bio`. Put an operator instruction before `BEGIN` that identifies this as the second step and points to the separate preflight artifact. Do not repeat the inspection queries in the seed file.

- [ ] **Step 4: Run seed contract and full suite**

Run: `npm test`
Expected: PASS; the seed covers all keys, preserves nonempty rows, and does not touch events.

- [ ] **Step 5: Commit**

```bash
git add supabase/check-site-content-access.sql supabase/seed-site-content.sql test/seed-site-content.test.js
git commit -m "chore: add safe site content seed"
```

### Task 6: Verify protected behavior and perform operator handoff

**Files:**
- Modify: `test/content-bindings.test.js`
- Modify: `test/site-content.test.js`
- Modify: `test/admin-content.test.js`

**Interfaces:**
- Consumes: all prior interfaces.
- Produces: a complete deterministic suite; no new production interfaces.

- [ ] **Step 1: Add failing regression assertions**

```js
test('public loader requests only keys bound on its page', async () => {
  const client = fakeClientReturning([]);
  await api.loadSiteContent({ document: homeDocument, client });
  assert.deepEqual(client.requestedKeys.sort(), homeDocument.boundKeys.sort());
});

test('content controller is isolated from events', () => {
  assert.equal(readFileSync('js/admin-content.js', 'utf8').includes("from('popups')"), false);
  assert.equal(readFileSync('js/admin.js', 'utf8').includes('loadAdminPopups()'), true);
});
```

- [ ] **Step 2: Run suite before corrections**

Run: `npm test`
Expected: FAIL only for omitted page-key filtering or event-isolation behavior.

- [ ] **Step 3: Make the smallest corrections and run deterministic checks**

Run: `npm test && node scripts/verify-content-bindings.js && git diff --check`
Expected: all commands exit 0.

- [ ] **Step 4: Perform manual browser and Supabase checks**

1. Open homepage/About with network disabled; verify static fallback copy remains visible.
2. As an authorized editor, save Hero, About story, Shared navigation, Footer, and Host prompt sections; reload both pages and verify each registered target.
3. Save `<script>alert(1)</script>` plus a blank line in a paragraph; verify literal display and no execution.
4. Verify browser title, description, OG, and Twitter tags track resolved Hero/About source values and preserve static values after a fetch failure.
5. At narrow mobile width, navigate every content field, help string, section save button, and view-page link by keyboard.
6. Add, edit, and delete a pop-up; verify its current Upcoming/Past behavior and formatted status remain unchanged.
7. Run `supabase/check-site-content-access.sql` by itself in the Supabase SQL editor, stop and inspect every result, then run `supabase/seed-site-content.sql` separately only if every uniqueness/grant/RLS/policy prerequisite passes.

- [ ] **Step 5: Commit**

```bash
git add test/content-bindings.test.js test/site-content.test.js test/admin-content.test.js
git commit -m "test: verify editable content regressions"
```

## Final acceptance checklist

- [ ] Every approved registry row has one definition, static fallback, public binding, seed value, and admin field.
- [ ] Authored values are rendered only as text or controlled line breaks; no authored markup is parsed.
- [ ] Empty, missing, and fetch-error values preserve public fallbacks and static metadata.
- [ ] Homepage/About browser, Open Graph, and Twitter metadata derive only from their four designated resolved keys.
- [ ] Admin content is grouped by page/section with labels, help, fixed page links, independent validation, and scoped upserts.
- [ ] Pop-up CRUD interface/data path is unchanged.
- [ ] SQL is idempotent, non-overwriting for nonempty content, and gated by uniqueness/RLS queries.
- [ ] `npm test`, `node scripts/verify-content-bindings.js`, and `git diff --check` pass before merge.
