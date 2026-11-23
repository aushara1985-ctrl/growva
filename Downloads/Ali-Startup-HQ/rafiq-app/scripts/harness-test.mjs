// Run: node scripts/harness-test.mjs   (no dependencies, no network). Exercises every harness check with good and bad inputs.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
const H = await import(new URL('../functions/_lib/harness.js', import.meta.url));
const { goalCheck } = createRequire(import.meta.url)(join(root, 'public/assets/goals.js'));
// the real facts text the assistant uses (single source: cs-ask.js)
const src = readFileSync(join(root, 'functions/api/cs-ask.js'), 'utf8');
const FACTS = src.slice(src.indexOf('const FACTS = `') + 15, src.indexOf('`;', src.indexOf('const FACTS = `')));
assert.ok(FACTS.includes('٤٩٩'), 'FACTS extracted');
const ctx = { facts: FACTS, stateTxt: '{"visits_approved":0}' };

let n = 0, bad = 0;
function t(name, fn) { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } }
const ans = (reply, extra = {}) => H.checkReply({ reply, intent: 'answered', evidence: 'طبيب مستقل ٤٩٩ شهرياً بدون تأسيس', confidence: 0.9, ...extra }, ctx);

// ---- 1) assistant answers
t('good: price from facts passes', () => { const r = ans('طبيب مستقل ٤٩٩ ريال شهرياً بدون تأسيس، وأول ٧ أيام مجاناً.'); assert.equal(r.passed, true, r.reasons.join()); });
t('bad: invented price fails', () => assert.ok(ans('الباقة ٢٩٩ ريال شهرياً.').reasons.includes('invented_number')));
t('bad: evidence not literal fails', () => assert.ok(ans('طبيب مستقل ٤٩٩ شهرياً.', { evidence: 'رفيق أرخص منافس في السوق كله' }).reasons.includes('evidence_not_literal')));
t('bad: missing evidence fails', () => assert.ok(ans('طبيب مستقل ٤٩٩ شهرياً.', { evidence: '' }).reasons.includes('no_evidence')));
t('bad: low confidence fails', () => assert.ok(ans('طبيب مستقل ٤٩٩ شهرياً.', { confidence: 0.3 }).reasons.includes('low_confidence')));
t('bad: promise of unreleased feature fails', () => assert.ok(ans('راح نضيف تطبيق جوال قريباً.').reasons.includes('unreleased_promise')));
t('good: «قريباً» for e-payment is allowed', () => { const r = ans('الدفع الإلكتروني يتفعّل قريباً والتجربة الحين مجانية.', { evidence: 'الدفع الإلكتروني يتفعّل قريباً' }); assert.equal(r.passed, true, r.reasons.join()); });
t('bad: «قريباً» for another feature fails', () => assert.ok(ans('تكامل نفاذ قريباً.', { evidence: 'الدفع الإلكتروني يتفعّل قريباً' }).reasons.includes('unreleased_promise')));
t('bad: unsupported integration fails', () => assert.ok(ans('رفيق يتكامل مع نفاذ.', { evidence: 'رفيق مساعد توثيق عربي' }).reasons.includes('unsupported_feature')));
t('good: denying an integration is not flagged', () => assert.ok(!ans('ما فيه تكامل مع نفاذ حالياً.', { evidence: 'رفيق مساعد توثيق عربي' }).reasons.includes('unsupported_feature')));
t('bad: dose / medical advice fails', () => assert.ok(H.checkReply({ reply: 'خذ بنادول 500 mg كل ٨ ساعات.', intent: 'answered', evidence: 'x' }, ctx).reasons.includes('medical_advice')));
t('good: medical refusal passes', () => { const r = H.checkReply({ reply: 'ما أقدر أعطي نصيحة طبية، هذا قرار الطبيب.', intent: 'medical' }, ctx); assert.equal(r.passed, true, r.reasons.join()); });
t('bad: English-only reply fails', () => assert.ok(ans('Rafiq is a documentation assistant for clinics in Saudi Arabia and it writes SOAP notes.').reasons.includes('not_arabic')));
t('bad: emoji fails', () => assert.ok(ans('طبيب مستقل ٤٩٩ شهرياً 😀').reasons.includes('emoji')));
t('bad: empty fails', () => assert.equal(ans('').passed, false));
t('bad: claims to be human fails', () => assert.ok(ans('أنا إنسان من فريق رفيق.').reasons.includes('claims_human')));

