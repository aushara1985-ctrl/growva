// Lightweight event tracking: who did what, where they stopped. Sent to /api/event (our own D1).
(function () {
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var sid = store('rq_sid');
  if (!sid) { sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); store('rq_sid', sid); }
  var qp = new URLSearchParams(location.search);
  var ref = qp.get('ref') || store('rq_ref') || 'direct';
  if (qp.get('ref')) store('rq_ref', ref);
  var page = document.body ? (document.body.getAttribute('data-page') || location.pathname) : location.pathname;
  var q = [];
  function flush(beacon) {
    if (!q.length) return;
    var payload = JSON.stringify({ sid: sid, ref: ref, page: page, events: q.splice(0, 50) });
    try {
      if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/event', new Blob([payload], { type: 'text/plain' }));
      else fetch('/api/event', { method: 'POST', body: payload, keepalive: true, headers: { 'content-type': 'text/plain' } });
    } catch (e) {}
  }
  window.track = function (name, props) { q.push({ name: name, props: props || {}, ts: Date.now() }); if (q.length >= 10) flush(false); };
  window.RQ = { sid: sid, ref: ref };
  setInterval(function () { flush(false); }, 4000);
  addEventListener('pagehide', function () { track('page_leave', { secs: Math.round(performance.now() / 1000), last: window.__rqStep || '' }); flush(true); });
  addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { track('tab_hidden', { last: window.__rqStep || '' }); flush(true); } });
  addEventListener('error', function (e) { track('js_error', { msg: String(e.message || '').slice(0, 200), src: String(e.filename || '').slice(-60), line: e.lineno }); });
  addEventListener('unhandledrejection', function (e) { track('js_error', { msg: String((e.reason && e.reason.message) || e.reason || '').slice(0, 200) }); });
  track('page_view', { path: location.pathname, w: innerWidth, lang: navigator.language });
  document.addEventListener('DOMContentLoaded', function () {
    if (!('IntersectionObserver' in window)) return;
    var seen = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var id = en.target.getAttribute('data-sec');
        if (en.isIntersecting && !seen[id]) { seen[id] = 1; track('section_view', { s: id }); }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-sec]').forEach(function (el) { io.observe(el); });
    document.querySelectorAll('[data-cta]').forEach(function (el) {
      el.addEventListener('click', function () { track('cta_click', { c: el.getAttribute('data-cta') }); });
    });
  });
})();

// PostHog (EU) mirror: product analytics across all HQ products (Ali, 2026-11-22). Public project key.
(function () {
  var KEY = 'phc_pkKbUEZAdwEa5BMM2rmq7qn374XuyJgoyhZYDsXELzYt', HOST = 'https://eu.i.posthog.com', pending = [];
  var orig = window.track;
  window.track = function (name, props) {
    orig(name, props);
    if (window.posthog && window.posthog.__loaded) window.posthog.capture(name, Object.assign({ product: 'rafiq', ref: RQ.ref }, props || {}));
    else pending.push([name, props]);
  };
  var s = document.createElement('script');
  s.async = true; s.src = 'https://eu-assets.i.posthog.com/static/array.js';
  s.onload = function () {
    try {
      window.posthog.init(KEY, { api_host: HOST, person_profiles: 'identified_only', capture_pageview: true, autocapture: false,
        loaded: function (ph) { ph.identify(RQ.sid, { ref: RQ.ref }); ph.register({ product: 'rafiq', ref: RQ.ref });
          pending.splice(0).forEach(function (e) { ph.capture(e[0], Object.assign({ product: 'rafiq', ref: RQ.ref }, e[1] || {})); }); } });
    } catch (e) {}
  };
  document.head.appendChild(s);
})();
