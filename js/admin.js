(function () {
  const client = window.supabase.createClient(window.HFT_SUPABASE_URL, window.HFT_SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  const tz = window.HFT_SUPABASE_TZ || 'America/New_York';

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const userEmailEl = document.getElementById('user-email');

  const popupForm = document.getElementById('popup-form');
  const formTitle = document.getElementById('form-title');
  const submitBtn = document.getElementById('submit-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const upcomingList = document.getElementById('admin-upcoming-list');
  const pastList = document.getElementById('admin-past-list');
  const flash = document.getElementById('flash');

  const bioForm = document.getElementById('bio-form');
  const bioBody = document.getElementById('bio-body');
  const bioSubmitBtn = document.getElementById('bio-submit-btn');

  let editingId = null;

  function toLocalDatetimeValue(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatDateDisplay(iso, statusNote) {
    const date = new Date(iso);
    const opts = { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz };
    let s = date.toLocaleString('en-US', opts).replace(' AM', 'am').replace(' PM', 'pm');
    if (statusNote && statusNote.trim()) s += ` – ${statusNote.trim()}`;
    return s;
  }

  function showFlash(message, isError) {
    flash.textContent = message;
    flash.className = 'flash ' + (isError ? 'error' : 'success');
    flash.style.display = 'block';
    setTimeout(() => { flash.style.display = 'none'; }, 4000);
  }

  function resetForm() {
    editingId = null;
    popupForm.reset();
    formTitle.textContent = 'Add a new pop-up';
    submitBtn.textContent = 'Add pop-up';
    cancelEditBtn.style.display = 'none';
  }

  function startEdit(popup) {
    editingId = popup.id;
    popupForm.venue.value = popup.venue;
    popupForm.starts_at.value = toLocalDatetimeValue(popup.starts_at);
    popupForm.status_note.value = popup.status_note || '';
    popupForm.address.value = popup.address;
    formTitle.textContent = 'Edit pop-up';
    submitBtn.textContent = 'Save changes';
    cancelEditBtn.style.display = 'inline-block';
    popupForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderAdminList(container, popups) {
    container.innerHTML = '';
    if (!popups.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'None.';
      container.appendChild(empty);
      return;
    }
    popups.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'admin-card';

      const info = document.createElement('div');
      info.className = 'admin-card-info';
      const venue = document.createElement('strong');
      venue.textContent = p.venue;
      const date = document.createElement('div');
      date.textContent = formatDateDisplay(p.starts_at, p.status_note);
      const addr = document.createElement('div');
      addr.className = 'muted';
      addr.textContent = p.address;
      info.append(venue, date, addr);

      const actions = document.createElement('div');
      actions.className = 'admin-card-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => startEdit(p));
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deletePopup(p));
      actions.append(editBtn, deleteBtn);

      card.append(info, actions);
      container.appendChild(card);
    });
  }

  async function loadAdminPopups() {
    const nowIso = new Date().toISOString();
    const { data: upcoming, error: upErr } = await client
      .from('popups').select('*').gte('starts_at', nowIso).order('starts_at', { ascending: true });
    const { data: past, error: pastErr } = await client
      .from('popups').select('*').lt('starts_at', nowIso).order('starts_at', { ascending: false });
    if (upErr || pastErr) {
      showFlash('Failed to load pop-ups: ' + (upErr || pastErr).message, true);
      return;
    }
    renderAdminList(upcomingList, upcoming || []);
    renderAdminList(pastList, past || []);
  }

  async function deletePopup(popup) {
    if (!confirm(`Delete "${popup.venue}" on ${formatDateDisplay(popup.starts_at)}?`)) return;
    const { error } = await client.from('popups').delete().eq('id', popup.id);
    if (error) { showFlash('Delete failed: ' + error.message, true); return; }
    showFlash('Pop-up deleted.');
    if (editingId === popup.id) resetForm();
    loadAdminPopups();
  }

  popupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(popupForm);
    const localDatetime = formData.get('starts_at');
    if (!localDatetime) { showFlash('Date and time are required.', true); return; }
    const payload = {
      venue: String(formData.get('venue') || '').trim(),
      starts_at: new Date(localDatetime).toISOString(),
      status_note: String(formData.get('status_note') || '').trim() || null,
      address: String(formData.get('address') || '').trim(),
    };
    if (!payload.venue || !payload.address) { showFlash('Venue and address are required.', true); return; }

    submitBtn.disabled = true;
    let error;
    if (editingId) {
      ({ error } = await client.from('popups').update(payload).eq('id', editingId));
    } else {
      ({ error } = await client.from('popups').insert(payload));
    }
    submitBtn.disabled = false;
    if (error) { showFlash('Save failed: ' + error.message, true); return; }
    showFlash(editingId ? 'Pop-up updated.' : 'Pop-up added.');
    resetForm();
    loadAdminPopups();
  });

  cancelEditBtn.addEventListener('click', resetForm);

  async function loadBio() {
    const { data, error } = await client.from('site_content').select('body').eq('key', 'about_bio').maybeSingle();
    if (error) { showFlash('Failed to load bio: ' + error.message, true); return; }
    bioBody.value = (data && data.body) || '';
  }

  bioForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = bioBody.value.trim();
    if (!body) { showFlash('Bio cannot be empty.', true); return; }
    bioSubmitBtn.disabled = true;
    const { error } = await client.from('site_content').update({ body }).eq('key', 'about_bio');
    bioSubmitBtn.disabled = false;
    if (error) { showFlash('Save failed: ' + error.message, true); return; }
    showFlash('Bio updated.');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = error.message;
      loginError.style.display = 'block';
      return;
    }
    showAuthedView();
  });

  logoutBtn.addEventListener('click', async () => {
    await client.auth.signOut();
    showLoginView();
  });

  function showAuthedView() {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    client.auth.getUser().then(({ data }) => {
      if (data && data.user) userEmailEl.textContent = data.user.email || '';
    });
    loadAdminPopups();
    loadBio();
  }

  function showLoginView() {
    dashboardView.style.display = 'none';
    loginView.style.display = 'block';
    loginForm.reset();
    resetForm();
  }

  client.auth.getSession().then(({ data }) => {
    if (data && data.session) showAuthedView();
    else showLoginView();
  }).catch((err) => {
    console.error('Auth check failed', err);
    showLoginView();
  });

  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') showLoginView();
  });
})();
