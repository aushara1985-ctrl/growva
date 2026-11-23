// POST {sid, headers:[...], rows:[[...]] (max 5), total, hint?, answers?} -> {mapping, questions, notes_ar}
// Workers AI reads headers + 5 sample rows and proposes a column mapping. The cleaning itself runs in the browser.
import { askJson, json, limited, logCall, logQuality, cleanSid } from '../_lib/cs.js';
import { checkMapping, MAX_ROUNDS } from '../_lib/harness.js';

const RULES = `أنت مساعد تنفيذ في رفيق (ذكاء اصطناعي). تقرأ رؤوس أعمدة وخمسة صفوف عينة من ملف عيادة سعودية (مواعيد اليوم أو قائمة مرضى)، وتقترح أي عمود يمثل: name (اسم المريض)، phone (الجوال)، date (تاريخ الموعد)، specialty (التخصص أو القسم)، doctor (الطبيب).
قواعد:
- فهرس العمود يبدأ من 0. إذا ما فيه عمود مناسب اجعل القيمة null. لا تخمّن: إذا مو متأكد (ثقة أقل من 0.75) أضف سؤال توضيحي بالعربي السعودي، مثل «العمود الثالث رقم الجوال؟».
- الجوال السعودي يجي بصيغ: 05xxxxxxxx أو 5xxxxxxxx أو 9665xxxxxxxx أو +9665xxxxxxxx أو 009665xxxxxxxx، وأحياناً مع مسافات أو شرطات أو أرقام هندية.
- ممكن يكون الاسم والجوال في عمود واحد (merged): ضع فهرسه في name_phone_merged وخلّ name وphone بنفس الفهرس.
- التاريخ ممكن يكون ميلادي أو هجري (سنة 14xx أو أسماء أشهر هجرية مثل رجب وشعبان) أو خليط. حدد date_calendar: "gregorian" أو "hijri" أو "mixed" أو "none".
- قد تجد عمود رقم تسلسلي أو ملاحظات أو سعر: تجاهله (null). لا تخلط اسم الطبيب باسم المريض: الأطباء غالباً يبدأ اسمهم بـ د. أو أ. أو Dr.
- إذا جاك hint من المستخدم يصحّح اتجاه عمود، التزم به.
أخرج JSON واحد فقط:
{"mapping":{"name":0,"phone":1,"date":2,"specialty":null,"doctor":null},"confidence":{"name":0.95,"phone":0.9,"date":0.8,"specialty":0,"doctor":0},"name_phone_merged":null,"date_calendar":"gregorian","has_header":true,"questions":[{"field":"phone","col":2,"text_ar":"العمود الثالث رقم الجوال؟"}],"notes_ar":"جملة وحدة تشرح وش لقيت"}`;

export async function onRequestPost({ request, env }) {
  const t0 = Date.now();
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const sid = cleanSid(b.sid) || 'anon';
  const headers = (Array.isArray(b.headers) ? b.headers : []).slice(0, 40).map(x => String(x ?? '').slice(0, 60));
  const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 5).map(r => (Array.isArray(r) ? r : []).slice(0, 40).map(x => String(x ?? '').slice(0, 80)));
  if (!headers.length || !rows.length) return json({ error: 'empty_file' }, 400);
  if (await limited(env, sid)) {
    await logCall(env, { sid, kind: 'map', ok: 0, intent: 'rate_limited', msg: '' });
    return json({ error: 'rate_limited', reply: 'وصلت الحد المسموح لهالساعة في الديمو. ارجع بعد شوي أو اضغط «كلّم إنسان».' }, 429);
  }
  const hint = String(b.hint || '').slice(0, 200);
  const answers = (Array.isArray(b.answers) ? b.answers : []).slice(0, 6).map(a => `${String(a.field || '').slice(0, 20)}: عمود ${Number(a.col)} ${a.yes ? 'صحيح' : 'غلط'}`).join('\n');
  const user = `رؤوس الأعمدة (الفهرس يبدأ من 0):\n${headers.map((h, i) => `${i}: ${h || '(بدون عنوان)'}`).join('\n')}\n\nعينة الصفوف (بيانات خيالية للتجربة):\n${rows.map(r => JSON.stringify(r)).join('\n')}\n\nعدد الصفوف الكلي: ${Number(b.total) || rows.length}\n${hint ? 'تصحيح من المستخدم: ' + hint + '\n' : ''}${answers ? 'إجابات المستخدم على أسئلتك:\n' + answers + '\n' : ''}أعطني JSON.`;
  // HARNESS: propose -> test the mapping against the sample rows (required columns, phone/date fit) -> re-ask with the reasons, max 3 rounds.
  const n = headers.length;
  const cleanMap = (m) => { const c = {}; for (const k of ['name', 'phone', 'date', 'specialty', 'doctor']) { const v = (m || {})[k]; c[k] = Number.isInteger(v) && v >= 0 && v < n ? v : null; } return c; };
  let res = { data: null, err: null }, chk = { ok: false, reasons: ['no_model_output'], detail: [] }, rounds = 0;
  while (rounds < MAX_ROUNDS) {
    rounds++;
    const fix = rounds > 1 ? `
فحص الاقتراح السابق فشل: ${chk.detail.join(' | ')}. راجع الأعمدة والعينة وصحّح الربط.
` : '';
    res = await askJson(env, RULES, user + fix, d => d && d.mapping && typeof d.mapping === 'object', 1200);
    if (!res.data) continue;
    const mm = cleanMap(res.data.mapping), merged = Number.isInteger(res.data.name_phone_merged) && res.data.name_phone_merged < n ? res.data.name_phone_merged : null;
    if (merged != null) { mm.name = merged; mm.phone = merged; }
    chk = checkMapping(mm, headers, rows);
    if (chk.ok) break;
  }
  await logQuality(env, { clinic_id: b.clinic_id, sid, step: 'map', passed: chk.ok, reasons: chk.reasons, rounds });
  const m = res.data?.mapping || {};
  const clean = cleanMap(m);
  const out = res.data ? {
    mapping: clean,
    confidence: res.data.confidence && typeof res.data.confidence === 'object' ? res.data.confidence : {},
    name_phone_merged: Number.isInteger(res.data.name_phone_merged) && res.data.name_phone_merged < n ? res.data.name_phone_merged : null,
    date_calendar: ['gregorian', 'hijri', 'mixed', 'none'].includes(res.data.date_calendar) ? res.data.date_calendar : 'gregorian',
    has_header: res.data.has_header !== false,
    questions: (Array.isArray(res.data.questions) ? res.data.questions : []).slice(0, 3).map(q => ({ field: String(q.field || ''), col: Number.isInteger(q.col) && q.col < n ? q.col : null, text_ar: String(q.text_ar || '').slice(0, 160) })).filter(q => q.text_ar),
    notes_ar: String(res.data.notes_ar || '').slice(0, 240),
    // what the mapping check found on the last round: the browser shows these to the clinic instead of trusting the AI silently
    check: { ok: chk.ok, rounds, issues: chk.detail },
    model: res.model, ms: Date.now() - t0,
  } : null;
  await logCall(env, { sid, kind: 'map', model: res.model, ok: !!out, ms: Date.now() - t0, intent: 'mapping', msg: 'cols=' + headers.join('|'), reply: out ? JSON.stringify(out.mapping) : '', error: res.err });
  if (!out) return json({ error: 'map_failed', detail: res.err }, 502);
  return json(out);
}
