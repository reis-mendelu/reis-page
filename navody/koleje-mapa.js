/* Interactive dorm map for /navody/koleje and /en/guides/dorms.
   Pick a faculty ([data-fac]), click a dorm on the map: the route to that faculty is drawn
   (white start dot, red pin at the faculty door) and a panel opens with the dorm's card
   content plus the trip. The panel copies the .dorm card from the page, so the text lives
   in the HTML once. Data: /navody/koleje-mapa-data.js (generated, OSM + IDS JMK).
   Without JS the [data-js-only] blocks stay hidden and the cards below carry everything. */
(function () {
  var D = window.KOLEJE_MAPA;
  var root = document.querySelector('[data-dorm-map]');
  if (!D || !root) return;
  var EN = document.documentElement.lang === 'en';
  var NS = 'http://www.w3.org/2000/svg';
  var FACS = { AF: 'C', LDF: 'B', PEF: 'Q', FRRMS: 'Z', ICV: 'E', ZF: null };
  var DORMS = {
    // pin: where the label chip sits relative to the dorm — JAK A·B·D and JAK C are
    // 100 m apart, so their chips go opposite ways and can never be mis-tapped.
    akademie: { shapes: ['akademie'], label: 'Akademie', pin: 'up' },
    jak: { shapes: ['jak-a', 'jak-b', 'jak-d'], label: 'JAK A·B·D', pin: 'up' },
    'jak-c': { shapes: ['jak-c'], label: 'JAK C', pin: 'down' },
    taufer: { shapes: ['taufer'], label: 'Taufer', pin: 'up' }
  };
  var PHOTO = {
    akademie: {
      src: '/assets/navody/koleje/akademie-budova-z.webp',
      alt: EN ? 'Building Z: Akademie dorm and FRRMS' : 'Budova Z: kolej Akademie a FRRMS',
      credit: 'Kirk, <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.cs">CC BY-SA 3.0</a>, <a href="https://commons.wikimedia.org/wiki/File:Brno-Cerna_Pole_-_Fakulta_regionalniho_rozvoje_a_mezinarodnich_studii_Mendelovy_univerzity_v_Brne.jpg">Wikimedia Commons</a>'
    }
  };
  var T = EN ? {
    ask: 'Which faculty do you study at?', walk: 'on foot to', pt: 'by public transport to', bldg: 'building',
    ptLine: 'Public transport', walkLine: 'on foot', 
    gardenWhen: 'Mon–Fri 6–20', here: 'You live in your faculty’s own building (building Z).',
    zf: 'ZF is in Lednice. You will most likely live in the P. Bezruče dorm there, 3 minutes from the faculty.',
    then: ', then ', tram: 'tram', trolleybus: 'trolleybus', bus: 'bus', close: 'Close', photo: 'Photo',
    map: 'Map of MENDELU dorms', walkLeg: 'walk', rideLeg: 'public transport',
    walkShort: '%m min walk to %f', gardenShort: '%m min walk to %f through the botanical garden', walkGarden: 'on foot through the botanical garden to',
    gardenOpen: 'The garden is open to students Mon–Fri 6–20; your ISIC card opens the gate. Otherwise it is about %m min round it.', ptShort: '%m min by public transport to %f', hereShort: 'FRRMS is in the same building'
  } : {
    ask: 'Kam chodíš do školy?', walk: 'pěšky na', pt: 'MHD na', bldg: 'budova',
    ptLine: 'MHD', walkLine: 'pěšky', 
    gardenWhen: 'po–pá 6–20', here: 'Bydlíš přímo v budově své fakulty (budova Z).',
    zf: 'ZF je v Lednici. Bydlet budeš nejspíš na kolejích P. Bezruče, 3 minuty od fakulty.',
    then: ', pak ', tram: 'tramvaj', trolleybus: 'trolejbus', bus: 'autobus', close: 'Zavřít', photo: 'Foto',
    map: 'Mapa kolejí MENDELU', walkLeg: 'pěšky', rideLeg: 'MHD',
    walkShort: '%m min pěšky na %f', gardenShort: '%m min pěšky přes botanickou zahradu na %f', walkGarden: 'pěšky přes botanickou zahradu na',
    gardenOpen: 'Zahrada je pro studenty otevřená po–pá 6–20, branku otevřeš kartou ISIC. Jindy to obejdeš asi za %m min.', ptShort: 'MHD %m min na %f', hereShort: 'FRRMS máš v budově'
  };
  var fac = null, sel = null;
  var mapBox = root.querySelector('.dmap-map');
  var pane = root.querySelector('.dmap-pane');

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pts(list) { return list.map(function (p) { return p[0] + ',' + p[1]; }).join(' '); }
  function trip(id) {
    if (!fac) return null;
    if (fac === 'ZF') return { zf: true };
    if (id === 'akademie' && fac === 'FRRMS') return { here: true };
    return D.routes[id + '|' + fac];
  }
  function bounds(list) {
    var b = [1e9, 1e9, -1e9, -1e9];
    list.forEach(function (p) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); });
    return b;
  }
  function shapeBounds(id) {
    var out = [];
    DORMS[id].shapes.forEach(function (s) {
      D.dorms[s].replace(/z/g, '').split('M').forEach(function (part) {
        var n = part.trim().split(' ').map(Number);
        for (var i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
      });
    });
    return out;
  }

  function draw() {
    var W = mapBox.clientWidth, H = mapBox.clientHeight;
    if (!W || !H) return;
    var r = sel && trip(sel), lines = r && r.line ? r.line : null;
    var focus = [];
    if (lines) lines.forEach(function (l) { focus = focus.concat(l.p); });
    else Object.keys(DORMS).forEach(function (id) { focus = focus.concat(shapeBounds(id)); });
    var b = bounds(focus), pad = Math.max(b[2] - b[0], b[3] - b[1]) * 0.12 + 70;
    var x0 = b[0] - pad, y0 = b[1] - pad, w = b[2] - b[0] + 2 * pad, h = b[3] - b[1] + 2 * pad;
    if (w / h > W / H) { var nh = w * H / W; y0 -= (nh - h) / 2; h = nh; } else { var nw = h * W / H; x0 -= (nw - w) / 2; w = nw; }
    var k = w / W;
    mapBox.textContent = '';
    var svg = el('svg', { viewBox: x0 + ' ' + y0 + ' ' + w + ' ' + h, role: 'img', 'aria-label': T.map }, mapBox);
    el('path', { d: D.green, fill: '#16231a' }, svg);
    [['c', 2, '#262d27'], ['b', 3, '#2f372f'], ['a', 4, '#3a433b']].forEach(function (c) {
      el('path', { d: D.roads[c[0]], fill: 'none', stroke: c[2], 'stroke-width': c[1] * k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    });
    el('path', { d: D.tram, fill: 'none', stroke: '#3d3a2c', 'stroke-width': 1.5 * k, 'stroke-dasharray': 4 * k + ' ' + 3 * k }, svg);
    el('path', { d: D.ctx, fill: '#262c27', stroke: '#323a33', 'stroke-width': k }, svg);
    var fb = fac && FACS[fac];
    if (fb && D.fac[fb]) el('path', { d: D.fac[fb], fill: '#3b453c', stroke: '#8f988d', 'stroke-width': 1.5 * k }, svg);
    if (lines) lines.forEach(function (l) {
      if (!l.ride) el('polyline', { points: pts(l.p), fill: 'none', stroke: '#0d110e', 'stroke-width': 8 * k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      el('polyline', { points: pts(l.p), fill: 'none', stroke: l.ride ? '#e8b64c' : '#a5d85f', 'stroke-width': (l.ride ? 4 : 5) * k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': l.ride ? 8 * k + ' ' + 6 * k : 'none' }, svg);
    });
    Object.keys(DORMS).forEach(function (id) {
      var on = id === sel;
      DORMS[id].shapes.forEach(function (s) {
        el('path', { d: D.dorms[s], fill: on ? '#55703a' : '#2c3a1e', stroke: on ? '#dfe9d3' : '#6f8f4a', 'stroke-width': (on ? 2 : 1.2) * k }, svg);
      });
    });
    if (lines) {
      var s0 = lines[0].p[0];
      el('circle', { cx: s0[0], cy: s0[1], r: 6 * k, fill: '#ffffff', stroke: '#0d110e', 'stroke-width': 3 * k }, svg);
      lines.slice(1).forEach(function (l) { el('circle', { cx: l.p[0][0], cy: l.p[0][1], r: 4 * k, fill: '#0d110e', stroke: '#eef2ec', 'stroke-width': 2 * k }, svg); });
    }
    drawPins(svg, k, x0, y0, w, h);
    if (fb) {
      var end = lines ? lines[lines.length - 1].p : null, c = end ? end[end.length - 1] : D.door[fb];
      var pin = el('g', { transform: 'translate(' + c[0] + ',' + c[1] + ') scale(' + k + ')' }, svg);
      el('path', { d: 'M0,0 C-4,-8 -12,-14 -12,-24 A12,12 0 1 1 12,-24 C12,-14 4,-8 0,0Z', fill: '#ef5b4c', stroke: '#0d110e', 'stroke-width': 2 }, pin);
      el('circle', { cx: 0, cy: -24, r: 4.5, fill: '#0d110e' }, pin);
      var lt = el('text', { x: c[0] + 16 * k, y: c[1] - 20 * k, 'font-size': 13 * k, 'font-weight': 700, fill: '#eef2ec', stroke: '#0d110e', 'stroke-width': 3.5 * k, 'paint-order': 'stroke' }, svg);
      lt.textContent = fac;
      if (c[0] + 16 * k + lt.getComputedTextLength() > x0 + w - 6 * k) { lt.setAttribute('text-anchor', 'end'); lt.setAttribute('x', c[0] - 16 * k); }
    }
    var lg = document.createElement('div');
    lg.className = 'dmap-legend';
    lg.innerHTML = (lines ? '<span><i></i>' + T.walkLeg + '</span>' : '') +
      (lines && lines.some(function (l) { return l.ride; }) ? '<span><i class="ride"></i>' + T.rideLeg + '</span>' : '') +
      '<span>© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></span>';
    mapBox.appendChild(lg);
  }

  // A labelled chip per dorm ("Akademie · od 5 370 Kč"), the way map apps mark places: big enough
  // to tap (44 px target), the picked one filled. The price is read from the dorm's card.
  function price(id) {
    var b = document.querySelector('#' + id + ' .price');
    return b ? b.textContent.replace(/\s*\/.*$/, '').replace(/\s+/g, ' ').trim() : '';
  }
  function drawPins(svg, k, x0, y0, w, h) {
    var placed = [];
    Object.keys(DORMS).forEach(function (id) {
      var d = DORMS[id], on = id === sel, sb = bounds(shapeBounds(id));
      var ax = (sb[0] + sb[2]) / 2, ay = d.pin === 'down' ? sb[3] : sb[1];
      if (!on && (ax < x0 || ax > x0 + w || ay < y0 || ay > y0 + h)) return;
      var g = el('g', { 'class': 'dmap-dorm', tabindex: '0', role: 'button', 'aria-label': d.label + ', ' + price(id), 'aria-pressed': String(on) }, svg);
      // Two lines (name, price) keep the chip narrow enough that neighbours don't collide on a phone.
      var t = el('text', { 'font-size': 13 * k, 'font-weight': 700, fill: on ? '#0d110e' : '#eef2ec' }, g);
      var name = el('tspan', {}, t); name.textContent = d.label;
      var pr = el('tspan', { 'font-size': 12 * k, 'font-weight': 500, fill: on ? '#0d110e' : '#c8cfc6' }, t); pr.textContent = price(id);
      var cw = Math.max(name.getComputedTextLength(), pr.getComputedTextLength()) + 20 * k, ch = 40 * k, gap = 9 * k;
      var cx = Math.min(Math.max(ax - cw / 2, x0 + 6 * k), x0 + w - cw - 6 * k);
      var cy = d.pin === 'down' ? ay + gap : ay - gap - ch;
      cy = Math.min(Math.max(cy, y0 + 6 * k), y0 + h - ch - 30 * k);
      placed.forEach(function (p) {
        if (cx < p[0] + p[2] && p[0] < cx + cw && cy < p[1] + p[3] && p[1] < cy + ch) cy = d.pin === 'down' ? p[1] + p[3] + 4 * k : p[1] - ch - 4 * k;
      });
      placed.push([cx, cy, cw, ch]);
      var stemY = d.pin === 'down' ? cy : cy + ch;
      g.insertBefore(el('path', { d: 'M' + (ax - 6 * k) + ' ' + stemY + ' L' + ax + ' ' + ay + ' L' + (ax + 6 * k) + ' ' + stemY + 'Z', fill: on ? '#a5d85f' : '#1c221d', stroke: on ? '#0d110e' : '#79be15', 'stroke-width': 1.2 * k }), t);
      g.insertBefore(el('rect', { x: cx - 4 * k, y: cy - 4 * k, width: cw + 8 * k, height: ch + 8 * k, fill: 'transparent' }), t);
      g.insertBefore(el('rect', { x: cx, y: cy, width: cw, height: ch, rx: 10 * k, fill: on ? '#a5d85f' : '#1c221d', stroke: on ? '#0d110e' : '#79be15', 'stroke-width': 1.2 * k }), t);
      name.setAttribute('x', cx + 10 * k); name.setAttribute('y', cy + 17 * k);
      pr.setAttribute('x', cx + 10 * k); pr.setAttribute('y', cy + 32 * k);
      g.addEventListener('click', function () { pick(id); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(id); } });
    });
  }
  function via(r) {
    if (!r.ptVia) return '';
    return r.ptVia.split(' then ').map(function (s) {
      var m = s.match(/^(\w+) (\S+) (.+) -> (.+)$/);
      return m ? T[m[1]] + ' ' + m[2] + ' · ' + m[3] + ' → ' + m[4] : s;
    }).join(T.then);
  }
  function facChips() {
    return Object.keys(FACS).map(function (f) { return '<button type="button" class="dmap-fac" data-fac="' + f + '" aria-pressed="' + (f === fac) + '">' + f + '</button>'; }).join('');
  }
  function tripHTML(id) {
    var r = trip(id), fb = FACS[fac];
    if (!r) return '<div class="dmap-trip ask"><p>' + T.ask + '</p><div class="dmap-facs">' + facChips() + '</div></div>';
    if (r.zf) return '';
    if (r.here) return '<div class="dmap-trip"><span>' + T.here + '</span></div>';
    var transit = id === 'taufer';
    var big = transit ? r.pt : r.walk, what = (transit ? T.pt : r.viaGarden ? T.walkGarden : T.walk) + ' ' + fac;
    var html = '<div class="dmap-trip"><b>' + big + ' min</b><span>' + what + '</span></div>';
    if (transit) {
      return html + '<p class="dmap-via">' + via(r) + '</p>';
    }
    if (r.viaGarden) html += '<p class="dmap-via">' + T.gardenOpen.replace('%m', r.around) + '</p>';
    // Public transport where it beats walking by 2 minutes or more (waiting included), and always
    // from Akademie: tram 9 from Bieblova is the usual alternative to the garden walk.
    if (r.pt && (r.viaGarden || r.pt <= r.walk - 2)) html += '<p class="dmap-via">' + T.ptLine + ' ' + r.pt + ' min: ' + via(r) + '</p>';
    return html;
  }
  function renderPane() {
    // ZF is in Lednice, not on this map: show that whatever dorm is picked.
    var id = fac === 'ZF' ? 'lednice' : sel;
    if (!id) { pane.classList.remove('open'); pane.innerHTML = pane.getAttribute('data-empty'); pane.classList.add('empty'); return; }
    var card = document.getElementById(id), body = card ? card.cloneNode(true) : null;
    if (body) {
      body.removeAttribute('id'); body.removeAttribute('style'); body.className = 'dmap-card';
      Array.prototype.forEach.call(body.querySelectorAll('.why,.badge,.times'), function (n) { n.remove(); });
      // The trip box says the time, so the card's key line keeps only the bathroom.
      var key = body.querySelector('.key');
      if (key) key.innerHTML = key.innerHTML.split(' · <span')[0];
    }
    pane.classList.remove('empty');
    pane.innerHTML = '<button type="button" class="dmap-x" aria-label="' + T.close + '">×</button>';
    if (id === 'lednice') pane.insertAdjacentHTML('beforeend', '<div class="dmap-trip ask"><p>' + T.zf + '</p></div>');
    if (body) {
      var head = body.querySelector('.dorm-head');
      if (head) head.insertAdjacentHTML('afterend', tripHTML(id));
      var p = PHOTO[id], more = body.querySelector('details.more');
      if (p && more) more.querySelector('summary').insertAdjacentHTML('afterend', '<figure class="dmap-photo"><img src="' + p.src + '" alt="' + p.alt + '" width="960" height="642" loading="lazy"><figcaption>' + T.photo + ': ' + p.credit + '</figcaption></figure>');
      pane.appendChild(body);
    }
    pane.classList.add('open');
  }
  // The cards' key line ("· 17 min pěšky na Zemědělskou") follows the picked faculty.
  function syncTimes() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-time]'), function (n) {
      var id = n.getAttribute('data-time');
      if (!n.hasAttribute('data-default')) n.setAttribute('data-default', n.textContent);
      var r = trip(id);
      if (!r || r.zf) n.textContent = n.getAttribute('data-default');
      else if (r.here) n.textContent = T.hereShort;
      else if (id === 'taufer') n.textContent = T.ptShort.replace('%m', r.pt).replace('%f', fac);
      else if (r.viaGarden) n.textContent = T.gardenShort.replace('%m', r.walk).replace('%f', fac);
      else n.textContent = T.walkShort.replace('%m', r.walk).replace('%f', fac);
    });
  }
  function syncChips() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-fac]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-fac') === fac)); });
  }
  function render() { syncChips(); syncTimes(); draw(); renderPane(); }
  function pick(id) {
    sel = id; render();
    if (window.innerWidth < 900) mapBox.scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (window.reisTrack) window.reisTrack('guide_dorm_map', { guide: location.pathname, dorm: id, faculty: fac });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-fac]');
    if (b) {
      fac = b.getAttribute('data-fac'); render();
      var mr = mapBox.getBoundingClientRect();
      if (!b.closest('.dmap-pane') && (mr.top > window.innerHeight * 0.6 || mr.bottom < 0)) mapBox.scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (window.reisTrack) window.reisTrack('guide_dorm_map', { guide: location.pathname, dorm: sel, faculty: fac });
      return;
    }
    if (ev.target.closest && ev.target.closest('.dmap-x')) { sel = null; render(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sel) { sel = null; render(); } });
  // The phone sheet is fixed to the bottom of the screen; hide it once the map scrolls away,
  // so it never covers "Jak získat místo" further down.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { pane.classList.toggle('away', !es[0].isIntersecting); }, { threshold: 0.15 }).observe(mapBox);
  }
  var rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(draw, 120); });
  root.removeAttribute('hidden');
  render();
})();
