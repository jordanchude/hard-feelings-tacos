(function () {
  const client = window.supabase.createClient(window.HFT_SUPABASE_URL, window.HFT_SUPABASE_KEY);
  const tz = window.HFT_SUPABASE_TZ || 'America/New_York';

  function formatDateLine(isoString, statusNote) {
    const date = new Date(isoString);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz });
    const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: tz });
    const day = date.toLocaleDateString('en-US', { day: 'numeric', timeZone: tz });

    const hour24Str = date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz });
    const minuteStr = date.toLocaleString('en-US', { minute: '2-digit', timeZone: tz });
    const hour24 = parseInt(hour24Str, 10);
    const minute = parseInt(minuteStr, 10);
    const isPm = hour24 >= 12;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const minStr = minute === 0 ? '' : ':' + String(minute).padStart(2, '0');
    const ampm = isPm ? 'pm' : 'am';

    let line = `${weekday}, ${month} ${day} • ${hour12}${minStr}${ampm}`;
    if (statusNote && statusNote.trim()) {
      line += ` – ${statusNote.trim()}`;
    }
    return line;
  }

  function renderList(container, popups) {
    container.innerHTML = '';
    if (!popups.length) {
      const empty = document.createElement('p');
      empty.className = 'paragraph-one paragraph-brown';
      empty.style.textAlign = 'center';
      empty.style.opacity = '0.7';
      empty.textContent = container.id === 'upcoming-events'
        ? 'No upcoming pop-ups right now — check back soon!'
        : 'No past pop-ups to show yet.';
      container.appendChild(empty);
      return;
    }
    popups.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'event-item';

      const venue = document.createElement('h3');
      venue.className = 'heading-two heading-brown';
      venue.textContent = p.venue;

      const dateLine = document.createElement('p');
      dateLine.className = 'paragraph-one paragraph-brown';
      dateLine.textContent = formatDateLine(p.starts_at, p.status_note);

      const address = document.createElement('p');
      address.className = 'paragraph-one paragraph-brown';
      address.textContent = p.address;

      item.appendChild(venue);
      item.appendChild(dateLine);
      item.appendChild(address);
      container.appendChild(item);
    });
  }

  async function loadPopups() {
    const upcomingEl = document.getElementById('upcoming-events');
    const pastEl = document.getElementById('past-events');
    if (!upcomingEl || !pastEl) return;

    const nowIso = new Date().toISOString();

    const { data: upcoming, error: upErr } = await client
      .from('popups')
      .select('*')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true });

    const { data: past, error: pastErr } = await client
      .from('popups')
      .select('*')
      .lt('starts_at', nowIso)
      .order('starts_at', { ascending: false });

    if (upErr || pastErr) {
      console.error('Failed to load pop-ups', upErr || pastErr);
      const msg = document.createElement('p');
      msg.className = 'paragraph-one paragraph-brown';
      msg.style.textAlign = 'center';
      msg.textContent = 'Could not load pop-ups. Please refresh.';
      upcomingEl.innerHTML = '';
      upcomingEl.appendChild(msg);
      return;
    }

    renderList(upcomingEl, upcoming || []);
    renderList(pastEl, past || []);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPopups);
  } else {
    loadPopups();
  }
})();
