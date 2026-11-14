/*
 * Website analytics for reisapp.cz (PostHog EU, the reIS organisation's only
 * project, shared with reByt; every event carries site=reisapp.cz).
 *
 * - Cookieless: PostHog stores nothing in the browser (no cookies, no
 *   local/session storage), so no consent banner is needed. Unique visitors
 *   come from a daily-rotating hash computed on PostHog's side.
 * - First-party: the SDK is served from /vendor, events go to /rx/* which
 *   vercel.json rewrites to eu.i.posthog.com. The browser talks to no one else.
 * - Minimal: page views plus named events (store clicks, guide steps). No
 *   autocapture, no session recording, no heatmaps, no surveys, no flags.
 *
 * window.reisTrack(name, props) is always defined, and is a no-op when
 * analytics is off (anything but reisapp.cz / reis-navod.cz).
 */
(function () {
  // The PostHog project token is public by design (it only allows sending events).
  var TOKEN = 'phc_kt2LTXYX5hA2uHdsGd4j4BWMxAcPQNRQFnWhUPGQYPko';
  var host = location.hostname;
  // Only the real site sends events; previews and localhost stay out of the
  // shared project.
  var off = !/^(www\.)?(reisapp\.cz|reis-navod\.cz)$/.test(host);

  window.reisTrack = function (name, props) {
    if (off) return;
    try { window.posthog.capture(name, props || {}); } catch (e) {}
  };
  if (off) return;

  var ph = (window.posthog = window.posthog || []);
  ph._i = [];
  ph.__SV = 1;
  ph.init = function (token, config, name) { ph._i.push([token, config, name]); };
  ['capture', 'register'].forEach(function (m) {
    ph[m] = function () { ph.push([m].concat(Array.prototype.slice.call(arguments, 0))); };
  });
  ph.init(TOKEN, {
    api_host: '/rx',
    ui_host: 'https://eu.posthog.com',
    cookieless_mode: 'always',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: false,
    autocapture: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_performance: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_web_experiments: true,
    disable_product_tours: true,
    advanced_disable_flags: true
  });
  // The project is shared: tag every event from this site.
  ph.register({ site: 'reisapp.cz' });
  var s = document.createElement('script');
  s.async = true;
  s.src = '/vendor/posthog-1.449.2.no-external.js';
  document.head.appendChild(s);

  // Store links anywhere on the site (home page buttons, the guide, the FAQ).
  // In the guide, also record where the visitor was (set by the guide itself).
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    var u = a.getAttribute('href') || '';
    var store = /apps\.apple\.com/.test(u) ? 'app_store'
      : /play\.google\.com/.test(u) ? 'google_play'
      : /chromewebstore\.google\.com/.test(u) ? 'chrome_web_store'
      : /addons\.mozilla\.org/.test(u) ? 'firefox_addons' : null;
    if (!store) return;
    var g = window.__reisGuide || {};
    window.reisTrack('store_click', {
      store: store,
      page: location.pathname,
      guide_device: g.device || null,
      guide_option: g.option || null,
      guide_auto: !!g.auto
    });
  }, true);
})();
