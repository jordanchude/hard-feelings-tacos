(function (global) {
  function renderValue(element, body, mode) {
    if (typeof body !== 'string') return false;
    const value = body.trim();
    if (!value) return false;
    if (mode === 'placeholder') {
      element.setAttribute('placeholder', value);
      return true;
    }
    if (mode === 'value') {
      element.value = value;
      return true;
    }
    element.replaceChildren();
    if (mode === 'paragraphs') {
      value.split(/\n{2,}/).forEach((paragraph, index) => {
        if (index) element.append(document.createElement('br'), document.createElement('br'));
        element.append(document.createTextNode(paragraph));
      });
    } else {
      element.textContent = value;
    }
    return true;
  }

  function applyContent(doc, rows) {
    const registry = global.HFT_CONTENT_BY_KEY || {};
    const resolved = new Map();
    const targets = Array.from(doc.querySelectorAll('[data-site-content-key]'));
    const targetsByKey = new Map();
    targets.forEach((element) => {
      const key = element.dataset.siteContentKey;
      if (!registry[key]) return;
      const matching = targetsByKey.get(key) || [];
      matching.push(element);
      targetsByKey.set(key, matching);
    });
    (rows || []).forEach((row) => {
      if (!row || !registry[row.key] || !targetsByKey.has(row.key)) return;
      const body = row.body;
      if (typeof body !== 'string' || !body.trim()) return;
      const didRender = targetsByKey.get(row.key).every((element) => renderValue(element, body, registry[row.key].mode));
      if (didRender) resolved.set(row.key, body.trim());
    });
    return resolved;
  }

  function setMeta(doc, selector, value) {
    Array.from(doc.querySelectorAll(selector)).forEach((element) => element.setAttribute('content', value));
  }

  function applyMetadata(doc, resolved) {
    const registry = global.HFT_CONTENT_BY_KEY || {};
    const titleEntry = Object.values(registry).find((entry) => entry.metadataRole === 'title' && resolved.has(entry.key));
    const descriptionEntry = Object.values(registry).find((entry) => entry.metadataRole === 'description' && resolved.has(entry.key));
    if (titleEntry) {
      const title = `${resolved.get(titleEntry.key)} | Hard Feelings Tacos`;
      doc.title = title;
      setMeta(doc, 'meta[property="og:title"]', title);
      setMeta(doc, 'meta[name="twitter:title"], meta[property="twitter:title"]', title);
    }
    if (descriptionEntry) {
      const description = resolved.get(descriptionEntry.key).replace(/\s+/g, ' ').trim();
      setMeta(doc, 'meta[name="description"]', description);
      setMeta(doc, 'meta[property="og:description"]', description);
      setMeta(doc, 'meta[name="twitter:description"], meta[property="twitter:description"]', description);
    }
  }

  async function loadSiteContent() {
    const registry = global.HFT_CONTENT_BY_KEY || {};
    const targets = Array.from(document.querySelectorAll('[data-site-content-key]'));
    const keys = [...new Set(targets.map((element) => element.dataset.siteContentKey).filter((key) => registry[key]))];
    if (!keys.length || !global.supabase) return;
    try {
      const client = global.supabase.createClient(global.HFT_SUPABASE_URL, global.HFT_SUPABASE_KEY);
      const { data, error } = await client.from('site_content').select('key, body').in('key', keys);
      if (error) {
        console.error('Failed to load site content', error);
        return;
      }
      const resolved = applyContent(document, data);
      applyMetadata(document, resolved);
    } catch (error) {
      console.error('Failed to load site content', error);
    }
  }

  global.HFT_SITE_CONTENT_TEST_API = { renderValue, applyContent, applyMetadata, loadSiteContent };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteContent);
  } else {
    loadSiteContent();
  }
})(window);
