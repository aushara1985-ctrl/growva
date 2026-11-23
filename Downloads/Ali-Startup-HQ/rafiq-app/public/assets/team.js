/* فريق نجاحك: التنفيذ، التهيئة، التدريب، نجاح العميل، والمساعد «اسأل رفيق».
   Runs on top of the demo (window.RQD). Demo data only. */
(function () {
  var D = window.RQD; if (!D) return;
  var S = D.S, ar = D.ar, esc = D.esc, track = D.track, toast = D.toast, sar = D.sar;
  var $ = function (id) { return document.getElementById(id); };
  var SID = (D.RQ && D.RQ.sid) || 'anon';
  var DAY = 86400000;

  /* ---------- persisted team state (what the user actually did) ---------- */
  var T = { first: 0, imp: 0, rec: 0, inv: 0, rep: 0, sentLog: [], sum: null, tab: 'onb', invOpen: 0 };
  try { var sv = JSON.parse(localStorage.getItem('rq_cs') || 'null'); if (sv) for (var k in sv) T[k] = sv[k]; } catch (e) {}
  if (!T.first) T.first = Date.now();
  function saveT() { try { localStorage.setItem('rq_cs', JSON.stringify(T)); } catch (e) {} }
  saveT();

  /* imported demo patients come back from D1 for this demo session (deleted after 7 days) */
  fetch('/api/cs-import?rows=1&sid=' + encodeURIComponent(SID)).then(function (r) { return r.json(); }).then(function (j) { if (j && j.rows && j.rows.length) D.setImp(j.rows); }).catch(function () {});

  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j.__status = r.status; return j; });
    });
  }
  function nd(s) { return String(s == null ? '' : s).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x6F0; }); }

  /* =====================================================================
     Onboarding: every step is computed from the demo state
     ===================================================================== */
  function goalData() {
    return { importedRows: (S.imp && S.imp.length) || 0, summaryReady: T.sum ? T.sum.ready : null, flag: !!T.imp, visits: S.visits.length, recorded: !!T.rec,
      sent: S.sent || 0, sentLog: (T.sentLog || []).length, invited: !!T.inv && !!T.invAt, seenReport: !!T.rep };
  }
  /* HARNESS: a step is done only when RQG.goalCheck finds its goal in the data. A flag set earlier but contradicted by the data is shown as "not verified". */
  function steps() {
    var vis = S.visits.length, gd = goalData();
    var list = [
      { id: 'imp', t: 'ارفع مواعيد اليوم', why: 'عشان ما أحد من الاستقبال يكتب المرضى بيده.', detail: T.sum ? ar(T.sum.ready) + ' مريض انستوردوا (تجريبي)' : '', go: 'team.import', btn: 'ارفع الملف' },
      { id: 'rec', t: 'سجّل أول زيارة', why: 'تشوف كيف الكلام يصير ملف جاهز بدون كتابة.', go: 'doctor.home', btn: 'روح لعيادتي' },
      { id: 'apr', t: 'اعتمد الملف', why: 'الطبيب هو اللي يقرر، ولا شيء يدخل الملف قبل اعتماده.', detail: vis ? ar(vis) + ' ملف معتمد' : '', go: 'doctor.home', btn: 'روح لعيادتي' },
      { id: 'snd', t: 'أرسل أول متابعة', why: 'المريض اللي يتذكّره المجمع هو اللي يرجع.', detail: S.sent ? ar(S.sent) + ' رسالة انفتحت' : '', go: 'reception', btn: 'روح للاستقبال' },
      { id: 'inv', t: 'ادعُ الاستقبال', why: 'الاستقبال هو اللي يرسل المتابعات كل يوم.', action: 'invite', btn: 'جهّز الدعوة', detail: T.inv && T.invAt ? 'الدعوة انفتحت من جهازك (الديمو ما يقدر يعرف إذا الاستقبال دخل)' : '' },
      { id: 'rep', t: 'شوف أول تقرير', why: 'تشوف كم ريال رجع، وهذا اللي يبرر الاشتراك.', go: 'management', btn: 'افتح التقرير' }
    ];
    list.forEach(function (x) {
      var g = window.RQG ? window.RQG.goalCheck(x.id, gd) : { ok: false, why: 'فحص الأهداف ما تحمّل' };
      x.done = g.ok; x.unverified = !g.ok && !!({ imp: T.imp, inv: T.inv, rep: T.rep }[x.id]) ? g.why : '';
    });
    return list;
  }
  function progress() { var s = steps(); return { done: s.filter(function (x) { return x.done; }).length, total: s.length, s: s }; }
  function refresh() {
    var p = progress();
    document.querySelectorAll('[data-prog]').forEach(function (b) { b.textContent = ar(p.done) + '/' + ar(p.total); });
    if (S.role === 'team' && T.tab === 'onb') renderOnb();
  }

  /* ---------- navigation used by the assistant and by links ---------- */
  var NAV = {
    'doctor.home': function () { D.go('doc'); D.dtop('home'); },
    'doctor.fu': function () { D.go('doc'); D.dtop('fu'); },
    'doctor.nums': function () { D.go('doc'); D.dtop('nums'); },
    'reception': function () { D.go('rec'); },
    'management': function () { D.go('mgt'); },
    'team.onboarding': function () { T.tab = 'onb'; saveT(); D.go('team'); },
    'team.import': function () { T.tab = 'imp'; saveT(); D.go('team'); }
  };
  function nav(id) { if (NAV[id]) { NAV[id](); return true; } return false; }
  function screenId() {
    if (S.role === 'doc') return 'doctor.' + (S.dscr || 'home');
    if (S.role === 'rec') return 'reception';
    if (S.role === 'mgt') return 'management';
    return 'team.' + (T.tab === 'imp' ? 'import' : 'onboarding');
  }

  function renderTeam() {
    $('v-team').innerHTML =
      '<div class="ph"><div><span class="eyebrow">فريق نجاحك</span><h1>أول ٧ أيام معك</h1>' +
      '<p>مساعدين أذكياء، وفريقنا يراجع. ما فيهم أحد إنسان، وإذا احتجت إنسان اضغط «كلّم إنسان».</p></div>' +
      '<button class="btn ghost" type="button" data-human>كلّم إنسان</button></div>' +
      '<div class="cs-tabs" role="tablist"><button type="button" data-ct="onb" aria-pressed="' + (T.tab === 'onb') + '">التهيئة · قائمة أول ٧ أيام</button>' +
      '<button type="button" data-ct="imp" aria-pressed="' + (T.tab === 'imp') + '">التنفيذ · رفع المواعيد</button></div><div id="cs-body"></div>';
    document.querySelectorAll('[data-ct]').forEach(function (b) { b.onclick = function () { T.tab = b.getAttribute('data-ct'); saveT(); renderTeam(); track('cs_tab', { t: T.tab }); }; });
    document.querySelector('#v-team [data-human]').onclick = function () { openChat(true); };
    if (T.tab === 'imp') renderImport(); else renderOnb();
    window.__rqStep = 'team_' + T.tab;
  }

  function dayN() { return Math.min(7, Math.floor((Date.now() - T.first) / DAY) + 1); }
  function renderOnb() {
    var el = $('cs-body'); if (!el) return;
    var p = progress(), nextIdx = -1;
    p.s.forEach(function (x, i) { if (!x.done && nextIdx < 0) nextIdx = i; });
    el.innerHTML =
      '<div class="win"><div class="cs-prog"><span class="v">' + ar(p.done) + '<i>من ' + ar(p.total) + '</i></span>' +
      '<div><div class="bar"><i style="width:' + Math.round(p.done / p.total * 100) + '%"></i></div></div>' +
      '<small>اليوم ' + ar(dayN()) + ' من تجربتك (٧ أيام مجاناً). الخطوات تنحسب من اللي سويته فعلاً في الديمو، مو بتعليم يدوي.</small></div></div>' +
      '<div class="win" style="margin-top:14px">' + p.s.map(function (x, i) {
        var act = x.done ? '<span class="pill done">تم</span>' : '<button type="button" class="btn sm' + (i === nextIdx ? '' : ' ghost') + '" data-st="' + x.id + '">' + esc(x.btn) + '</button>';
        return '<div class="cs-st' + (x.done ? ' done' : (i === nextIdx ? ' next' : '')) + '"><span class="no">' + (x.done ? '✓' : ar(i + 1)) + '</span>' +
          '<div><b>' + esc(x.t) + '</b><small>' + esc(x.why) + (x.detail ? ' · ' + esc(x.detail) : '') + (x.unverified ? ' · <b>ما تحقق: ' + esc(x.unverified) + '</b>' : '') + '</small>' +
          '<div class="vid"><span class="pill soon">فيديو الأكاديمية: قريباً</span></div></div><span class="act">' + act + '</span>' +
          (x.id === 'inv' && T.invOpen && !x.done ? inviteBox() : '') + '</div>';
      }).join('') + '</div>' +
      '<p class="cs-note">هل علقت في خطوة؟ اضغط «اسأل رفيق» تحت، أو «كلّم إنسان».</p>';
    el.querySelectorAll('[data-st]').forEach(function (b) {
      b.onclick = function () {
        var s = p.s.filter(function (x) { return x.id === b.getAttribute('data-st'); })[0];
        track('onb_step_click', { s: s.id });
        if (s.action === 'invite') { T.invOpen = 1; saveT(); renderOnb(); } else nav(s.go);
      };
    });
    wireInvite();
  }
  function inviteBox() {
    var link = location.origin + '/demo#follow';
    return '<div class="cs-inv"><b>رابط دعوة الاستقبال</b><small style="display:block">في الحساب الفعلي ينفتح للاستقبال حساب باسمه. في الديمو الرابط يفتح شاشة الاستقبال مباشرة.</small>' +
      '<input id="invName" placeholder="اسم موظف الاستقبال (اختياري)" maxlength="40" aria-label="اسم موظف الاستقبال"><code id="invLink">' + esc(link) + '</code>' +
      '<div class="row" style="justify-content:flex-start"><button class="btn sm" type="button" id="invWa">أرسله من واتساب</button><button class="btn ghost sm" type="button" id="invCopy">انسخ الرابط</button></div></div>';
  }
  function wireInvite() {
    if (!$('invWa')) return;
    function done(how) { T.inv = 1; T.invAt = Date.now(); T.invOpen = 0; saveT(); track('invite_reception', { how: how }); toast('جاهزة الدعوة. انحسبت الخطوة'); refresh(); }
    $('invWa').onclick = function () {
      var n = ($('invName').value || '').trim();
      D.openWa('هلا' + (n ? ' ' + n : '') + '، ندعوك تدخل على رفيق من الاستقبال وتتابع المرضى: ' + $('invLink').textContent); done('wa');
    };
    $('invCopy').onclick = function () {
      var t = $('invLink').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { done('copy'); }, function () { toast('ما قدرنا ننسخ الرابط. انسخه بيدك من فوق، أو استخدم واتساب'); });
    };
  }

  /* =====================================================================
     التنفيذ: data import (file -> AI column mapping -> deterministic validation -> confirm)
     ===================================================================== */
  var I = { file: '', headers: [], rows: [], map: {}, merged: null, questions: [], answers: [], note: '', edits: {}, skip: {}, origFix: null, state: 'idle', err: '', total: 0, model: '' };
  var FIELDS = [['name', 'اسم المريض'], ['phone', 'الجوال'], ['date', 'تاريخ الموعد'], ['specialty', 'التخصص'], ['doctor', 'الطبيب']];

  /* --- parsing --- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '', best = ',', bc = -1;
    [',', ';', '\t', '|'].forEach(function (d) { var c = first.split(d).length; if (c > bc) { bc = c; best = d; } });
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === best) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  var xlsxP = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    if (xlsxP) return xlsxP;
    xlsxP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = res; s.onerror = function () { xlsxP = null; rej(new Error('xlsx_load')); }; document.head.appendChild(s);
    });
    return xlsxP;
  }
  function readFile(file) {
    var name = file.name || 'file', ext = (name.split('.').pop() || '').toLowerCase();
    if (file.size > 6 * 1024 * 1024) return Promise.reject(new Error('too_big'));
    if (ext === 'xlsx' || ext === 'xls') {
      return Promise.all([loadXlsx(), file.arrayBuffer()]).then(function (a) {
        var wb = window.XLSX.read(a[1], { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
      });
    }
    return file.arrayBuffer().then(function (ab) {
      var t = new TextDecoder('utf-8').decode(ab);
      if (t.indexOf('�') > -1) { try { t = new TextDecoder('windows-1256').decode(ab); } catch (e) {} }
      return parseCSV(t);
    });
  }

  /* --- cleaning helpers --- */
  function normPhone(s) {
    var t = nd(s).replace(/[^\d+]/g, '').replace(/\+/g, '');
    if (t.indexOf('00966') === 0) t = t.slice(5); else if (t.indexOf('966') === 0) t = t.slice(3);
    if (/^05\d{8}$/.test(t)) return t;
    if (/^5\d{8}$/.test(t)) return '0' + t;
    return null;
  }
  function firstPhone(text) {
    var t = nd(text), re = /(?:\+|00)?\d[\d\s\-.]{7,17}\d/g, m;
    while ((m = re.exec(t))) {
      var p = normPhone(m[0]); if (p) return { phone: p, raw: m[0] };
      // the run may start with stray digits (e.g. "15 - 0551234567"): try the tail tokens, never a digit substring
      var tk = m[0].split(/[\s\-.]+/).filter(Boolean);
      for (var k = 1; k < tk.length; k++) { var q = normPhone(tk.slice(k).join('')); if (q) return { phone: q, raw: tk.slice(k).join(' ') }; }
    }
    return null;
  }
  function splitMerged(text) {
    var t = String(text || ''), f = firstPhone(t);
    if (!f) { var digits = nd(t).replace(/[^\d]/g, ''); var name0 = t.replace(/[\d٠-٩\s\-+.\/،,:|()]+$/g, '').trim(); return { name: name0, phone: digits ? digits : '' }; }
    var nm = nd(t).replace(f.raw, ' ');
    nm = nm.replace(/(جوال|موبايل|هاتف|رقم|tel|mobile)\s*[:：]?/gi, ' ').replace(/[\-\/|،,:()]+/g, ' ').replace(/\s+/g, ' ').trim();
    var orig = t; // keep Arabic letters as typed: rebuild the name from the original text minus every digit run
    nm = orig.replace(/[+\d٠-٩۰-۹][\d٠-٩۰-۹\s\-.]*/g, ' ').replace(/(جوال|موبايل|هاتف|رقم)\s*[:：]?/g, ' ').replace(/[\-\/|،,:()]+/g, ' ').replace(/\s+/g, ' ').trim();
    return { name: nm, phone: f.phone };
  }
  var HM = [['محرم', 1], ['صفر', 2], ['ربيع الاول', 3], ['ربيع الثاني', 4], ['ربيع الاخر', 4], ['جمادي الاولي', 5], ['جمادي الاول', 5], ['جمادي الاخره', 6], ['جمادي الثانيه', 6], ['جمادي الاخر', 6], ['رجب', 7], ['شعبان', 8], ['رمضان', 9], ['شوال', 10], ['ذو القعده', 11], ['ذي القعده', 11], ['ذو الحجه', 12], ['ذي الحجه', 12]];
  var GM = [['يناير', 1], ['فبراير', 2], ['مارس', 3], ['ابريل', 4], ['مايو', 5], ['يونيو', 6], ['يوليو', 7], ['اغسطس', 8], ['سبتمبر', 9], ['اكتوبر', 10], ['نوفمبر', 11], ['ديسمبر', 12]];
  function an(s) { return String(s).replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim(); }
  function monthByName(name) {
    var n = an(name);
    for (var i = 0; i < HM.length; i++) if (n === HM[i][0] || n.indexOf(HM[i][0]) === 0) return { m: HM[i][1], h: 1 };
    for (var j = 0; j < GM.length; j++) if (n === GM[j][0]) return { m: GM[j][1], h: 0 };
    return null;
  }
  var UQ = null;
  function uq(t) {
    try { UQ = UQ || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' }); } catch (e) { return null; }
    var p = UQ.formatToParts(t), o = {}; p.forEach(function (x) { o[x.type] = parseInt(x.value, 10); }); return o;
  }
  function h2g(y, m, d) {
    var jd = Math.floor((11 * y + 3) / 30) + 354 * y + 30 * m - Math.floor((m - 1) / 2) + d + 1948440 - 385;
    var l = jd + 68569, n = Math.floor(4 * l / 146097); l = l - Math.floor((146097 * n + 3) / 4);
    var i = Math.floor(4000 * (l + 1) / 1461001); l = l - Math.floor(1461 * i / 4) + 31;
    var j = Math.floor(80 * l / 2447), dd = l - Math.floor(2447 * j / 80); l = Math.floor(j / 11);
    var mm = j + 2 - 12 * l, yy = 100 * (n - 49) + i + l, base = Date.UTC(yy, mm - 1, dd);
    for (var k = -3; k <= 3; k++) { var t = new Date(base + k * DAY), p = uq(t); if (p && p.year === y && p.month === m && p.day === d) return t; }
    return new Date(base); // tabular fallback (can differ by a day from the Umm al-Qura calendar)
  }
  function iso(t) { return t.getUTCFullYear() + '-' + ('0' + (t.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + t.getUTCDate()).slice(-2); }
  function parseDate(s) {
    var t = nd(s).replace(/(\d)\s*[هم](?=\s|$)/g, '$1').replace(/هـ|هجري|ميلادي|AH|CE/gi, ' ').replace(/(^|\s)[هم](?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    var y, m, d, h = false, mt;
    if ((mt = t.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/))) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
    else if ((mt = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/))) { y = +mt[3]; d = +mt[1]; m = +mt[2]; if (m > 12 && d <= 12) { var x = d; d = m; m = x; } }
    else if ((mt = t.match(/^(\d{1,2})\s+([^\d\s\/\-.]+(?:\s+[^\d\s\/\-.]+)?)\s+(\d{4})/))) {
      var mo = monthByName(mt[2]); if (!mo) return null; d = +mt[1]; m = mo.m; y = +mt[3];
    } else return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    if (y >= 1300 && y <= 1500) {
      if (d > 30) return null;
      var g = h2g(y, m, d); if (isNaN(g.getTime())) return null; return { iso: iso(g), hijri: true };
    }
    if (y >= 1900 && y <= 2100) {
      var dt = new Date(Date.UTC(y, m - 1, d)); if (dt.getUTCMonth() !== m - 1) return null; return { iso: iso(dt), hijri: false };
    }
    return null;
  }

  /* --- validation: this is plain code, so the numbers in the report are always exact --- */
  function colVal(r, i) { return i == null || i < 0 || r[i] == null ? '' : String(r[i]).trim(); }
  function validate() {
    var m = I.map, merged = (m.name != null && m.name === m.phone) ? m.name : null, seen = {}, out = [];
    I.rows.forEach(function (r, ix) {
      var e = I.edits[ix] || {}, name, pr;
      if (merged != null) { var sp = splitMerged(colVal(r, merged)); name = sp.name; pr = sp.phone; }
      else { name = colVal(r, m.name); pr = colVal(r, m.phone); }
      var au = (I.auto && I.auto[ix]) || {};
      if (au.n != null) name = au.n; if (au.p != null) pr = au.p;
      if (e.n != null) name = e.n; if (e.p != null) pr = e.p;
      var dr = e.d != null ? e.d : (au.d != null ? au.d : colVal(r, m.date));
      var o = { ix: ix, name: String(name).replace(/\s+/g, ' ').trim(), phoneRaw: pr, phone: null, dateRaw: dr, date: '', hijri: false, sp: colVal(r, m.specialty), dr: colVal(r, m.doctor), why: [], status: 'ready' };
      var f = firstPhone(pr) || (normPhone(pr) ? { phone: normPhone(pr) } : null);
      o.phone = f ? f.phone : null;
      if (!o.phone) o.why.push('phone');
      if (o.name.length < 2 || /^[\d\s\-+.]+$/.test(o.name)) o.why.push('name');
      if (m.date != null) {
        var pd = dr ? parseDate(dr) : null;
        if (pd) { o.date = pd.iso; o.hijri = pd.hijri; } else o.why.push('date');
      }
      if (I.skip[ix]) o.status = 'skip';
      else if (o.why.length) o.status = 'fix';
      else {
        var key = o.phone + '|' + o.date;
        if (seen[key] != null) { o.status = 'dup'; o.dupOf = seen[key]; } else seen[key] = ix;
      }
      out.push(o);
    });
    I.parsed = out;
    if (!I.origFix) { I.origFix = {}; out.forEach(function (o) { if (o.status === 'fix') I.origFix[o.ix] = 1; }); }
    return out;
  }
  /* HARNESS: validate, then auto-fix obvious issues (a phone sitting in another cell, a date in another cell or with a 2-digit year,
     digits stuck in a name) and re-validate. Max 3 rounds. Anything still wrong stays in the "fix" list for the clinic: never dropped. */
  function harden() {
    I.auto = {}; I.autoRounds = 0; validate();
    for (var round = 1; round <= 3; round++) {
      var changed = 0, m = I.map;
      I.parsed.filter(function (o) { return o.status === 'fix'; }).forEach(function (o) {
        var r = I.rows[o.ix], a = I.auto[o.ix] = I.auto[o.ix] || {}, used = {};
        used[m.name] = used[m.phone] = used[m.date] = 1;
        if (o.why.indexOf('phone') > -1 && round === 1) {
          for (var c = 0; c < r.length; c++) { if (used[c]) continue; var f = firstPhone(r[c]); if (f) { a.p = f.phone; changed++; break; } }
        }
        if (o.why.indexOf('date') > -1) {
          if (round === 1) { for (var c2 = 0; c2 < r.length; c2++) { if (used[c2] || firstPhone(r[c2])) continue; if (parseDate(r[c2])) { a.d = r[c2]; changed++; break; } } }
          if (round === 2) { var mt = nd(o.dateRaw).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/); if (mt) { a.d = mt[1] + '/' + mt[2] + '/20' + mt[3]; changed++; } }
        }
        if (o.why.indexOf('name') > -1 && round === 3) { var nn = String(o.name).replace(/[\d٠-٩۰-۹\-+.()\/]+/g, ' ').replace(/\s+/g, ' ').trim(); if (nn.length >= 2 && nn !== o.name) { a.n = nn; changed++; } }
      });
      if (!changed) { if (round >= 3) break; continue; }
      I.autoRounds = round; validate();
      if (!I.parsed.some(function (o) { return o.status === 'fix'; })) break;
    }
    return I.parsed;
  }
  function counts() {
    var c = { ready: 0, fix: 0, dup: 0, skip: 0, fixed: 0, hijri: 0, auto: 0 };
    (I.parsed || []).forEach(function (o) { c[o.status]++; if (o.status === 'ready' && I.origFix && I.origFix[o.ix]) c.fixed++; if (o.status === 'ready' && I.auto && I.auto[o.ix] && !(I.edits[o.ix])) c.auto++; if (o.status === 'ready' && o.hijri) c.hijri++; });
    return c;
  }
  var WHY = { name: 'الاسم ناقص', phone: 'الجوال مو صحيح', date: 'التاريخ ما انفهم' };

  /* --- AI mapping --- */
  function sampleRows() { return I.rows.slice(0, 5); }
  function askMap(hint, answers) {
    I.state = 'mapping'; I.err = ''; renderImport();
    return post('/api/cs-map', { sid: SID, headers: I.headers, rows: sampleRows(), total: I.total, hint: hint || '', answers: answers || [] }).then(function (j) {
      if (j.__status === 429) { I.state = 'error'; I.err = j.reply || 'وصلت الحد المسموح لهالساعة.'; return renderImport(); }
      if (!j.mapping) { I.state = 'manual'; I.err = 'ما قدر المساعد يقرأ الأعمدة هالمرة. اختر الأعمدة بنفسك من القوائم تحت، أو كلّم إنسان.'; track('map_fail'); return renderImport(); }
      I.map = j.mapping; I.merged = j.name_phone_merged; I.note = j.notes_ar || ''; I.model = j.model || '';
      if (I.merged != null) { I.map.name = I.merged; I.map.phone = I.merged; }
      I.questions = (j.questions || []).filter(function (q) { return q.col != null; });
      sanity(j.confidence || {});
      ((j.check && j.check.issues) || []).forEach(function (w) { I.warn.push('فحص الربط: ' + w + '. راجع القوائم تحت.'); });
      I.state = 'review'; harden(); track('map_ok', { ms: j.ms, q: I.questions.length, merged: I.merged != null }); renderImport();
    }).catch(function () { I.state = 'manual'; I.err = 'ما وصلت لرفيق. تأكد من النت، أو اختر الأعمدة بنفسك.'; renderImport(); });
  }
  /* The AI may be wrong. We test its proposal against all rows, and ask instead of guessing. */
  function sanity(conf) {
    I.warn = [];
    var rows = I.rows, n = rows.length || 1;
    function fit(col, f) { var ok = 0; rows.forEach(function (r) { if (f(colVal(r, col))) ok++; }); return ok / n; }
    function nm(c) { return '«' + (I.headers[c] || 'عمود ' + (c + 1)) + '»'; }
    if (I.map.phone != null && I.map.phone !== I.map.name && fit(I.map.phone, function (v) { return !!firstPhone(v) || !!normPhone(v); }) < 0.5)
      I.questions.push({ field: 'phone', col: I.map.phone, text_ar: 'العمود ' + nm(I.map.phone) + ' أغلبه مو أرقام جوال. هو فعلاً الجوال؟' });
    if (I.map.date != null && fit(I.map.date, function (v) { return !!parseDate(v); }) < 0.5)
      I.questions.push({ field: 'date', col: I.map.date, text_ar: 'العمود ' + nm(I.map.date) + ' أغلبه مو تواريخ أفهمها. هو فعلاً تاريخ الموعد؟' });
    if (I.map.phone == null) I.warn.push('ما لقيت عمود الجوال. اختره من القائمة تحت.');
    if (I.map.name == null) I.warn.push('ما لقيت عمود الاسم. اختره من القائمة تحت.');
    var seen = {}; I.questions = I.questions.filter(function (q) { var k = q.field + q.col; if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function answerQ(i, yes) {
    var q = I.questions[i]; if (!q) return;
    I.answers.push({ field: q.field, col: q.col, yes: yes }); I.questions.splice(i, 1);
    track('map_answer', { f: q.field, yes: yes });
    if (yes) { I.map[q.field] = q.col; harden(); renderImport(); }
    else { I.map[q.field] = null; askMap('', I.answers); }
  }
  function rerun(hint) {
    if (!I.file) return false;
    askMap(hint || '', I.answers); return true;
  }

  function loadRows(rows, fname) {
    var rawN = rows.length;
    rows = rows.filter(function (r) { return r && r.some(function (c) { return String(c == null ? '' : c).trim() !== ''; }); });
    var blank = rawN - rows.length;
    if (rows.length < 2) { I.state = 'error'; I.err = 'الملف فاضي أو فيه سطر واحد. جرّب ملف ثاني.'; return renderImport(); }
    var hasHeader = !rows[0].some(function (c) { return !!firstPhone(c) || !!parseDate(c); });
    var width = Math.min(40, Math.max.apply(null, rows.slice(0, 50).map(function (r) { return r.length; })));
    I = { file: fname, headers: [], rows: [], map: {}, merged: null, questions: [], answers: [], note: '', edits: {}, skip: {}, origFix: null, state: 'mapping', err: '', total: 0, model: '', warn: [] };
    for (var c = 0; c < width; c++) I.headers.push(hasHeader ? String(rows[0][c] == null ? '' : rows[0][c]).trim() : 'عمود ' + (c + 1));
    I.rows = (hasHeader ? rows.slice(1) : rows).slice(0, 5000).map(function (r) { var o = []; for (var c = 0; c < width; c++) o.push(r[c] == null ? '' : String(r[c])); return o; });
    I.total = I.rows.length; I.blank = blank; I.cut = Math.max(0, (hasHeader ? rows.length - 1 : rows.length) - 5000);
    track('import_file', { rows: I.total, cols: width, header: hasHeader });
    askMap('', []);
  }
  function handleFile(file) {
    if (!file) return;
    I.state = 'reading'; I.file = file.name; renderImport();
    readFile(file).then(function (rows) { loadRows(rows, file.name); }).catch(function (e) {
      I.state = 'error'; I.err = String(e && e.message) === 'too_big' ? 'الملف كبير (أكثر من ٦ ميغا). جرّب ملف أصغر.' : 'ما قدرت أقرأ الملف. جرّب Excel أو CSV، أو كلّم إنسان.'; renderImport();
    });
  }

  /* --- sample messy file so a clinic can try without its own file --- */
  function messyCSV() {
    var today = new Date(), hp = uq(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))) || { year: 1448, month: 6, day: 10 };
    var HN = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
    var names = ['نورة العتيبي', 'خالد القحطاني', 'سارة الدوسري', 'فهد الشمري', 'ريم الحربي', 'عبدالله الغامدي', 'هند الزهراني', 'ماجد السبيعي', 'لمى العنزي', 'تركي المطيري', 'منيرة الشهري', 'بدر الرشيدي'];
    var sp = ['أسنان', 'نساء وولادة', 'جلدية', 'عظام', 'أطفال', 'علاج طبيعي'], dr = ['د. ماجد', 'د. هند', 'د. لمى', 'د. تركي', 'د. أمل', 'أ. ريما'];
    var gd = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
    var rows = [['م', 'المريض / الجوال', 'موعد الزيارة', 'القسم', 'الطبيب', 'ملاحظات']];
    for (var i = 0; i < 24; i++) {
      var nm = names[i % names.length], tail = String(1000000 + i * 7919).slice(-7), ph;
      var fm = i % 5; ph = fm === 0 ? '05' + '5' + tail : fm === 1 ? '+9665' + '0' + tail : fm === 2 ? '966 5' + '3 ' + tail.slice(0, 3) + ' ' + tail.slice(3) : fm === 3 ? '٠٥٦' + tail.replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) : '5' + '4' + tail;
      var dt = i % 3 === 0 ? hp.day + ' ' + HN[hp.month - 1] + ' ' + hp.year : (i % 3 === 1 ? hp.year + '/' + hp.month + '/' + hp.day : gd);
      rows.push([i + 1, nm + ' - ' + ph, dt, sp[i % 6], dr[i % 6], i % 4 === 0 ? 'أول زيارة' : '']);
    }
    rows.push([25, 'نورة العتيبي - 0550000000', gd, 'أسنان', 'د. ماجد', 'مكرر']);          // duplicate of row 1 (same phone, same day)
    rows.push([26, 'فهد الشمري - 05012', gd, 'عظام', 'د. تركي', '']);                       // short phone
    rows.push([27, '0531234567', gd, 'جلدية', 'د. لمى', '']);                                  // no name
    rows.push([28, 'سلطان الحمدان - 0597654321', '31/02/2026', 'أطفال', 'د. أمل', '']);       // impossible date
    rows[1][1] = 'نورة العتيبي - 0550000000'; rows[1][2] = gd;
    return rows;
  }
  function downloadSample() {
    var rows = messyCSV();
    var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'rafiq-sample-messy.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* --- render --- */
  function colOpts(sel) {
    return '<option value="">— ما فيه —</option>' + I.headers.map(function (h, i) { return '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + ar(i + 1) + ' · ' + esc(h || 'بدون عنوان') + '</option>'; }).join('');
  }
  function renderImport() {
    var el = $('cs-body'); if (!el || S.role !== 'team' || T.tab !== 'imp') return;
    var h = '<div class="win"><div class="win-h"><div class="who-p"><b>ارفع مواعيد اليوم أو قائمة المرضى</b><small>Excel (xlsx) أو CSV. رفيق يقترح الأعمدة، وأنت تأكد، وما ينستورد شي قبل اعتمادك.</small></div><span class="cs-ai">مساعد ذكي</span></div><div class="win-b">';
    h += '<div class="cs-drop" id="csDrop"><b>اسحب الملف هنا أو اخترته</b><div class="row"><label class="btn" for="csFile" style="cursor:pointer">اختر ملف</label>' +
      '<button class="btn ghost" type="button" id="csSample">جرّب بملف مثال فوضوي</button><button class="lnkb" type="button" id="csDl">نزّل الملف المثال</button></div>' +
      '<input class="cs-file" id="csFile" type="file" accept=".xlsx,.xls,.csv,.tsv,.txt"><p>بيانات خيالية بس. لا ترفع بيانات مرضى حقيقيين في الديمو. الديمو يشتغل على خوادم Cloudflare للتجربة فقط، وكل شي يتحذف بعد ٧ أيام.</p></div>';
    if (I.state === 'reading') h += '<div class="cs-wait"><span class="dot"></span>يقرأ الملف…</div>';
    if (I.state === 'mapping') h += '<div class="cs-wait"><span class="dot"></span>رفيق يقرأ الأعمدة وعينة من الصفوف…</div>';
    if (I.err) h += '<div class="err" role="alert">' + esc(I.err) + '</div>';
    h += '</div></div>';
    if (I.file && (I.state === 'review' || I.state === 'manual' || I.state === 'done')) h += importReview();
    el.innerHTML = h;
    wireImport();
  }
  function importReview() {
    var c = counts(), done = I.state === 'done', h = '';
    h += '<div class="win" style="margin-top:16px"><div class="win-h"><div class="who-p"><b>١. ربط الأعمدة</b><small>' + esc(I.file) + ' · ' + ar(I.total) + ' صف' + '</small></div>' + (I.model ? '<span class="cs-ai">اقتراح الذكاء الاصطناعي</span>' : '') + '</div><div class="win-b">';
    if (I.note) h += '<p class="cs-note" style="margin:0 0 10px">' + esc(I.note) + '</p>';
    I.questions.forEach(function (q, i) {
      h += '<div class="cs-q"><b>' + esc(q.text_ar) + '</b><div class="row"><button class="btn sm" type="button" data-qa="' + i + '" data-y="1">إي، صح</button><button class="btn ghost sm" type="button" data-qa="' + i + '" data-y="0">لا، غيره</button></div></div>';
    });
    (I.warn || []).forEach(function (w) { h += '<div class="err soft" style="margin:0 0 10px">' + esc(w) + '</div>'; });
    h += '<div class="cs-map" style="margin-top:12px">' + FIELDS.map(function (f) {
      var c0 = I.map[f[0]], smp = '';
      if (c0 != null) for (var i = 0; i < I.rows.length && i < 20; i++) { var v = colVal(I.rows[i], c0); if (v) { smp = v; break; } }
      return '<span>' + f[1] + '</span><select data-map="' + f[0] + '" aria-label="' + f[1] + '"' + (done ? ' disabled' : '') + '>' + colOpts(c0 == null ? null : c0) + '</select><span class="smp">' + (smp ? 'مثال: ' + esc(smp) : '') + '</span>';
    }).join('') + '</div>';
    if (I.map.name != null && I.map.name === I.map.phone) h += '<p class="cs-note">الاسم والجوال في نفس العمود، ورفيق يفصلهم.</p>';
    h += '<div class="row" style="justify-content:flex-start"><button class="btn ghost sm" type="button" id="csRerun">أعد قراءة الأعمدة</button></div>';
    h += '</div></div>';
    h += '<div class="win" style="margin-top:16px"><div class="win-h"><div class="who-p"><b>٢. تقرير الفحص</b><small>يتحسب من كل الصفوف، مو من العينة بس</small></div></div><div class="win-b">';
    h += '<p class="sh3" style="margin:0 0 4px;font-size:25px">' + ar(c.ready) + ' مريض جاهزين، ' + ar(c.fix) + ' يحتاجون تصحيح' + '</p>';
    h += '<div class="cs-rep"><div class="ok"><small>جاهزين</small><b>' + ar(c.ready) + '</b></div><div class="bad"><small>يحتاجون تصحيح</small><b>' + ar(c.fix) + '</b></div><div><small>مكررين انشالوا</small><b>' + ar(c.dup) + '</b></div></div>';
    var extra = [];
    if (c.hijri) extra.push(ar(c.hijri) + ' موعد بالتاريخ الهجري تحوّل لميلادي');
    if (c.fixed) extra.push(ar(c.fixed) + ' انصلحوا بتصحيحك');
    if (c.skip) extra.push(ar(c.skip) + ' تجاهلتهم');
    if (I.map.date != null) extra.push('التواريخ بصيغة يوم/شهر/سنة، والهجري يتحوّل حسب تقويم أم القرى');
    if (c.auto) extra.push(ar(c.auto) + ' انصلحوا تلقائياً (جوال أو تاريخ أو اسم) بعد ' + ar(I.autoRounds) + ' جولة فحص');
    if (extra.length) h += '<p class="cs-note">' + extra.map(esc).join(' · ') + '</p>';
    /* HARNESS preview: required columns, row-count reconciliation, and everything that will NOT be imported, stated before the clinic confirms */
    var tot = c.ready + c.fix + c.dup + c.skip, chk = [];
    chk.push([I.map.name != null && I.map.phone != null, 'الأعمدة المطلوبة (الاسم والجوال) مربوطة']);
    chk.push([tot === I.total, 'عدد الصفوف يتطابق: ' + ar(I.total) + ' في الملف = ' + ar(c.ready) + ' جاهز + ' + ar(c.fix) + ' تصحيح + ' + ar(c.dup) + ' مكرر + ' + ar(c.skip) + ' تجاهلتهم']);
    chk.push([!c.fix, c.fix ? ar(c.fix) + ' صف جواله أو تاريخه أو اسمه ما انفهم: صحّحه تحت أو تجاهله، وما ينستورد لين يتصحح' : 'كل الصفوف الباقية جوالها سعودي صحيح وتواريخها تنقرأ']);
    if (I.blank) chk.push([false, ar(I.blank) + ' صف فاضي انشال من الملف (ما فيه بيانات)']);
    if (I.cut) chk.push([false, 'الملف أكبر من ٥٠٠٠ صف: ما قرأنا آخر ' + ar(I.cut) + ' صف. قسّم الملف واستورد الباقي']);
    if (c.ready > 2000) chk.push([false, 'الديمو يحفظ ٢٠٠٠ جاهز في المرة: آخر ' + ar(c.ready - 2000) + ' ما ينحفظون']);
    h += '<ul class="cs-note" style="list-style:none;padding:0;margin:8px 0">' + chk.map(function (x) { return '<li>' + (x[0] ? '✓ ' : '⚠ ') + esc(x[1]) + '</li>'; }).join('') + '</ul>';
    var fix = I.parsed.filter(function (o) { return o.status === 'fix'; });
    if (fix.length && !done) {
      h += '<h3 class="sh3" style="font-size:21px;margin:18px 0 0">صحّح هنا</h3>';
      fix.slice(0, 40).forEach(function (o) {
        h += '<div class="cs-fx"><span class="rn">صف ' + ar(o.ix + 2) + '</span>' +
          '<input data-fx="n" data-ix="' + o.ix + '" value="' + esc(o.name) + '" placeholder="الاسم" aria-label="الاسم"' + (o.why.indexOf('name') > -1 ? ' class="bad"' : '') + '>' +
          '<input data-fx="p" data-ix="' + o.ix + '" value="' + esc(o.phoneRaw) + '" placeholder="الجوال" inputmode="tel" aria-label="الجوال"' + (o.why.indexOf('phone') > -1 ? ' class="bad"' : '') + '>' +
          (I.map.date != null ? '<input data-fx="d" data-ix="' + o.ix + '" value="' + esc(o.dateRaw) + '" placeholder="التاريخ" aria-label="التاريخ"' + (o.why.indexOf('date') > -1 ? ' class="bad"' : '') + '>' : '<span></span>') +
          '<button class="lnkb" type="button" data-skip="' + o.ix + '">تجاهل</button><span class="why">' + o.why.map(function (w) { return WHY[w]; }).join(' · ') + '</span></div>';
      });
      if (fix.length > 40) h += '<p class="cs-note">عرضت أول ٤٠ من ' + ar(fix.length) + '. صحّح وبتنزل الباقي.</p>';
    }
    var rd = I.parsed.filter(function (o) { return o.status === 'ready'; }).slice(0, 5);
    if (rd.length) {
      h += '<h3 class="sh3" style="font-size:21px;margin:18px 0 6px">معاينة الجاهزين</h3><table class="cs-prev"><thead><tr><th>الاسم</th><th>الجوال</th><th>الموعد</th></tr></thead><tbody>' +
        rd.map(function (o) { return '<tr><td>' + esc(o.name) + '</td><td class="ltr">' + esc(o.phone) + '</td><td class="ltr">' + esc(o.date || '—') + (o.hijri ? ' <small>(من هجري)</small>' : '') + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    h += '</div></div>';
    h += '<div class="win" style="margin-top:16px"><div class="win-h"><div class="who-p"><b>٣. الاعتماد</b><small>لين تضغط، ما ينحفظ شي</small></div></div><div class="win-b">';
    if (done && I.report) h += '<p class="cs-note">' + (I.report.ok ? '✓ تحقق بعد الاستيراد: المحفوظ ' + ar(I.report.stored) + ' = الجاهز من الملف ' + ar(I.report.expected) + '.' : '⚠ فرق في العدد: المتوقع ' + ar(I.report.expected) + ' والمحفوظ ' + ar(I.report.stored) + '.') + (I.report.rejected ? ' ' + ar(I.report.rejected) + ' صف رفضها الفحص النهائي وما انحفظت: ' + esc(I.report.why) : '') + (I.report.omitted ? ' ' + ar(I.report.omitted) + ' صف فوق الحد ما انحفظت.' : '') + '</p>';
    if (done) h += '<p class="never" style="font-size:20px">أضفنا ' + ar(T.sum && T.sum.appts || 0) + ' موعد لجدول اليوم و' + ar(T.sum && T.sum.fu || 0) + ' مريض لقائمة المتابعة. الجدول في «عيادتي اليوم» والمتابعات في «متابعاتي» (تجريبي). انحسبت الخطوة الأولى في قائمة التهيئة.</p><div class="row" style="justify-content:flex-start"><button class="btn" type="button" id="csToOnb">شوف قائمة التهيئة</button></div>';
    else h += '<button class="btn" type="button" id="csConfirm"' + (c.ready ? '' : ' disabled') + '>اعتمد استيراد ' + ar(c.ready) + ' مريض</button><p class="cs-note">اللي يحتاج تصحيح أو المكرر ما ينستورد. بيانات تجريبية بس. اللي موعده اليوم أو بعده ينزل في جدول «عيادتي اليوم»، والباقي في «متابعاتي». تنحفظ لجلستك وتنحذف بعد ٧ أيام.</p>';
    h += '</div></div>';
    return h;
  }
  function wireImport() {
    var f = $('csFile'); if (!f) return;
    f.onchange = function () { track('import_pick'); handleFile(f.files[0]); };
    var dz = $('csDrop');
    ['dragover', 'dragenter'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop', function (e) { var fl = e.dataTransfer && e.dataTransfer.files[0]; if (fl) { track('import_drop'); handleFile(fl); } });
    $('csSample').onclick = function () { track('import_sample'); loadRows(messyCSV(), 'rafiq-sample-messy.csv'); };
    $('csDl').onclick = function () { downloadSample(); };
    if (!$('csRerun')) return;
    $('csRerun').onclick = function () { track('map_rerun', { via: 'button' }); rerun(''); };
    document.querySelectorAll('[data-qa]').forEach(function (b) { b.onclick = function () { answerQ(+b.getAttribute('data-qa'), b.getAttribute('data-y') === '1'); }; });
    document.querySelectorAll('[data-map]').forEach(function (s) {
      s.onchange = function () {
        var v = s.value === '' ? null : +s.value; I.map[s.getAttribute('data-map')] = v;
        if (I.map.phone == null) I.warn = ['اختر عمود الجوال.']; else I.warn = [];
        harden(); I.state = 'review'; track('map_manual', { f: s.getAttribute('data-map') }); renderImport();
      };
    });
    document.querySelectorAll('[data-fx]').forEach(function (inp) {
      inp.onchange = function () { var ix = +inp.getAttribute('data-ix'); (I.edits[ix] = I.edits[ix] || {})[inp.getAttribute('data-fx')] = inp.value; validate(); track('import_fix', { f: inp.getAttribute('data-fx') }); renderImport(); };
    });
    document.querySelectorAll('[data-skip]').forEach(function (b) { b.onclick = function () { I.skip[+b.getAttribute('data-skip')] = true; validate(); renderImport(); }; });
    if ($('csConfirm')) $('csConfirm').onclick = confirmImport;
    if ($('csToOnb')) $('csToOnb').onclick = function () { T.tab = 'onb'; saveT(); renderTeam(); };
  }
  function confirmImport() {
    var c = counts(), all = I.parsed.filter(function (o) { return o.status === 'ready'; }).map(function (o) { return { n: o.name, p: o.phone, d: o.date, s: o.sp, dr: o.dr }; });
    var rows = all.slice(0, 2000), omitted = all.length - rows.length;
    var b = $('csConfirm'); b.disabled = true; b.textContent = 'يحفظ ويتحقق…';
    post('/api/cs-import', { sid: SID, filename: I.file, rows: rows, ready: c.ready, fixed: c.fixed, dup: c.dup, mapping: I.map, omitted: omitted }).then(function (j) {
      b.disabled = false; b.textContent = 'اعتمد استيراد ' + ar(c.ready) + ' مريض';
      if (j.error === 'too_many_rows') { I.err = j.reply || 'الملف أكبر من الحد.'; return renderImport(); }
      if (j.error === 'no_valid_rows') { I.err = 'الفحص النهائي رفض كل الصفوف (' + ar(j.rejected) + ' صف). ما انحفظ شيء. راجع الجوال والاسم.'; return renderImport(); }
      if (!j.id) { I.err = 'ما انحفظ الاستيراد. جرّب مرة ثانية أو كلّم إنسان.'; return renderImport(); }
      /* HARNESS: after import, the stored count must equal the valid source rows. A mismatch is reported, the step is NOT counted, nothing is hidden. */
      var stored = (j.accepted || []).length, expected = rows.length;
      I.report = { ok: !j.mismatch && stored === expected, stored: j.stored, expected: expected, rejected: j.rejected || 0, omitted: omitted, why: 'الجوال أو الاسم أو التاريخ ما نجح في الفحص' };
      if (j.mismatch) { I.err = 'فرق في العدد بعد الحفظ: المتوقع ' + ar(j.expected) + ' والمحفوظ ' + ar(j.stored) + '. ما حسبنا الخطوة. جرّب مرة ثانية أو كلّم إنسان.'; track('import_mismatch', { exp: j.expected, got: j.stored }); return renderImport(); }
      D.setImp(j.accepted); var sp = D.impSplit(); var na = 0; for (var k in sp.appts) na += sp.appts[k].length; var nf = sp.fu.length;
      T.imp = 1; T.sum = { ready: stored, fixed: c.fixed, dup: c.dup, file: I.file, at: Date.now(), appts: na, fu: nf }; saveT();
      I.state = 'done'; track('import_confirm', { ready: stored, fix: c.fix, dup: c.dup, fixed: c.fixed, rej: j.rejected || 0 }); toast('أضفنا ' + ar(na) + ' موعد لجدول اليوم و' + ar(nf) + ' مريض لقائمة المتابعة'); refresh(); renderImport();
    }).catch(function () { I.err = 'ما وصلنا الحفظ. تأكد من النت.'; b.disabled = false; renderImport(); });
  }

  /* =====================================================================
     نجاح العميل: weekly health + renewal note (management screen)
     ===================================================================== */
  var EX = { visits_week: 34, followups_sent: 12, patients_returned: 4, reception_days_without_send: 5 };
  function mgtHealth(root, retV) {
    var ph = root.querySelector('.ph'); if (!ph) return;
    var now = Date.now(), wk = now - 7 * DAY;
    var real = {
      visits_7d: S.visits.filter(function (v) { return (v.at || 0) > wk; }).length,
      followups_sent_7d: (T.sentLog || []).filter(function (t) { return t > wk; }).length,
      patients_returned: S.back || 0
    };
    var last = (T.sentLog || []).length ? Math.floor((now - T.sentLog[T.sentLog.length - 1]) / DAY) : null;
    if (last != null) real.days_since_last_send = last;
    var late = 0; try { late = D.allFU().filter(function (f) { return f.owner === 'reception' && !f.done && f.d < 0; }).length; } catch (e) {}
    if (late) real.overdue_followups = late;
    var ex = { visits_week: EX.visits_week, followups_sent: EX.followups_sent, patients_returned: EX.patients_returned, reception_days_without_send: EX.reception_days_without_send, reception_overdue_followups: late };
    var daysLeft = Math.max(0, 7 - Math.floor((now - T.first) / DAY));
    var html = '<div class="win cs-health" style="margin-bottom:18px"><div class="win-h"><div class="who-p"><b>صحة الأسبوع</b><small>إشارات الاستخدام من اللي سويته في الديمو</small></div><span class="cs-ai">مساعد نجاح العميل</span></div>' +
      '<div class="tiles"><div><small>ملفات اعتمدتها (٧ أيام)</small><b>' + ar(real.visits_7d) + '</b></div><div><small>متابعات أرسلتها</small><b>' + ar(real.followups_sent_7d) + '</b></div><div><small>مرضى رجعوا وحجزوا</small><b>' + ar(real.patients_returned) + '</b></div></div>' +
      '<p class="cs-note" style="padding:0 18px;margin:0 0 12px"><span class="ex" style="font-size:11px;padding:4px 6px">مثال</span> أسبوع مجمع شغّال: ' + ar(EX.visits_week) + ' ملف، ' + ar(EX.followups_sent) + ' متابعة، ' + ar(EX.patients_returned) + ' رجعوا، والاستقبال ما أرسل متابعات من ' + ar(EX.reception_days_without_send) + ' أيام.</p>' +
      '<div class="cs-sug"><span class="lab">اقتراح المساعد الذكي</span><p id="csSug"><span class="cs-typing"><i></i><i></i><i></i></span></p><div class="row" id="csSugAct" hidden><button class="btn ghost sm" type="button" id="csSugHelp">إي، ساعدونا</button></div></div>' +
      '<div class="cs-ren"><p><b>تجربتك:</b> اليوم ' + ar(dayN()) + ' من ٧، وباقي ' + ar(daysLeft) + ' يوم. ' + (retV ? 'رجع لك لحد الحين ' + sar(retV) + '.' : 'ما رجع لك مبلغ بعد: اضغط «رجع وحجز» في الاستقبال وينحسب هنا.') + '</p>' +
      '<p><span class="ex" style="font-size:11px;padding:4px 6px">مثال</span> مجمع شغّال: تجديدك بعد ' + ar(12) + ' يوم، وهذا اللي رجع لك: ' + sar(72400) + ' من ' + ar(48) + ' مريض رجعوا بسبب المتابعة.</p></div></div>';
    ph.insertAdjacentHTML('afterend', html);
    var key = 'rq_sug_' + JSON.stringify([real, late]), cached = null;
    try { cached = sessionStorage.getItem(key); } catch (e) {}
    function show(t) { $('csSug').textContent = t; $('csSugAct').hidden = false; $('csSugHelp').onclick = function () { openChat(false, 'ساعدونا في هذا الاقتراح: ' + t); }; }
    if (cached) return show(cached);
    post('/api/cs-health', { sid: SID, real: real, example: ex, age_days: (now - T.first) / DAY }).then(function (j) {
      var t = j.suggestion || 'ما قدرت أكتب اقتراح الحين. جرّب بعد شوي.'; try { sessionStorage.setItem(key, t); } catch (e) {} if ($('csSug')) show(t); track('health_view', { ai: !!j.ai });
    }).catch(function () { if ($('csSug')) $('csSug').textContent = 'ما وصلت لرفيق. جرّب بعد شوي.'; });
  }

  /* =====================================================================
     التدريب: «تعلّم» micro-lessons (3 steps + 1 question; the AI explains a wrong answer)
     ===================================================================== */
  var LES = {
    'doctor.home': { t: 'شاشة عيادتي اليوم', steps: ['اختر المريض الداخل من الجدول، أو من بطاقة «داخل العيادة».', 'افتح ملفه وراجع الحساسية والأدوية قبل ما تبدأ.', 'اضغط «ابدأ الزيارة»، ورفيق ما يسجّل إلا بعد موافقة المريض.'], q: 'متى يبدأ رفيق التسجيل؟', opts: ['أول ما تفتح الملف', 'بعد موافقة المريض', 'لما يوصل المريض للمجمع'], correct: 1 },
    'doctor.visit': { t: 'تسجيل الزيارة', steps: ['خلّ الجوال على الطاولة وتكلّم مع المريض طبيعي.', 'دقيقتين إلى أربع تكفي. وإذا ما تبي مايك جرّب «زيارة جاهزة».', 'اضغط «إيقاف وكتابة الملف» وانتظر من ١٥ إلى ٢٥ ثانية.'], q: 'وش يوثّق رفيق في الملف؟', opts: ['اللي قلته في الزيارة بس', 'تشخيص يقترحه هو', 'علاج مناسب من عنده'], correct: 0 },
    'doctor.note': { t: 'مراجعة الملف واعتماده', steps: ['راجع التبويبات: الملف، الأدوية، الأكواد، الخطة، رسالة المريض.', 'اضغط على أي خانة غلط وعدّلها. «نواقص التوثيق» تنبيه لك.', 'اضغط «اعتمد الملف». قبلها ما يدخل شي في ملف المريض ولا ينزل للاستقبال.'], q: 'وش يصير للمتابعات قبل ما تعتمد الملف؟', opts: ['تنزل مباشرة للاستقبال', 'ما تنزل، تنتظر اعتمادك', 'تنرسل للمريض تلقائي'], correct: 1 },
    'doctor.fu': { t: 'متابعاتي', steps: ['هذي متابعات مرضاك أنت بس.', 'بدّل «مين يتابع مرضاي» إذا تبي الاستقبال يتابع عنك.', 'اضغط «أرسل واتساب» وتفتح الرسالة جاهزة من واتساب العيادة.'], q: 'من وين ترسل رسالة المتابعة؟', opts: ['من رقم رفيق', 'من واتساب العيادة بضغطة', 'رفيق يرسلها بنفسه'], correct: 1 },
    'doctor.nums': { t: 'أرقامي', steps: ['هذي أرقام عيادتك أنت فقط، مو المجمع كله.', 'تشوف فيها ملفاتك المعتمدة ومتابعاتك ومرضاك اللي رجعوا.', 'صورة المجمع كله تشوفها الإدارة من شاشة «الإدارة».'], q: 'من يشوف أرقام المجمع كله؟', opts: ['كل طبيب', 'الإدارة', 'المريض'], correct: 1 },
    'doctor.file': { t: 'ملف المريض', steps: ['فوق: الاسم والحساسية والأمراض المزمنة.', 'تحت: الأدوية الحالية وخطط العلاج المفتوحة والزيارات السابقة.', 'اضغط «ابدأ الزيارة» لما تكون جاهز.'], q: 'ليش تراجع الحساسية قبل الزيارة؟', opts: ['عشان تتأكد منها قبل ما تقرر', 'رفيق يعالجها', 'ما لها لزوم'], correct: 0 },
    'reception': { t: 'قائمة الاستقبال', steps: ['فوق: المتابعات اللي عليكم. رتبها بالفلتر (اليوم، متأخر، هذا الأسبوع).', 'اضغط «أرسل واتساب» وتفتح الرسالة جاهزة من واتساب العيادة.', 'إذا المريض رجع وحجز، علّمه عشان ينحسب في تقرير الإدارة.'], q: 'ليش قسم «الأطباء يتابعونها بنفسهم» للاطلاع فقط؟', opts: ['عشان ما يتصل على المريض اثنين', 'لأنه مخفي عن الإدارة', 'لأنها خطط قديمة'], correct: 0 },
    'management': { t: 'تقرير الإدارة', steps: ['فوق: صحة الأسبوع واقتراح المساعد، من نشاطك في الديمو.', 'تحت: تقرير شهري مثال لشكل التقرير.', 'أي رقم عليه وسم «مثال» توضيحي، مو نتيجة عميل.'], q: 'الأرقام اللي عليها وسم «مثال» هي؟', opts: ['نتائج عميل حقيقي', 'أرقام توضيحية لشكل التقرير', 'أرقامك أنت'], correct: 1 },
    'team.onboarding': { t: 'قائمة أول ٧ أيام', steps: ['القائمة ٦ خطوات، لكل خطوة سبب بسطر وزر ينقلك لها.', 'كل خطوة تنحسب من اللي سويته فعلاً، ما تنعلّم يدوي.', 'الخطوة الجاية دايماً أول وحدة ما خلصت.'], q: 'كيف تنحسب الخطوة؟', opts: ['تضغط عليها وتعلّمها', 'من اللي سويته فعلاً في الديمو', 'الفريق يعلّمها'], correct: 1 },
    'team.import': { t: 'رفع المواعيد', steps: ['ارفع Excel أو CSV. والبيانات تكون خيالية بس.', 'رفيق يقترح الأعمدة. إذا مو متأكد يسألك، وأنت تصحح.', 'يطلع لك تقرير بالجاهز والمحتاج تصحيح، وما ينستورد شي إلا لما تعتمد.'], q: 'متى ينستورد الملف؟', opts: ['أول ما ترفعه', 'بعد ما تراجع التقرير وتعتمد', 'بعد ٢٤ ساعة'], correct: 1 }
  };
  function lessonFor(id) { if (LES[id]) return id; if (id === 'doctor.proc') return 'doctor.visit'; return 'doctor.home'; }
  function openLesson() {
    var id = lessonFor(screenId()), L = LES[id]; track('lesson_open', { l: id });
    closeLesson();
    var ov = document.createElement('div'); ov.className = 'cs-ov'; ov.id = 'csOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'تعلّم');
    ov.innerHTML = '<div class="cs-card"><span class="cs-ai">مدرّب ذكي · مو إنسان</span><h2 style="margin-top:8px">' + esc(L.t) + '</h2><small>درس من ٣ خطوات</small><ol>' + L.steps.map(function (s) { return '<li><span>' + esc(s) + '</span></li>'; }).join('') + '</ol>' +
      '<div class="cs-qz"><b>' + esc(L.q) + '</b>' + L.opts.map(function (o, i) { return '<button type="button" class="cs-opt" data-o="' + i + '">' + esc(o) + '</button>'; }).join('') + '<div id="csExp"></div></div>' +
      '<div class="row" style="justify-content:flex-start;margin-top:16px"><button class="btn ghost sm" type="button" id="csLx">إغلاق</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeLesson(); });
    $('csLx').onclick = closeLesson;
    ov.querySelectorAll('.cs-opt').forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-o'), ok = i === L.correct;
        ov.querySelectorAll('.cs-opt').forEach(function (x) { x.disabled = true; if (+x.getAttribute('data-o') === L.correct) x.classList.add('right'); });
        track('quiz_answer', { l: id, ok: ok });
        if (ok) { b.classList.add('right'); $('csExp').innerHTML = '<p class="cs-exp">صح. أحسنت.</p>'; return; }
        b.classList.add('wrong'); $('csExp').innerHTML = '<p class="cs-exp"><span class="cs-typing"><i></i><i></i><i></i></span></p>';
        post('/api/cs-ask', { sid: SID, mode: 'quiz_explain', chosen: i, lesson: { id: id, steps: L.steps, q: L.q, opts: L.opts, correct: L.correct } }).then(function (j) {
          if ($('csExp')) $('csExp').innerHTML = '<p class="cs-exp"><b>الصحيح: ' + esc(L.opts[L.correct]) + '.</b><br>' + esc(j.reply || '') + '</p>';
        }).catch(function () { if ($('csExp')) $('csExp').innerHTML = '<p class="cs-exp"><b>الصحيح: ' + esc(L.opts[L.correct]) + '.</b> راجع الخطوات فوق.</p>'; });
      };
    });
  }
  function closeLesson() { var o = $('csOv'); if (o) o.remove(); }

  /* =====================================================================
     المساعد + الدعم: «اسأل رفيق» on every screen
     ===================================================================== */
  var chat = { open: false, hist: [], unclear: 0, busy: false, human: false, started: false };
  function stateSummary() {
    var p = progress(), c = I.parsed ? counts() : null;
    return {
      role: S.role, screen: screenId(),
      onboarding: { done: p.done, of: p.total, pending: p.s.filter(function (x) { return !x.done; }).map(function (x) { return x.t; }) },
      visits_approved: S.visits.length, followups_sent: S.sent, patients_returned: S.back,
      import: I.file ? { file_loaded: true, rows: I.total, ready: c ? c.ready : null, needs_fix: c ? c.fix : null, duplicates: c ? c.dup : null, confirmed: !!T.imp, open_questions: I.questions.length, state: I.state } : { file_loaded: false, confirmed: !!T.imp },
      trial_day: dayN()
    };
  }
  function buildChat() {
    if ($('csChat')) return;
    var fab = document.createElement('button'); fab.className = 'cs-fab'; fab.id = 'csFab'; fab.type = 'button'; fab.innerHTML = '<i></i>اسأل رفيق';
    var box = document.createElement('div'); box.className = 'cs-chat'; box.id = 'csChat'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'اسأل رفيق');
    box.innerHTML = '<div class="cs-ch"><div><b>اسأل رفيق</b><small>مساعد ذكي (مو إنسان)، وفريقنا يراجع الردود. لا تكتب بيانات مريض حقيقي.</small></div><button class="cs-x" id="csClose" type="button" aria-label="إغلاق">×</button></div>' +
      '<div class="cs-msgs" id="csMsgs" aria-live="polite"></div><div class="cs-ch-chips" id="csChips"></div>' +
      '<div id="csHum" class="cs-hum" hidden></div>' +
      '<form class="cs-in" id="csForm"><textarea id="csIn" rows="1" maxlength="600" placeholder="اكتب سؤالك…" aria-label="سؤالك"></textarea><button class="btn sm" type="submit" id="csSend">أرسل</button></form>' +
      '<div class="cs-ft"><button class="btn ghost sm" type="button" id="csHumBtn">كلّم إنسان</button><small>العاجل نرد خلال ٤ ساعات، والعادي ٢٤ ساعة</small></div>';
    document.body.appendChild(fab); document.body.appendChild(box);
    fab.onclick = function () { openChat(false); };
    $('csClose').onclick = closeChat;
    $('csHumBtn').onclick = function () { toggleHuman(); };
    $('csForm').onsubmit = function (e) { e.preventDefault(); var v = $('csIn').value.trim(); if (v) { $('csIn').value = ''; send(v); } };
    $('csIn').onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('csForm').requestSubmit(); } };
  }
  function addMsg(cls, html) { var d = document.createElement('div'); d.className = 'cs-m ' + cls; if (cls === 'a' || cls === 's') d.innerHTML = html; else d.textContent = html; $('csMsgs').appendChild(d); $('csMsgs').scrollTop = $('csMsgs').scrollHeight; return d; }
  function chips() {
    var sc = screenId(), c = ['وش أسوي الحين؟', 'كم سعره؟', 'وين تنحفظ بياناتي؟'];
    if (sc === 'team.import') c = ['وش الأعمدة اللي يحتاجها؟', 'وش يصير للمكرر؟', 'كم سعره؟'];
    $('csChips').innerHTML = c.map(function (x) { return '<button type="button">' + esc(x) + '</button>'; }).join('');
    $('csChips').querySelectorAll('button').forEach(function (b) { b.onclick = function () { send(b.textContent); }; });
  }
  function openChat(human, seed) {
    buildChat(); chat.open = true; $('csChat').hidden = false; $('csFab').hidden = true; track('chat_open', { s: screenId() });
    if (!chat.started) { chat.started = true; addMsg('a', 'هلا، أنا مساعد رفيق. ذكاء اصطناعي مو إنسان، وفريقنا يراجع ردودي. أشرح لك الشاشة، أوديك لها، أعيد قراءة أعمدة ملفك، أو أفتح لك تذكرة لفريقنا.'); }
    chips();
    if (human) showHuman(true);
    if (seed) send(seed); else if (!human) setTimeout(function () { $('csIn').focus(); }, 50);
  }
  function closeChat() { chat.open = false; if ($('csChat')) $('csChat').hidden = true; if ($('csFab')) $('csFab').hidden = false; }
  function toggleHuman() { showHuman($('csHum').hidden); }
  function showHuman(on) {
    var h = $('csHum'); h.hidden = !on; if (!on) return;
    h.innerHTML = '<b>كلّم إنسان من فريقنا</b><small style="display:block">يرد عليك إنسان على الإيميل. العادي خلال ٢٤ ساعة، والعاجل خلال ٤ ساعات.</small>' +
      '<textarea id="hMsg" maxlength="1000" placeholder="وش تحتاج؟" aria-label="وش تحتاج"></textarea><input type="email" id="hMail" placeholder="إيميلك للرد" aria-label="إيميلك" autocomplete="email">' +
      '<label class="chk"><input type="checkbox" id="hUrg"> عاجل: وقّفني عن الشغل</label><div class="row" style="justify-content:flex-start;margin:0"><button class="btn sm" type="button" id="hGo">افتح تذكرة</button><button class="btn ghost sm" type="button" id="hX">إلغاء</button></div><div id="hOut"></div>';
    $('hX').onclick = function () { h.hidden = true; };
    $('hGo').onclick = function () {
      var m = $('hMsg').value.trim(), mail = $('hMail').value.trim();
      if (m.length < 3) { $('hOut').innerHTML = '<div class="err" style="margin-top:8px">اكتب وش تحتاج.</div>'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { $('hOut').innerHTML = '<div class="err" style="margin-top:8px">اكتب إيميل صحيح عشان نرد عليك.</div>'; return; }
      $('hGo').disabled = true;
      post('/api/cs-ticket', { sid: SID, message: m, email: mail, urgent: $('hUrg').checked, topic: 'من زر كلّم إنسان · ' + screenId() }).then(function (j) {
        if (!j.no) { $('hGo').disabled = false; $('hOut').innerHTML = '<div class="err" style="margin-top:8px">' + esc(j.reply || 'ما انفتحت التذكرة. جرّب مرة ثانية، أو راسلنا على hala@boldapp.live.') + '</div>'; return; }
        track('ticket_button', { urgent: !!j.urgency && j.urgency === 'urgent' });
        h.hidden = true; addMsg('s', 'انفتحت تذكرة رقم <b>' + esc(j.no) + '</b>. يرد عليك إنسان من فريقنا على <b class="ltr">' + esc(mail) + '</b> ' + esc(j.sla) + '.');
      }).catch(function () { $('hGo').disabled = false; $('hOut').innerHTML = '<div class="err" style="margin-top:8px">ما وصلنا الطلب. تأكد من النت، أو راسلنا على hala@boldapp.live.</div>'; });
    };
  }
  function send(text) {
    if (chat.busy) return; chat.busy = true; $('csSend').disabled = true;
    addMsg('u', text); var typing = addMsg('a', '<span class="cs-typing"><i></i><i></i><i></i></span>');
    track('chat_send', { s: screenId(), chars: text.length });
    post('/api/cs-ask', { sid: SID, message: text, history: chat.hist.slice(-6), screen: screenId(), role: S.role, state: stateSummary(), unclear: chat.unclear }).then(function (j) {
      typing.remove();
      var reply = j.reply || 'ما قدرت أرد الحين. اضغط «كلّم إنسان».';
      chat.hist.push({ r: 'u', t: text }, { r: 'a', t: reply });
      chat.unclear = j.unclear ? chat.unclear + 1 : 0;
      var m = addMsg('a', ''); m.textContent = reply;
      track('chat_reply', { intent: j.intent, action: j.action && j.action.type, ms: j.ms });
      if (j.ticket) {
        var tk = document.createElement('span'); tk.className = 'tk'; tk.textContent = 'رقم التذكرة ' + j.ticket; m.appendChild(tk);
        if (j.ask_email) {
          var inp = document.createElement('input'); inp.type = 'email'; inp.placeholder = 'إيميلك للرد'; inp.setAttribute('aria-label', 'إيميلك'); m.appendChild(inp);
          var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn sm'; bt.textContent = 'أرسل الإيميل'; m.appendChild(bt);
          bt.onclick = function () {
            post('/api/cs-ticket', { no: j.ticket, sid: SID, email: inp.value.trim() }).then(function (r) {
              if (r.ok) { inp.remove(); bt.remove(); tk.textContent = 'رقم التذكرة ' + j.ticket + ' · نرد على ' + inp.value; addMsg('s', 'وصلنا إيميلك. يرد عليك إنسان من فريقنا ' + (j.urgency === 'urgent' ? 'خلال ٤ ساعات' : 'خلال ٢٤ ساعة') + '.'); }
              else toast(r.reply || 'تأكد من الإيميل');
            });
          };
        }
      }
      var a = j.action || {};
      if (a.type === 'navigate' && NAV[a.screen]) { addMsg('s', 'فتحت لك الشاشة.'); setTimeout(function () { nav(a.screen); closeOnMobile(); }, 250); }
      else if (a.type === 'rerun_import') { if (!rerun(a.hint)) addMsg('s', 'ما فيه ملف مرفوع. ارفع الملف أول من «التنفيذ»، وبعدها أعيد قراءة الأعمدة.'); else { addMsg('s', 'أعدت قراءة الأعمدة بحسب كلامك.'); nav('team.import'); closeOnMobile(); } }
      else if (a.type === 'lesson') { closeOnMobile(); openLesson(); }
    }).catch(function () {
      typing.remove(); addMsg('s', 'ما وصلت لرفيق. تأكد من النت وجرّب مرة ثانية، أو اضغط «كلّم إنسان».');
    }).then(function () { chat.busy = false; if ($('csSend')) $('csSend').disabled = false; });
  }
  function closeOnMobile() { if (innerWidth <= 700) closeChat(); }

  /* ---------- wire up ---------- */
  $('learnBtn').onclick = openLesson;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeLesson(); } });
  buildChat();
  refresh();
  if (S.role === 'mgt') setTimeout(function () { D.go('mgt', true); }, 0);

  window.RQT = {
    render: renderTeam, refresh: refresh, mgtHealth: mgtHealth, rerun: rerun,
    sent: function () { T.sentLog.push(Date.now()); if (T.sentLog.length > 200) T.sentLog = T.sentLog.slice(-200); saveT(); refresh(); },
    recorded: function () { if (!T.rec) { T.rec = 1; saveT(); refresh(); } },
    seenReport: function () { if (!T.rep) { T.rep = 1; saveT(); refresh(); } },
    _T: T, _I: function () { return I; }, _nav: nav, _parseDate: parseDate, _normPhone: normPhone, _splitMerged: splitMerged
  };
})();