// ---- 2) data migration
t('phone normalisation (KSA formats)', () => {
  for (const p of ['0551234567', '551234567', '+966551234567', '00966551234567', '966 55 123 4567', '٠٥٥١٢٣٤٥٦٧']) assert.equal(H.normPhoneKSA(p), '0551234567', p);
  for (const p of ['12345', '0451234567', '055123456', '']) assert.equal(H.normPhoneKSA(p), null, p);
});
t('date fix + strict iso', () => { assert.equal(H.fixDate('25/11/2026'), '2026-11-25'); assert.equal(H.fixDate('٢٥-١١-٢٠٢٦'), '2026-11-25'); assert.equal(H.fixDate('31/02/2026'), null); assert.equal(H.isoDateOrNull('2026-13-01'), null); assert.equal(H.isoDateOrNull(''), ''); });
t('validateImport: auto-fixes, detects dups, balances, never drops', () => {
  const rows = [
    { n: 'سارة', p: '551234567', d: '25/11/2026' },        // fixable phone + date
    { n: 'خالد', p: '0551234568', d: '2026-11-25' },        // good
    { n: 'خالد', p: '+966551234568', d: '2026-11-25' },     // duplicate after normalisation
    { n: 'منى', p: 'abc', d: '2026-11-25' },                 // unfixable phone
    { n: '١٢٣', p: '0551234569', d: '' },                    // bad name
    { n: 'ريم', p: '0551234570', d: '2026-02-31' },          // bad date
  ];
  const v = H.validateImport(rows);
  assert.equal(v.received, 6); assert.equal(v.valid.length, 2); assert.equal(v.duplicates.length, 1); assert.equal(v.invalid.length, 3);
  assert.equal(v.fixed, 2); assert.equal(v.balanced, true); assert.ok(v.rounds <= 3);
  assert.deepEqual(v.invalid.map(x => x.why[0]).sort(), ['date', 'name', 'phone']);
  assert.equal(v.valid[0].p, '0551234567'); assert.equal(v.valid[0].d, '2026-11-25');
});
t('validateImport: clean file passes untouched', () => { const v = H.validateImport([{ n: 'علي', p: '0551234567', d: '2026-11-25' }]); assert.equal(v.valid.length, 1); assert.equal(v.fixed, 0); });
t('verifyImport: equal counts ok, mismatch reported', () => { assert.equal(H.verifyImport(5, [1, 2, 3, 4, 5]).ok, true); const m = H.verifyImport(5, [1, 2, 3]); assert.equal(m.ok, false); assert.equal(m.diff, -2); assert.equal(H.verifyImport(5, null).ok, false); });
const hdr = ['الاسم', 'الجوال', 'التاريخ', 'الطبيب'], smp = [['سارة', '0551234567', '2026-11-25', 'د. أحمد'], ['خالد', '0551234568', '2026-11-26', 'د. أحمد']];
t('checkMapping good', () => assert.equal(H.checkMapping({ name: 0, phone: 1, date: 2, doctor: 3 }, hdr, smp).ok, true));
t('checkMapping: missing required columns', () => { const r = H.checkMapping({ name: null, phone: null }, hdr, smp); assert.ok(r.reasons.includes('name_missing') && r.reasons.includes('phone_missing')); });
t('checkMapping: phone column is actually names', () => assert.ok(H.checkMapping({ name: 1, phone: 0 }, hdr, smp).reasons.includes('phone_col_not_phones')));
t('checkMapping: name = doctor', () => assert.ok(H.checkMapping({ name: 3, phone: 1, doctor: 3 }, hdr, smp).reasons.includes('name_is_doctor')));
t('checkMapping: out-of-range index', () => assert.ok(H.checkMapping({ name: 0, phone: 9 }, hdr, smp).reasons.includes('bad_index_phone')));

// ---- 3) onboarding goals come from data, not clicks
t('goal imp: flag without rows is NOT done', () => assert.equal(goalCheck('imp', { flag: true, importedRows: 0 }).ok, false));
t('goal imp: rows match summary is done', () => assert.equal(goalCheck('imp', { importedRows: 40, summaryReady: 40 }).ok, true));
t('goal imp: count mismatch is NOT done', () => assert.equal(goalCheck('imp', { importedRows: 38, summaryReady: 40, flag: true }).ok, false));
t('goal apr/snd need data', () => { assert.equal(goalCheck('apr', { visits: 0 }).ok, false); assert.equal(goalCheck('apr', { visits: 1 }).ok, true); assert.equal(goalCheck('snd', { sent: 1, sentLog: 0 }).ok, false); assert.equal(goalCheck('snd', { sent: 1, sentLog: 1 }).ok, true); });
t('goal inv: click flag alone is not enough', () => { assert.equal(goalCheck('inv', { invited: false }).ok, false); assert.equal(goalCheck('inv', { invited: true }).ok, true); });
t('goal rep: seen but empty is NOT done', () => { assert.equal(goalCheck('rep', { seenReport: true, visits: 0, sent: 0 }).ok, false); assert.equal(goalCheck('rep', { seenReport: true, visits: 2 }).ok, true); });

// ---- 4) customer health
t('health: no signals -> no_data (never a score)', () => { assert.equal(H.assessHealth({}, 10).status, 'no_data'); assert.equal(H.assessHealth({ visits_7d: 3 }, null).status, 'no_data'); });
t('health: brand-new empty account -> no_data, not at_risk', () => assert.equal(H.assessHealth({ visits_7d: 0, followups_sent_7d: 0, patients_returned: 0 }, 1).status, 'no_data'));
t('health: 4 days, zero activity -> at_risk with reason', () => { const h = H.assessHealth({ visits_7d: 0, followups_sent_7d: 0, patients_returned: 0 }, 4); assert.equal(h.status, 'at_risk'); assert.ok(h.reasons.length); });
t('health: no follow-up for 6 days -> at_risk', () => assert.equal(H.assessHealth({ visits_7d: 5, followups_sent_7d: 1, patients_returned: 0, days_since_last_send: 6 }, 9).status, 'at_risk'));
t('health: active account -> healthy', () => assert.equal(H.assessHealth({ visits_7d: 5, followups_sent_7d: 4, patients_returned: 1, days_since_last_send: 1 }, 9).status, 'healthy'));
t('health: result never carries a score', () => assert.ok(!('score' in H.assessHealth({ visits_7d: 5 }, 9))));
t('health: NO_DATA text', () => assert.equal(H.NO_DATA, 'ما فيه بيانات كافية'));

console.log(`${n - bad}/${n} passed`);
process.exit(bad ? 1 : 0);
