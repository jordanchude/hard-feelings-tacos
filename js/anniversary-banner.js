(function () {
  var TARGET = new Date('2026-05-24T12:00:00-04:00').getTime();
  var EVENT_END = new Date('2026-05-25T00:00:00-04:00').getTime();

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function init() {
    var el = document.getElementById('ab-countdown');
    var banner = document.getElementById('anniversary-banner');
    if (!el || !banner) return;

    function update() {
      var now = Date.now();
      if (now >= EVENT_END) {
        banner.style.display = 'none';
        return;
      }
      var diff = TARGET - now;
      if (diff <= 0) {
        el.textContent = 'HAPPENING TODAY';
        el.setAttribute('data-state', 'today');
        return;
      }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      el.textContent = d + 'd ' + pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
    }

    update();
    setInterval(update, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
