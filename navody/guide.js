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
// Opened from the reIS app (?z=app, sent by the app's Nápověda and "Proč to nejde?" links):
// the student already has reIS, so the install buttons go away. A #hash naming a <details>
// (e.g. #nefunguje, #oficialne), or an element inside one, opens it and scrolls there, from the app or any link.
(function () {
  var root = document.documentElement;
  if (new URLSearchParams(location.search).get('z') === 'app') root.classList.add('from-app');
  function openHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    // The section itself, or a question inside a closed toggle (eduroam's "Další otázky").
    var d = el.tagName === 'DETAILS' ? el : el.closest('details');
    if (!d) return;
    d.open = true;
    el.scrollIntoView({ block: 'start' });
  }
  document.addEventListener('DOMContentLoaded', openHash);
  window.addEventListener('hashchange', openHash);
})();
// "Pošli spolužákovi": share the guide (system share sheet on a phone, copy the link elsewhere).
// Shared links are what other people post in class groups, which is also how Google finds them.
document.addEventListener('DOMContentLoaded', function () {
  // One look on every guide (Dominik, 2026-11-19): the full-width button. A page can place it with
  // <div class="share-box" data-share-here><p>…</p></div>; otherwise it goes above the Ověřeno line.
  var here = document.querySelector('[data-share-here]');
  if (!here) {
    var anchor = document.querySelector('main .checked');
    if (!anchor) return;
    here = document.createElement('div');
    here.className = 'share-box';
    anchor.parentNode.insertBefore(here, anchor);
  }
  var en = document.documentElement.lang === 'en';
  var canonical = document.querySelector('link[rel="canonical"]');
  var url = (canonical ? canonical.href : location.origin + location.pathname) + '?utm_source=share';
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'share big';
  b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg><span>' + (en ? 'Send to a classmate' : 'Pošli spolužákovi') + '</span>';
  here.appendChild(b);
  b.addEventListener('click', function () {
    var done = function (how) {
      if (window.reisTrack) window.reisTrack('guide_shared', { guide: location.pathname, how: how });
    };
    if (navigator.share) {
      navigator.share({ title: document.title, url: url }).then(function () { done('share'); }, function () {});
      return;
    }
    var label = b.querySelector('span');
    var copied = function () {
      label.textContent = en ? 'Link copied' : 'Odkaz zkopírován';
      setTimeout(function () { label.textContent = en ? 'Send to a classmate' : 'Pošli spolužákovi'; }, 2000);
      done('copy');
    };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(copied, function () { prompt(en ? 'Copy the link:' : 'Zkopíruj odkaz:', url); });
    else prompt(en ? 'Copy the link:' : 'Zkopíruj odkaz:', url);
  });
});
