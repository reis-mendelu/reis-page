/* Device picker for the guides under /navody and /en/guides.
   Every device's steps are in the HTML; this only shows the one picked.
   Without JS all of them stay visible. The valid devices are the page's own
   [data-device] buttons (eduroam: phone|mac|windows, exams: phone|desktop);
   Telefon (phone) is shown first unless ?device=<one of them> picks another. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  function devices() {
    var out = [];
    var buttons = document.querySelectorAll('[data-device]');
    for (var i = 0; i < buttons.length; i++) out.push(buttons[i].getAttribute('data-device'));
    return out;
  }
  // Telefon is the default everywhere, also on a computer: almost every student
  // uses reIS on the phone (Dominik, 2026-11-15). ?device= still picks another one.
  function fallback(valid) {
    return valid.indexOf('phone') !== -1 ? 'phone' : valid[0];
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
    pick(ok ? q : fallback(valid), !ok);
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-device]');
      if (b) pick(b.getAttribute('data-device'), false);
    });
  });
  // Dorm chooser (/navody/koleje): a [data-pick] button lists, in data-order, the ids of
  // the .dorm cards that fit; those go first (flex order), get .match and show their
  // .why[data-for=pick] line. Pressing it again goes back to the HTML order.
  document.addEventListener('DOMContentLoaded', function () {
    var list = document.querySelector('[data-dorms]');
    if (!list) return;
    var cards = list.querySelectorAll('.dorm');
    var buttons = document.querySelectorAll('[data-pick]');
    function choose(pick, order) {
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-pick') === pick));
      }
      for (var j = 0; j < cards.length; j++) {
        var rank = pick ? order.indexOf(cards[j].id) : -1;
        cards[j].style.order = rank === -1 ? String(100 + j) : String(rank);
        cards[j].classList.toggle('match', rank !== -1);
        var whys = cards[j].querySelectorAll('.why');
        for (var k = 0; k < whys.length; k++) {
          whys[k].classList.toggle('on', rank !== -1 && whys[k].getAttribute('data-for') === pick);
        }
      }
    }
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-pick]');
      if (!b) return;
      var pick = b.getAttribute('aria-pressed') === 'true' ? null : b.getAttribute('data-pick');
      choose(pick, pick ? b.getAttribute('data-order').split(' ') : []);
      if (pick && window.reisTrack) window.reisTrack('guide_dorm_pick', { guide: location.pathname, pick: pick });
    });
  });
})();
