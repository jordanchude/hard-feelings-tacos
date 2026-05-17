(function () {
  const client = window.supabase.createClient(window.HFT_SUPABASE_URL, window.HFT_SUPABASE_KEY);

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderParagraphs(body) {
    return body.split(/\n{2,}/).map(escapeHtml).join('<br><br>');
  }

  async function loadSiteContent() {
    const targets = document.querySelectorAll('[data-site-content-key]');
    if (!targets.length) return;
    const keys = Array.from(new Set(Array.from(targets).map((el) => el.dataset.siteContentKey)));
    const { data, error } = await client.from('site_content').select('key, body').in('key', keys);
    if (error) {
      console.error('Failed to load site content', error);
      return;
    }
    const byKey = Object.fromEntries((data || []).map((row) => [row.key, row.body]));
    targets.forEach((el) => {
      const body = byKey[el.dataset.siteContentKey];
      if (typeof body === 'string') el.innerHTML = renderParagraphs(body);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteContent);
  } else {
    loadSiteContent();
  }
})();
