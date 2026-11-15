/* Device picker for the guides under /navody and /en/guides.
   Every device's steps are in the HTML; this only shows the one picked.
   Without JS all of them stay visible. ?device=phone|mac|windows picks one. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  function detect() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod|Android/i.test(ua)) return 'phone';
    // iPadOS reports itself as a Mac; a touch screen gives it away.
    if (/Macintosh/.test(ua)) return navigator.maxTouchPoints > 1 ? 'phone' : 'mac';
    return 'windows';
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
    var q = new URLSearchParams(location.search).get('device');
    var valid = { phone: 1, mac: 1, windows: 1 };
    pick(valid[q] ? q : detect(), !valid[q]);
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-device]');
      if (b) pick(b.getAttribute('data-device'), false);
    });
  });
})();
