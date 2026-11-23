/* Demo session. The server issues a sandbox session (HttpOnly cookie, 7 days, data under demo_*) and every /api call that touches data
   goes through it. Load this BEFORE any script that calls /api. A real clinic signs in through /api/auth/login instead and gets a clinic session. */
(function () {
  var OPEN = /^\/api\/(auth\/|event|lead)/, orig = window.fetch.bind(window), ready = null;
  function start() { return orig('/api/auth/demo', { method: 'POST', credentials: 'same-origin' }).then(function (r) { return r.ok; }).catch(function () { return false; }); }
  function ensure(force) { if (!ready || force) ready = start(); return ready; }
  window.RQ_SESSION = { ensure: ensure };
  window.fetch = function (input, init) {
    var u; try { u = new URL(typeof input === 'string' ? input : input.url, location.href); } catch (e) { return orig(input, init); }
    if (u.origin !== location.origin || u.pathname.indexOf('/api/') !== 0 || OPEN.test(u.pathname)) return orig(input, init);
    return ensure().then(function () {
      return orig(input, init).then(function (r) {
        if (r.status !== 401) return r;
        return ensure(true).then(function () { return orig(input, init); }); // expired or missing cookie: new demo session, retry once
      });
    });
  };
})();
