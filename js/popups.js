(function () {
  const client = window.supabase.createClient(window.HFT_SUPABASE_URL, window.HFT_SUPABASE_KEY);
  const tz = window.HFT_SUPABASE_TZ || 'America/New_York';

  function formatTime(isoString) {
    const date = new Date(isoString);
    const hour24 = parseInt(date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }), 10);
    const minute = parseInt(date.toLocaleString('en-US', { minute: '2-digit', timeZone: tz }), 10);
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const minStr = minute === 0 ? '' : ':' + String(minute).padStart(2, '0');
    const ampm = hour24 >= 12 ? 'pm' : 'am';
    return `${hour12}${minStr}${ampm}`;
  }

  function formatDateLine(startIso, endIso, isSoldOut) {
    const startDate = new Date(startIso);
    const weekday = startDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz });
    const month = startDate.toLocaleDateString('en-US', { month: 'long', timeZone: tz });
    const day = startDate.toLocaleDateString('en-US', { day: 'numeric', timeZone: tz });

    let timeRange = formatTime(startIso);
    if (endIso) timeRange += ` – ${formatTime(endIso)}`;

    let line = `${weekday}, ${month} ${day} • ${timeRange}`;
    if (isSoldOut) line += ' • Sold Out';
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
      dateLine.textContent = formatDateLine(p.starts_at, p.ends_at, p.is_sold_out);

      const address = document.createElement('p');
      address.className = 'paragraph-one paragraph-brown';
      address.textContent = p.address;

      item.appendChild(venue);
      item.appendChild(dateLine);
      item.appendChild(address);
      container.appendChild(item);
    });
  }

  let cachedPopups = [];
  let lastUpcomingKey = null;

  function partitionAndRender() {
    const upcomingEl = document.getElementById('upcoming-events');
    const pastEl = document.getElementById('past-events');
    if (!upcomingEl || !pastEl) return;
    const now = Date.now();
    const upcoming = cachedPopups
      .filter((p) => new Date(p.ends_at || p.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    const past = cachedPopups
      .filter((p) => new Date(p.ends_at || p.starts_at).getTime() < now)
      .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
    const upcomingKey = upcoming.map((p) => p.id).join(',');
    if (upcomingKey === lastUpcomingKey) return;
    lastUpcomingKey = upcomingKey;
    renderList(upcomingEl, upcoming);
    renderList(pastEl, past);
  }

  async function loadPopups() {
    const upcomingEl = document.getElementById('upcoming-events');
    const pastEl = document.getElementById('past-events');
    if (!upcomingEl || !pastEl) return;

    const { data, error } = await client.from('popups').select('*');
    if (error) {
      console.error('Failed to load pop-ups', error);
      const msg = document.createElement('p');
      msg.className = 'paragraph-one paragraph-brown';
      msg.style.textAlign = 'center';
      msg.textContent = 'Could not load pop-ups. Please refresh.';
      upcomingEl.innerHTML = '';
      upcomingEl.appendChild(msg);
      return;
    }

    cachedPopups = data || [];
    lastUpcomingKey = null;
    partitionAndRender();
  }

  // Re-partition every minute so pop-ups roll over from "Upcoming" to
  // "Past" without a page refresh once their end (or start) time passes.
  setInterval(partitionAndRender, 60 * 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPopups);
  } else {
    loadPopups();
  }
})();
