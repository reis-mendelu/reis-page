// Home page hero: show the install button for the visitor's device, with
// "Další platformy" revealing the rest. Runs in <head>, before support.js
// renders the page, and only touches <html>, which React never owns; the
// hiding itself is CSS in /install.css.
//
// - Device recognised: <html data-reis-device="ios|android|chrome|edge|firefox|mac">
// - "Další platformy" open: <html data-install-open>
// - No JS, or a device we can't tell: no attribute, so every option shows.
//
// detect() mirrors detect() in navod/index.html; keep the two in step.
(function () {
  var html = document.documentElement;

  // macOS, but not an iPad: iPadOS Safari sends a Macintosh user agent, so a
  // touch screen tells them apart.
  function isMacVisitor(ua) {
    return /Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad|iPod/.test(ua) && (navigator.maxTouchPoints || 0) < 2;
  }

  function detect() {
    var ua = navigator.userAgent || '', touch = navigator.maxTouchPoints || 0;
    if (/iPhone|iPod/.test(ua)) return 'ios';
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Mobi|Tablet/.test(ua)) return null;
    if (/Edg\//.test(ua)) return 'edge';
    if (/Firefox\//.test(ua)) return 'firefox';
    if (isMacVisitor(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|OPR|Firefox/.test(ua)) return 'mac';
    if (/Chrome\//.test(ua)) return 'chrome';
    return null;
  }

  var device = null;
  try { device = detect(); } catch (e) {}
  if (device) html.setAttribute('data-reis-device', device);

  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest && ev.target.closest('[data-install-more]');
    if (!btn) return;
    var open = !html.hasAttribute('data-install-open');
    if (open) html.setAttribute('data-install-open', '');
    else html.removeAttribute('data-install-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    try { if (open && window.reisTrack) window.reisTrack('hero_more_platforms', { device: device }); } catch (e) {}
  });
})();
