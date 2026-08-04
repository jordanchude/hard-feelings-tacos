(function () {
  const client = window.supabase.createClient(window.HFT_SUPABASE_URL, window.HFT_SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  const tz = window.HFT_SUPABASE_TZ || 'America/New_York';

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const recoveryView = document.getElementById('recovery-view');
  const signinCard = document.getElementById('signin-card');
  const forgotCard = document.getElementById('forgot-card');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const forgotForm = document.getElementById('forgot-form');
  const forgotError = document.getElementById('forgot-error');
  const showForgotLink = document.getElementById('show-forgot-link');
  const cancelForgotBtn = document.getElementById('cancel-forgot-btn');
  const recoveryForm = document.getElementById('recovery-form');
  const recoveryError = document.getElementById('recovery-error');
  const changePasswordForm = document.getElementById('change-password-form');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userEmailEl = document.getElementById('user-email');

  let isRecovering = false;

  const popupForm = document.getElementById('popup-form');
  const formTitle = document.getElementById('form-title');
  const submitBtn = document.getElementById('submit-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const upcomingList = document.getElementById('admin-upcoming-list');
  const pastList = document.getElementById('admin-past-list');
  const flash = document.getElementById('flash');

  let editingId = null;

  function toLocalDatetimeValue(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatTimeShort(iso) {
    const d = new Date(iso);
    const hour24 = parseInt(d.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }), 10);
    const minute = parseInt(d.toLocaleString('en-US', { minute: '2-digit', timeZone: tz }), 10);
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const minStr = minute === 0 ? '' : ':' + String(minute).padStart(2, '0');
    return `${hour12}${minStr}${hour24 >= 12 ? 'pm' : 'am'}`;
  }

  function formatDateDisplay(startIso, endIso, isSoldOut) {
    const d = new Date(startIso);
    const dayPart = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz });
    let s = `${dayPart} • ${formatTimeShort(startIso)}`;
    if (isSoldOut) s += ' – Sold Out';
    else if (endIso) s += ` – ${formatTimeShort(endIso)}`;
    return s;
  }

  function showFlash(message, isError) {
    flash.textContent = message;
    flash.className = 'flash ' + (isError ? 'error' : 'success');
    flash.style.display = 'block';
    setTimeout(() => { flash.style.display = 'none'; }, 4000);
  }

  const contentController = window.HFT_ADMIN_CONTENT.createContentController({
    client,
    mount: document.getElementById('site-content-manager'),
    showFlash
  });

  function applySoldOutLock() {
    const locked = popupForm.is_sold_out.checked;
    popupForm.starts_at.disabled = locked;
    popupForm.ends_at.disabled = locked;
    document.getElementById('starts-at-group').classList.toggle('locked', locked);
    document.getElementById('ends-at-group').classList.toggle('locked', locked);
  }

  function resetForm() {
    editingId = null;
    popupForm.reset();
    formTitle.textContent = 'Add a new pop-up';
    submitBtn.textContent = 'Add pop-up';
    cancelEditBtn.style.display = 'none';
    applySoldOutLock();
  }

  function startEdit(popup) {
    editingId = popup.id;
    popupForm.venue.value = popup.venue;
    popupForm.starts_at.value = toLocalDatetimeValue(popup.starts_at);
    popupForm.ends_at.value = popup.ends_at ? toLocalDatetimeValue(popup.ends_at) : '';
    popupForm.is_sold_out.checked = !!popup.is_sold_out;
    popupForm.address.value = popup.address;
    applySoldOutLock();
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
      date.textContent = formatDateDisplay(p.starts_at, p.ends_at, p.is_sold_out);
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
    const { data, error } = await client.from('popups').select('*');
    if (error) { showFlash('Failed to load pop-ups: ' + error.message, true); return; }
    const now = Date.now();
    const popups = data || [];
    const upcoming = popups
      .filter((p) => new Date(p.ends_at || p.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    const past = popups
      .filter((p) => new Date(p.ends_at || p.starts_at).getTime() < now)
      .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
    renderAdminList(upcomingList, upcoming);
    renderAdminList(pastList, past);
  }

  async function deletePopup(popup) {
    if (!confirm(`Delete "${popup.venue}" on ${formatDateDisplay(popup.starts_at, popup.ends_at, popup.is_sold_out)}?`)) return;
    const { error } = await client.from('popups').delete().eq('id', popup.id);
    if (error) { showFlash('Delete failed: ' + error.message, true); return; }
    showFlash('Pop-up deleted.');
    if (editingId === popup.id) resetForm();
    loadAdminPopups();
  }

  popupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Read input values directly so disabled (Sold out) fields still submit
    const startsLocal = popupForm.starts_at.value;
    const endsLocal = popupForm.ends_at.value;
    if (!startsLocal) { showFlash('Start date and time are required.', true); return; }
    const startsIso = new Date(startsLocal).toISOString();
    const endsIso = endsLocal ? new Date(endsLocal).toISOString() : null;
    if (endsIso && new Date(endsIso) <= new Date(startsIso)) {
      showFlash('End time must be after start time.', true); return;
    }
    const payload = {
      venue: popupForm.venue.value.trim(),
      starts_at: startsIso,
      ends_at: endsIso,
      is_sold_out: popupForm.is_sold_out.checked,
      address: popupForm.address.value.trim(),
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
  popupForm.is_sold_out.addEventListener('change', applySoldOutLock);

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

  showForgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    signinCard.style.display = 'none';
    forgotCard.style.display = 'block';
    forgotError.style.display = 'none';
    forgotForm.reset();
    forgotForm.email.value = loginForm.email.value;
  });

  cancelForgotBtn.addEventListener('click', () => {
    forgotCard.style.display = 'none';
    signinCard.style.display = 'block';
  });

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotError.style.display = 'none';
    const email = forgotForm.email.value.trim();
    if (!email) return;
    const submitBtn = forgotForm.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/admin/'
    });
    submitBtn.disabled = false;
    if (error) {
      forgotError.textContent = error.message;
      forgotError.style.display = 'block';
      return;
    }
    showFlash('Reset link sent. Check your email.');
    cancelForgotBtn.click();
  });

  recoveryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    recoveryError.style.display = 'none';
    const password = recoveryForm.password.value;
    const confirm = recoveryForm.confirm.value;
    const submitBtn = recoveryForm.querySelector('button[type=submit]');
    if (password !== confirm) {
      recoveryError.textContent = 'Passwords do not match.';
      recoveryError.style.display = 'block';
      return;
    }
    submitBtn.disabled = true;
    const { error } = await client.auth.updateUser({ password });
    submitBtn.disabled = false;
    if (error) {
      recoveryError.textContent = error.message;
      recoveryError.style.display = 'block';
      return;
    }
    isRecovering = false;
    recoveryForm.reset();
    showFlash('Password updated. You are now signed in.');
    history.replaceState(null, '', window.location.pathname);
    showAuthedView();
  });

  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = changePasswordForm.password.value;
    const confirm = changePasswordForm.confirm.value;
    if (password.length < 8) { showFlash('Password must be at least 8 characters.', true); return; }
    if (password !== confirm) { showFlash('Passwords do not match.', true); return; }
    changePasswordBtn.disabled = true;
    const { error } = await client.auth.updateUser({ password });
    changePasswordBtn.disabled = false;
    if (error) { showFlash('Could not update password: ' + error.message, true); return; }
    changePasswordForm.reset();
    showFlash('Password updated.');
  });

  logoutBtn.addEventListener('click', async () => {
    await client.auth.signOut();
    showLoginView();
  });

  function showAuthedView() {
    if (isRecovering) return;
    loginView.style.display = 'none';
    recoveryView.style.display = 'none';
    dashboardView.style.display = 'block';
    client.auth.getUser().then(({ data }) => {
      if (data && data.user) userEmailEl.textContent = data.user.email || '';
    });
    loadAdminPopups();
    contentController.load();
  }

  function showLoginView() {
    dashboardView.style.display = 'none';
    recoveryView.style.display = 'none';
    loginView.style.display = 'block';
    signinCard.style.display = 'block';
    forgotCard.style.display = 'none';
    loginForm.reset();
    resetForm();
  }

  function showRecoveryView() {
    isRecovering = true;
    loginView.style.display = 'none';
    dashboardView.style.display = 'none';
    recoveryView.style.display = 'block';
  }

  client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      showRecoveryView();
    } else if (event === 'SIGNED_OUT') {
      isRecovering = false;
      showLoginView();
    } else if (event === 'SIGNED_IN' && !isRecovering) {
      showAuthedView();
    }
  });

  client.auth.getSession().then(({ data }) => {
    if (isRecovering) return;
    if (data && data.session) showAuthedView();
    else showLoginView();
  }).catch((err) => {
    console.error('Auth check failed', err);
    showLoginView();
  });
})();
