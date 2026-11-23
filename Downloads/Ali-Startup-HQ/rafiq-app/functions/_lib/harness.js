// Harness for Rafiq's customer-facing AI steps (pure functions, no I/O: tested by scripts/harness-test.mjs).
// Pattern: tool acts -> the agent inspects its own output -> fixes it (max 3 rounds) -> only then the customer sees it.
// Everything here is deterministic on purpose: a check that is itself an AI call can be wrong in the same way as the answer.

export const MAX_ROUNDS = 3; // 1 generation + 2 regenerations
export const MIN_CONFIDENCE = 0.6;
export const IMPORT_MAX_ROWS = 2000; // D1 row-size bound for the demo store; anything above is REPORTED, never silently cut

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩', FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export function latinDigits(s) {
  return String(s == null ? '' : s).replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d))).replace(/[۰-۹]/g, d => String(FA_DIGITS.indexOf(d)));
}
// Arabic normalisation used only for matching (never shown to the customer).
export function norm(s) {
  return latinDigits(s).replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[٬،,]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
function bare(s) { return norm(s).replace(/[^\p{L}\p{N}]+/gu, ''); }
export function numbersIn(s) { return (latinDigits(s).replace(/(\d)[٬,](?=\d{3})/g, '$1').match(/\d+(?:\.\d+)?/g) || []).map(n => String(Number(n))); }

// ---------------------------------------------------------------- 1) assistant answers (cs-ask)
const SOON_OK = /(الدفع|الاكتروني|الالكتروني|فيديو|اكاديم)/; // the only things the facts call «قريباً»
const PROMISE = /(^|\s)(راح|سوف)\s?(نضيف|نطلق|ندعم|نوفر|نفعل|نربط|نصدر|يضيف|يطلق|يدعم|يتوفر|يربط)|(^|\s)(بنضيف|بنطلق|بنربط|بندعم|بنوفر|سنضيف|سنطلق|سنربط|سندعم|سنوفر|سيضيف|سيدعم|سيتوفر)|(الاصدار|التحديث) القادم|في الخطه القادمه|(^|\s)(نخطط|مخطط)\s|نعدك|نوعدك|(^|\s)اعدك|نضمن|اضمن لك|مضمون/;
const UNSUPPORTED = /(^|\s)(نفاذ|وزاره الصحه|منصه صحه|صحتي|سيهه|مدد|زاتكا|zatca|فاتوره الكترونيه|cerner|epic|hl7|fhir|تطبيق (على )?(الجوال|ايفون|اندرويد)|app store|google play|ارسال (تلقائي|اوتوماتيك)|يرسل (تلقائيا|بنفسه|اوتوماتيك)|google calendar|اوتلوك|zoho|odoo)/i;
const NEGATED = /(^|\s)(ما|لا|مو|بدون|ليس|لست)\s+(\S+\s+){0,3}$/;
const MED_ADVICE = /((انصحك|اقترح عليك|اوصيك|خذ|تناول|استخدم|اشرب)\s+(\S+\s+){0,3}(دواء|حبوب|مضاد|مسكن|جرعه|بنادول|باراسيتامول|ايبوبروفين|كريم))|(تشخيصك|اظن انك|عندك (التهاب|مرض|عدوي))|(\d+(\.\d+)?\s*(mg|mcg|ml|ملغ|ملجم|ملغم|مجم|مل)\b)/i;
const HUMAN_CLAIM = /(انا|أنا) (انسان|بشر|موظف|شخص حقيقي)/;

/**
 * Check one assistant reply. ctx = { facts, stateTxt, message }.
 * d = { reply, intent, evidence, confidence }.  Returns { passed, reasons:[code], detail:[arabic text for the regenerate prompt] }.
 */
export function checkReply(d, ctx = {}) {
  const reasons = [], detail = [];
  const add = (code, msg) => { reasons.push(code); detail.push(msg); };
  const reply = String(d.reply || ''), intent = d.intent || 'unknown', n = norm(reply);
  const src = norm((ctx.facts || '') + ' ' + (ctx.stateTxt || ''));
  if (reply.trim().length < 2) { add('empty', 'الرد فاضي'); return { passed: false, reasons, detail }; }
  if (reply.length > 900) add('too_long', 'الرد طويل (أكثر من ٩٠٠ حرف). اختصره بـ٢ إلى ٥ جمل');
  const letters = (reply.match(/\p{L}/gu) || []).length, arLetters = (reply.match(/[؀-ۿ]/g) || []).length;
  if (letters >= 12 && arLetters / letters < 0.6) add('not_arabic', 'الرد لازم يكون بالعربي الواضح (السعودي البسيط)');
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(reply)) add('emoji', 'ممنوع الإيموجي');
  // prices / numbers: every number must come from the facts or the demo state (no invented prices)
  const allowed = new Set(numbersIn((ctx.facts || '') + ' ' + (ctx.stateTxt || '')));
  const bad = numbersIn(reply).filter(x => !allowed.has(x));
  if (bad.length) add('invented_number', 'فيه أرقام مو موجودة في الحقائق: ' + [...new Set(bad)].slice(0, 5).join('، ') + '. لا تخترع سعر أو رقم');
  // promises about unreleased features. «قريباً» is allowed only for what the facts themselves call soon.
  if (PROMISE.test(n)) add('unreleased_promise', 'فيه وعد بميزة أو التزام مو موثّق في الحقائق. لا تعد بأي شيء');
  n.split(/[.!؟?\n]+/).forEach(sn => { if (/قريب/.test(sn) && !SOON_OK.test(sn)) add('unreleased_promise', '«قريباً» مسموحة فقط للدفع الإلكتروني وفيديوهات الأكاديمية'); });
  const um = n.match(UNSUPPORTED);
  if (um) {
    const before = n.slice(0, um.index + um[1].length);
    if (!NEGATED.test(before + ' ')) add('unsupported_feature', 'ذكرت ميزة أو تكامل مو في الحقائق: «' + um[0].trim() + '»');
  }
  // medical advice (a refusal that mentions the doctor is fine)
  const refusal = intent === 'medical' && /(ما اقدر|قرار الطبيب|مو من اختصاصي)/.test(n);
  if (!refusal && MED_ADVICE.test(n)) add('medical_advice', 'الرد فيه نصيحة طبية أو جرعة أو تشخيص. ارفض بلطف وقل إنه قرار الطبيب');
  if (HUMAN_CLAIM.test(n) && !/(مو|ما |لست|لا )/.test(n)) add('claims_human', 'لا تدّعي إنك إنسان');
  // grounding: an "answered" reply must quote the facts literally
  if (intent === 'answered') {
    const ev = bare(d.evidence);
    if (ev.length < 6) add('no_evidence', 'ما كتبت اقتباس حرفي من الحقائق في evidence');
    else if (!bare((ctx.facts || '') + ' ' + (ctx.stateTxt || '')).includes(ev)) add('evidence_not_literal', 'اقتباس evidence مو حرفي من الحقائق أو الحالة');
    const conf = Number(d.confidence);
    if (Number.isFinite(conf) && conf < MIN_CONFIDENCE) add('low_confidence', 'ثقتك منخفضة (' + conf + ')');
  }
  return { passed: reasons.length === 0, reasons: [...new Set(reasons)], detail: [...new Set(detail)] };
}

