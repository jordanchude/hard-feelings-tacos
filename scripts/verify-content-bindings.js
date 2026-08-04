import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const systemAllowlist = new Set([
  'HAPPENING TODAY', 'soon',
  'No upcoming pop-ups right now — check back soon!',
  'No past pop-ups to show yet.',
  "Thank you! Your pop-up request has been received! We'll get back to you soon.",
  'Oops! Something went wrong while submitting the form.'
]);
const pages = [
  { file: 'index.html', page: 'Homepage' },
  { file: 'about-us.html', page: 'About' }
];
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'path', 'source', 'track', 'wbr']);
const ignoredTags = new Set(['script', 'style', 'svg', 'title']);
const requiredBindingCounts = {
  'index.html': { home_values_body: 2, home_values_cta: 2 }
};

function loadRegistry(root) {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/content-registry.js'), 'utf8'), { window, Object, Set });
  return window.HFT_CONTENT_REGISTRY;
}

function decode(value) {
  return value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&rsquo;|&#8217;/gi, '’').replace(/&lsquo;|&#8216;/gi, '‘').replace(/&middot;/gi, '·').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function attributes(source) {
  const attrs = new Map();
  source.replace(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g, (_, name, double, single, bare) => {
    attrs.set(name.toLowerCase(), double ?? single ?? bare ?? '');
    return '';
  });
  return attrs;
}

function fallbackValues(html, registry) {
  const fallbacks = new Map();
  const openingTag = /<([a-z][\w:-]*)([^>]*)>/gi;
  for (const match of html.matchAll(openingTag)) {
    const tag = match[1].toLowerCase();
    const attrs = attributes(match[2]);
    const key = attrs.get('data-site-content-key');
    const entry = registry.get(key);
    if (!entry) continue;
    let value;
    if (entry.mode === 'placeholder' || entry.mode === 'value') {
      value = attrs.get(entry.mode);
    } else {
      const close = new RegExp(`</${tag}\\s*>`, 'i');
      const content = html.slice(match.index + match[0].length);
      value = content.slice(0, content.search(close));
    }
    const normalized = decode(value || '');
    const values = fallbacks.get(key) || [];
    values.push(normalized);
    fallbacks.set(key, values);
  }
  return fallbacks;
}

function scan(file, html, registry) {
  const errors = [];
  const found = new Map();
  const stack = [];
  const token = /<!--[\s\S]*?-->|<[^>]*>|[^<]+/g;
  for (const match of html.matchAll(token)) {
    const value = match[0];
    if (value.startsWith('<!--')) continue;
    if (!value.startsWith('<')) {
      const text = decode(value);
      const context = stack.at(-1);
      const exactDecorativeDivider = context?.decorativeDivider && text === '·';
      if (text && !context?.bound && !context?.ignored && !exactDecorativeDivider && !systemAllowlist.has(text)) errors.push(`${file}: unbound visible copy ${JSON.stringify(text)}`);
      continue;
    }
    if (/^<\//.test(value)) {
      stack.pop();
      continue;
    }
    if (/^<!|^<\?/.test(value)) continue;
    const name = /^<\s*([^\s/>]+)/.exec(value)?.[1]?.toLowerCase();
    if (!name) continue;
    const attrs = attributes(value.slice(name.length + 1, value.endsWith('>') ? -1 : undefined));
    const key = attrs.get('data-site-content-key');
    const entry = key && registry.get(key);
    const parent = stack.at(-1);
    const ignored = Boolean(parent?.ignored || ignoredTags.has(name));
    const decorativeDivider = (attrs.get('class') || '').split(/\s+/).includes('ab-divider');
    const bound = Boolean(parent?.bound || key);
    if (key) {
      if (!entry) errors.push(`${file}: unregistered binding ${key}`);
      else {
        found.set(key, (found.get(key) || 0) + 1);
        const isAttributeBinding = attrs.has('placeholder') || attrs.has('value');
        const valid = (entry.mode === 'placeholder' && (name === 'input' || name === 'textarea') && attrs.has('placeholder'))
          || (entry.mode === 'value' && name === 'input' && attrs.get('type') === 'submit' && attrs.has('value'))
          || ((entry.mode === 'text' || entry.mode === 'paragraphs') && !isAttributeBinding && !['input', 'textarea'].includes(name));
        if (!valid) errors.push(`${file}: incompatible ${name}/${entry.mode} binding for ${key}`);
      }
    }
    for (const field of ['placeholder', 'value']) {
      const fieldValue = decode(attrs.get(field) || '');
      if (fieldValue && !key && !ignored && !systemAllowlist.has(fieldValue)) errors.push(`${file}: unbound ${field} ${JSON.stringify(fieldValue)}`);
    }
    if (!voidTags.has(name) && !value.endsWith('/>')) stack.push({ bound, ignored, decorativeDivider });
  }
  return { errors, found, fallbacks: fallbackValues(html, registry) };
}

function main(root = process.cwd()) {
  const registry = loadRegistry(root);
  const byKey = new Map(registry.map((entry) => [entry.key, entry]));
  const foundByPage = new Map();
  const fallbacksByPage = new Map();
  const errors = [];
  for (const page of pages) {
    const result = scan(page.file, fs.readFileSync(path.join(root, page.file), 'utf8'), byKey);
    errors.push(...result.errors);
    foundByPage.set(page.file, result.found);
    fallbacksByPage.set(page.file, result.fallbacks);
  }
  registry.forEach((entry) => {
    const requiredFiles = entry.page === 'Shared' ? ['index.html', 'about-us.html'] : [entry.page === 'About' ? 'about-us.html' : 'index.html'];
    requiredFiles.forEach((file) => {
      if (!foundByPage.get(file).has(entry.key)) errors.push(`${file}: unbound registry key ${entry.key}`);
    });
  });
  Object.entries(requiredBindingCounts).forEach(([file, counts]) => {
    Object.entries(counts).forEach(([key, count]) => {
      if ((foundByPage.get(file).get(key) || 0) !== count) errors.push(`${file}: expected ${count} bindings for ${key}`);
    });
  });
  registry.filter((entry) => entry.page === 'Shared').forEach((entry) => {
    const values = pages.flatMap((page) => fallbacksByPage.get(page.file).get(entry.key) || []);
    if (new Set(values).size !== 1) errors.push(`shared fallback mismatch for ${entry.key}: ${values.map(JSON.stringify).join(', ')}`);
  });
  if (errors.length) process.stderr.write(`${errors.join('\n')}\n`);
  return errors.length ? 1 : 0;
}

process.exitCode = main();
