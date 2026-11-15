// The homepage loops are rendered through React (support.js), which drops the
// `muted` attribute, and browsers only autoplay muted video. Mute each loop as
// it appears and start it. Anyone who asked for reduced motion gets the poster
// frame (the finished reIS cards) and no playback.
(function () {
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function prep(v) {
    if (v.__reisLoop) return;
    v.__reisLoop = true;
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    if (still) { v.removeAttribute('autoplay'); v.autoplay = false; v.pause(); return; }
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  function scan() { document.querySelectorAll('video').forEach(prep); }
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', scan);
  scan();
})();