// ---------------------------------------------------------------- 2) data migration (cs-map / cs-import)
export const KSA_MOBILE = /^05\d{8}$/;
export function normPhoneKSA(s) {
  let t = latinDigits(s).replace(/[^\d+]/g, '').replace(/\+/g, '');
  if (t.startsWith('00966')) t = t.slice(5); else if (t.startsWith('966')) t = t.slice(3);
  if (/^05\d{8}$/.test(t)) return t;
  if (/^5\d{8}$/.test(t)) return '0' + t;
  return null;
}
// strict ISO calendar date, or '' when absent. Returns null when present but not a real date.
export function isoDateOrNull(s) {
  const t = String(s == null ? '' : s).trim();
  if (!t) return '';
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return dt.getUTCFullYear() === +m[1] && dt.getUTCMonth() === +m[2] - 1 && dt.getUTCDate() === +m[3] ? t : null;
}
// obvious date fixes only: d/m/yyyy, d-m-yy, Arabic digits. Never guesses an ambiguous month/day swap.
export function fixDate(s) {
  const t = latinDigits(s).trim();
  let m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  let y, mo, d;
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; if (mo > 12 && d <= 12) { const x = d; d = mo; mo = x; } }
  else if ((m = t.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isoDateOrNull(iso) ? iso : null;
}

/** Row check for the server side of an import. row = {n,p,d,s,dr}. */
export function checkRow(r) {
  const why = [];
  if (String(r.n || '').trim().length < 2 || /^[\d\s\-+.]+$/.test(latinDigits(r.n))) why.push('name');
  if (!KSA_MOBILE.test(String(r.p || ''))) why.push('phone');
  if (isoDateOrNull(r.d) === null) why.push('date');
  return why;
}
/**
 * Validate -> auto-fix obvious issues -> re-validate (max 3 rounds). Nothing is dropped silently:
 * every input row ends in exactly one of valid / duplicate / invalid, and the counts always add up.
 * Returns { received, valid:[rows], duplicates:[{ix,of}], invalid:[{ix,why}], fixed, rounds, balanced }.
 */
export function validateImport(rows, maxRounds = MAX_ROUNDS) {
  const work = rows.map(r => ({ n: String(r.n == null ? '' : r.n).replace(/\s+/g, ' ').trim(), p: String(r.p == null ? '' : r.p), d: String(r.d == null ? '' : r.d), s: String(r.s || ''), dr: String(r.dr || '') }));
  const fixedIx = new Set();
  let rounds = 0;
  for (; rounds < maxRounds; rounds++) {
    let changed = 0;
    work.forEach((r, ix) => {
      const why = checkRow(r); if (!why.length) return;
      if (why.includes('phone')) { const p = normPhoneKSA(r.p); if (p) { r.p = p; changed++; fixedIx.add(ix); } }
      if (why.includes('date')) { const d = fixDate(r.d); if (d) { r.d = d; changed++; fixedIx.add(ix); } }
    });
    if (!changed) break;
  }
  const valid = [], duplicates = [], invalid = [], seen = new Map();
  work.forEach((r, ix) => {
    const why = checkRow(r);
    if (why.length) { invalid.push({ ix, why }); return; }
    const key = r.p + '|' + r.d;
    if (seen.has(key)) { duplicates.push({ ix, of: seen.get(key) }); return; }
    seen.set(key, ix); valid.push({ ...r, _ix: ix });
  });
  const received = work.length;
  return { received, valid, duplicates, invalid, fixed: fixedIx.size, rounds: Math.min(rounds + 1, maxRounds), balanced: valid.length + duplicates.length + invalid.length === received };
}

/** Post-import verification: what the store holds must equal the valid source rows. */
export function verifyImport(expectedValid, storedRows) {
  const stored = Array.isArray(storedRows) ? storedRows.length : -1;
  return { ok: stored === expectedValid, expected: expectedValid, stored, diff: stored - expectedValid };
}

/** Test the AI's column mapping against the 5 sample rows (cs-map harness). Returns { ok, reasons, detail }. */
export function checkMapping(map, headers, sampleRows) {
  const reasons = [], detail = [], add = (c, m) => { reasons.push(c); detail.push(m); };
  const n = headers.length, rows = sampleRows || [];
  const cell = (r, i) => (i == null || r[i] == null ? '' : String(r[i]).trim());
  const fit = (col, f) => rows.length ? rows.filter(r => f(cell(r, col))).length / rows.length : 0;
  if (map.name == null) add('name_missing', 'عمود الاسم غير مربوط');
  if (map.phone == null) add('phone_missing', 'عمود الجوال غير مربوط');
  for (const [k, v] of Object.entries(map)) if (v != null && !(Number.isInteger(v) && v >= 0 && v < n)) add('bad_index_' + k, `فهرس عمود ${k} خارج الملف`);
  if (map.name != null && map.name === map.doctor) add('name_is_doctor', 'عمود الاسم هو نفسه عمود الطبيب');
  const looksPhone = v => !!normPhoneKSA(v) || /(?:\+|00)?\d[\d\s\-.]{7,17}\d/.test(latinDigits(v));
  if (map.phone != null && map.phone !== map.name && fit(map.phone, looksPhone) < 0.5) add('phone_col_not_phones', 'عمود الجوال أغلبه مو أرقام جوال');
  if (map.name != null && map.name !== map.phone && fit(map.name, v => /^[\d\s\-+.]*$/.test(v) && v !== '') > 0.5) add('name_col_numeric', 'عمود الاسم أغلبه أرقام');
  if (map.date != null && fit(map.date, v => v === '' || !!fixDate(v) || !!isoDateOrNull(v) || /(14\d\d|20\d\d)/.test(latinDigits(v))) < 0.5) add('date_col_not_dates', 'عمود التاريخ أغلبه مو تواريخ');
  return { ok: reasons.length === 0, reasons, detail };
}

// ---------------------------------------------------------------- 3) onboarding goals: public/assets/goals.js (shared by the browser and the tests)

// ---------------------------------------------------------------- 4) customer health (cs-health)
export const NO_DATA = 'ما فيه بيانات كافية';
/**
 * real = signals measured from the user's own session. ageDays = days since first use.
 * Never returns a score. status: 'no_data' | 'healthy' | 'at_risk'. Example/illustrative numbers are NOT inputs here.
 */
export function assessHealth(real, ageDays) {
  const r = real || {}, age = Number.isFinite(ageDays) ? ageDays : null;
  const has = k => typeof r[k] === 'number' && Number.isFinite(r[k]);
  const known = ['visits_7d', 'followups_sent_7d', 'patients_returned', 'days_since_last_send', 'overdue_followups'].filter(has);
  if (age == null || !known.length) return { status: 'no_data', reasons: [] };
  const active = (r.visits_7d || 0) + (r.followups_sent_7d || 0) + (r.patients_returned || 0) > 0;
  if (!active && age < 3) return { status: 'no_data', reasons: [], note: 'الحساب جديد (أقل من ٣ أيام) وما فيه نشاط بعد' };
  const reasons = [];
  if (!active) reasons.push('no_activity_' + Math.floor(age) + 'd');
  if (has('days_since_last_send') && r.days_since_last_send >= 5) reasons.push('no_followup_sent_' + r.days_since_last_send + 'd');
  if (has('overdue_followups') && r.overdue_followups >= 5) reasons.push('overdue_followups_' + r.overdue_followups);
  if (age >= 5 && has('visits_7d') && r.visits_7d === 0 && (r.followups_sent_7d || 0) === 0) reasons.push('no_visits_7d');
  return { status: reasons.length ? 'at_risk' : 'healthy', reasons: [...new Set(reasons)] };
}
const RISK_AR = { no_visits_7d: 'ما انسجلت زيارات هالأسبوع', overdue: 'متابعات متأخرة', no_followup: 'الاستقبال ما أرسل متابعات من فترة', no_activity: 'ما فيه أي نشاط' };
export function riskText(reasons) {
  return reasons.map(c => c.startsWith('no_activity') ? RISK_AR.no_activity + ' (' + c.match(/\d+/)[0] + ' يوم)' : c.startsWith('no_followup') ? RISK_AR.no_followup + ' (' + c.match(/\d+/)[0] + ' أيام)' : c.startsWith('overdue') ? RISK_AR.overdue + ' (' + c.match(/\d+/)[0] + ')' : RISK_AR[c] || c).join('، ');
}
