/* Device picker for the guides under /navody and /en/guides.
   Every device's steps are in the HTML; this only shows the one picked.
   Without JS all of them stay visible. The valid devices are the page's own
   [data-device] buttons (eduroam: phone|mac|windows, exams: phone|desktop);
   ?device=<one of them> picks one. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  function devices() {
    var out = [];
    var buttons = document.querySelectorAll('[data-device]');
    for (var i = 0; i < buttons.length; i++) out.push(buttons[i].getAttribute('data-device'));
    return out;
  }
  function detect(valid) {
    var ua = navigator.userAgent || '';
    var has = function (d) { return valid.indexOf(d) !== -1; };
    // A page without a "mac" or "windows" button gets its first non-phone device.
    var desktop = function (d) {
      if (has(d)) return d;
      for (var i = 0; i < valid.length; i++) if (valid[i] !== 'phone') return valid[i];
      return valid[0];
    };
    if (/iPhone|iPad|iPod|Android/i.test(ua) && has('phone')) return 'phone';
    // iPadOS reports itself as a Mac; a touch screen gives it away.
    if (/Macintosh/.test(ua)) return navigator.maxTouchPoints > 1 && has('phone') ? 'phone' : desktop('mac');
    return desktop('windows');
  }
  function pick(device, auto) {
    var buttons = document.querySelectorAll('[data-device]');
    var panels = document.querySelectorAll('[data-panel]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-device') === device));
    }
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.toggle('on', panels[j].getAttribute('data-panel') === device);
    }
    window.__reisGuide = { device: device, option: null, auto: auto };
    if (!auto && window.reisTrack) {
      window.reisTrack('guide_device_selected', { guide: location.pathname, device: device });
    }
  }
  document.addEventListener('DOMContentLoaded', function () {
    var valid = devices();
    if (!valid.length) return;
    var q = new URLSearchParams(location.search).get('device');
    var ok = valid.indexOf(q) !== -1;
    pick(ok ? q : detect(valid), !ok);
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-device]');
      if (b) pick(b.getAttribute('data-device'), false);
    });
  });
})();
