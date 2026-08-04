(function (global) {
  function sectionIdFor(entry) {
    return `${entry.page}:${entry.section}`;
  }

  function titleCase(value) {
    return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function createContentController({ client, mount, showFlash }) {
    const sections = new Map();
    let loadPromise;

    function addText(element, value) {
      element.textContent = value;
      return element;
    }

    function render() {
      const pageGroups = new Map();
      global.HFT_CONTENT_REGISTRY.forEach((entry) => {
        if (!pageGroups.has(entry.page)) pageGroups.set(entry.page, []);
        pageGroups.get(entry.page).push(entry);
      });

      const cards = [];
      pageGroups.forEach((entries, page) => {
        const pageGroup = document.createElement('section');
        pageGroup.className = 'content-page-group';
        const pageHeading = document.createElement('h3');
        addText(pageHeading, `${page} content`);
        const pageLink = document.createElement('a');
        pageLink.href = entries[0].viewUrl;
        pageLink.target = '_blank';
        pageLink.rel = 'noopener noreferrer';
        addText(pageLink, `View ${page === 'Homepage' ? 'homepage' : page === 'About' ? 'About page' : 'site'}`);
        pageHeading.append(' ', pageLink);
        pageGroup.append(pageHeading);

        const pageSections = new Map();
        entries.forEach((entry) => {
          if (!pageSections.has(entry.section)) pageSections.set(entry.section, []);
          pageSections.get(entry.section).push(entry);
        });
        pageSections.forEach((sectionEntries, sectionName) => {
          const id = sectionIdFor(sectionEntries[0]);
          const card = document.createElement('section');
          card.className = 'card content-section-card';
          card.setAttribute('aria-labelledby', `content-section-${sections.size}`);
          const heading = document.createElement('h4');
          heading.id = `content-section-${sections.size}`;
          heading.setAttribute('id', heading.id);
          addText(heading, `${page} — ${titleCase(sectionName)}`);
          const location = document.createElement('p');
          location.className = 'field-hint content-location';
          addText(location, `These fields appear in the ${sectionName} section of the ${page === 'Shared' ? 'shared site layout' : page}.`);
          const error = document.createElement('div');
          error.className = 'error-message';
          error.setAttribute('role', 'alert');
          error.style.display = 'none';
          card.append(heading, location, error);
          const fields = [];
          sectionEntries.forEach((entry, index) => {
            const field = document.createElement('div');
            field.className = 'content-field';
            const fieldId = `site-content-${id.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${index}`;
            const helpId = `${fieldId}-help`;
            const label = document.createElement('label');
            label.htmlFor = fieldId;
            label.setAttribute('for', fieldId);
            addText(label, entry.label);
            const input = document.createElement(entry.mode === 'paragraphs' ? 'textarea' : 'input');
            input.id = fieldId;
            input.name = entry.key;
            input.setAttribute('data-content-key', entry.key);
            input.setAttribute('aria-describedby', helpId);
            input.maxLength = entry.mode === 'paragraphs' ? 5000 : 160;
            input.setAttribute('maxlength', input.maxLength);
            if (input.tagName === 'INPUT') input.type = 'text';
            else input.rows = 5;
            const help = document.createElement('div');
            help.id = helpId;
            help.className = 'field-hint';
            addText(help, `Appears here: ${entry.help}`);
            field.append(label, input, help);
            card.append(field);
            fields.push({ key: entry.key, input });
          });
          const actions = document.createElement('div');
          actions.className = 'form-actions';
          const saveButton = document.createElement('button');
          saveButton.type = 'button';
          saveButton.className = 'btn btn-primary';
          addText(saveButton, `Save ${titleCase(sectionName)}`);
          saveButton.addEventListener('click', () => saveSection(id));
          actions.append(saveButton);
          card.append(actions);
          pageGroup.append(card);
          sections.set(id, { fields, error });
        });
        cards.push(pageGroup);
      });
      mount.replaceChildren(...cards);
    }

    function showSectionError(sectionId, message) {
      const section = sections.get(sectionId);
      if (!section) return;
      section.error.textContent = message;
      section.error.style.display = 'block';
    }

    async function load() {
      if (loadPromise) return loadPromise;
      loadPromise = (async () => {
        const keys = global.HFT_CONTENT_REGISTRY.map(({ key }) => key);
        const { data, error } = await client.from('site_content').select('key, body').in('key', keys);
        if (error) return showFlash('Failed to load site content: ' + error.message, true);
        const values = new Map((data || []).map(({ key, body }) => [key, body]));
        sections.forEach(({ fields }) => fields.forEach(({ key, input }) => { input.value = values.get(key) || ''; }));
      })();
      return loadPromise;
    }

    async function saveSection(sectionId) {
      const section = sections.get(sectionId);
      if (!section) return;
      const rows = section.fields.map(({ key, input }) => ({ key, body: input.value.trim() }));
      if (rows.some(({ body }) => !body)) {
        showSectionError(sectionId, 'All fields need text before saving.');
        return;
      }
      section.error.style.display = 'none';
      const { error } = await client.from('site_content').upsert(rows, { onConflict: 'key' });
      if (error) return showFlash('Save failed: ' + error.message, true);
      showFlash('Content saved.');
    }

    render();
    return { load, saveSection };
  }

  global.HFT_ADMIN_CONTENT = { createContentController };
})(window);
