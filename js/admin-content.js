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
    let loaded = false;
    let loadStatus;
    let generation = 0;

    function addText(element, value) {
      element.textContent = value;
      return element;
    }

    function errorMessage(error) {
      return error && error.message ? error.message : 'Please try again.';
    }

    function setControlsDisabled(disabled) {
      sections.forEach((section) => {
        section.fields.forEach(({ input }) => { input.disabled = disabled; });
        section.button.disabled = disabled || section.saving;
      });
    }

    function setLoadState(message, isBusy) {
      mount.setAttribute('aria-busy', String(isBusy));
      loadStatus.textContent = message;
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
        addText(pageLink, page === 'About' ? 'View About page' : 'View homepage');
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
            input.disabled = true;
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
          saveButton.setAttribute('data-section-id', id);
          saveButton.disabled = true;
          addText(saveButton, `Save ${titleCase(sectionName)}`);
          saveButton.addEventListener('click', () => { void saveSection(id); });
          actions.append(saveButton);
          card.append(actions);
          pageGroup.append(card);
          sections.set(id, { fields, error, button: saveButton, saving: false });
        });
        cards.push(pageGroup);
      });
      loadStatus = document.createElement('p');
      loadStatus.className = 'field-hint';
      loadStatus.setAttribute('role', 'status');
      setLoadState('Content will load after you sign in.', false);
      mount.replaceChildren(loadStatus, ...cards);
    }

    function showSectionError(sectionId, message) {
      const section = sections.get(sectionId);
      if (!section) return;
      section.error.textContent = message;
      section.error.style.display = 'block';
    }

    async function load() {
      if (loaded) return;
      if (loadPromise) return loadPromise;
      const loadGeneration = generation;
      setControlsDisabled(true);
      setLoadState('Loading site content…', true);
      const currentLoad = (async () => {
        try {
          const keys = global.HFT_CONTENT_REGISTRY.map(({ key }) => key);
          const { data, error } = await client.from('site_content').select('key, body').in('key', keys);
          if (loadGeneration !== generation) return;
          if (error) {
            showFlash('Failed to load site content: ' + errorMessage(error), true);
            setLoadState('Site content could not be loaded. Try signing in again.', false);
            return;
          }
          const values = new Map((data || []).map(({ key, body }) => [key, body]));
          sections.forEach(({ fields }) => fields.forEach(({ key, input }) => { input.value = values.get(key) || ''; }));
          loaded = true;
          setControlsDisabled(false);
          setLoadState('Site content ready to edit.', false);
        } catch (error) {
          if (loadGeneration !== generation) return;
          showFlash('Failed to load site content: ' + errorMessage(error), true);
          setLoadState('Site content could not be loaded. Try signing in again.', false);
        } finally {
          if (loadGeneration === generation && !loaded) loadPromise = undefined;
        }
      })();
      loadPromise = currentLoad;
      return loadPromise;
    }

    function reset() {
      generation += 1;
      loaded = false;
      loadPromise = undefined;
      sections.forEach((section) => {
        section.saving = false;
        section.error.textContent = '';
        section.error.style.display = 'none';
        section.fields.forEach(({ input }) => { input.value = ''; });
      });
      setControlsDisabled(true);
      setLoadState('Content will load after you sign in.', false);
    }

    async function saveSection(sectionId) {
      const section = sections.get(sectionId);
      if (!section || !loaded || section.saving) return;
      const saveGeneration = generation;
      const rows = section.fields.map(({ key, input }) => ({ key, body: input.value.trim() }));
      if (rows.some(({ body }) => !body)) {
        showSectionError(sectionId, 'All fields need text before saving.');
        return;
      }
      section.error.style.display = 'none';
      section.saving = true;
      section.button.disabled = true;
      try {
        const { error } = await client.from('site_content').upsert(rows, { onConflict: 'key' });
        if (saveGeneration !== generation) return;
        if (error) {
          showFlash('Save failed: ' + errorMessage(error), true);
          return;
        }
        showFlash('Content saved.');
      } catch (error) {
        if (saveGeneration !== generation) return;
        showFlash('Save failed: ' + errorMessage(error), true);
      } finally {
        if (saveGeneration === generation) {
          section.saving = false;
          section.button.disabled = false;
        }
      }
    }

    render();
    return { load, reset, saveSection };
  }

  global.HFT_ADMIN_CONTENT = { createContentController };
})(window);
