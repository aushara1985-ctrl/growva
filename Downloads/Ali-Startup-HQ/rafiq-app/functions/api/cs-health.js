// POST {sid, real:{...numbers}, example:{...numbers}} -> {suggestion, ai}
// One plain suggestion for management. The AI may only use numbers we gave it; otherwise we fall back to a fixed rule.
// HARNESS: the at-risk decision is plain code over REAL usage signals (assessHealth). No data -> «ما فيه بيانات كافية» (never a score,
// never example numbers). At risk -> one CS task (a ticket, source 'health:at_risk', max one open per session per 3 days).
import { askJson, json, limited, logCall, logQuality, newTicket } from '../_lib/cs.js';
import { guard } from '../_lib/ratelimit.js';
import { assessHealth, riskText, NO_DATA } from '../_lib/harness.js';

const RULES = `أنت مساعد «نجاح العميل» في رفيق (ذكاء اصطناعي، مو إنسان). تكتب اقتراح واحد قصير (١٥ إلى ٣٠ كلمة) للإدارة بالسعودي البسيط، بناءً على إشارات الاستخدام فقط.
- استخدم فقط الأرقام الموجودة في الإشارات. ممنوع رقم جديد أو نسبة أو ريال من عندك.
- إذا بنيت الاقتراح على أرقام «example» اكتب كلمة «مثال» بين قوسين بجانبها. أرقام «real» هي اللي سواها المستخدم فعلاً في الديمو.
- الاقتراح ينتهي بسؤال عرض مساعدة مثل «نساعدك؟». لا نصيحة طبية. لا وعود.
- إذا كل أرقام real صفر، شجّعه على أول خطوة مفيدة (اعتماد ملف أو إرسال متابعة) بدون أرقام.
أخرج JSON: {"suggestion":"..."}`;

function nums(s) { return (String(s).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).match(/\d+/g) || []); }

export async function onRequestPost({ request, env, data }) {
  const t0 = Date.now();
  const sid = data.session.cid; // clinic id from the verified session, never from the body
  const blocked = await guard(env, request, 'health', sid);
  if (blocked) return blocked;
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const pick = (o) => { const r = {}; for (const k of Object.keys(o || {}).slice(0, 12)) { const v = o[k]; if (typeof v === 'number' && isFinite(v)) r[String(k).slice(0, 40)] = Math.round(v); } return r; };
  const real = pick(b.real), example = pick(b.example);
  const age = Number(b.age_days);
  const health = assessHealth(real, Number.isFinite(age) ? age : null);
  if (health.status === 'no_data') {
    await logQuality(env, { cid: sid, step: 'health', passed: true, reasons: ['no_data'], rounds: 1 });
    return json({ suggestion: NO_DATA, ai: false, status: 'no_data', reasons: [] });
  }
  // fallback uses REAL numbers only (example numbers are illustration for the screen, never a basis for a risk statement)
  const fallback = health.status === 'at_risk'
    ? `الإشارات الحقيقية تقول: ${riskText(health.reasons)}. نساعدك؟`
    : 'الاستخدام ماشي طبيعي حسب إشاراتك. تبي نقترح لك خطوة تزيد المرضى اللي يرجعون؟ نساعدك؟';
  let task = null;
  if (health.status === 'at_risk') {
    try {
      const open = await env.DB.prepare("SELECT no FROM cs_tickets WHERE clinic_id=? AND source='health:at_risk' AND status='open' AND ts>?").bind(sid, Date.now() - 3 * 86400000).first();
      task = open ? open.no : await newTicket(env, { cid: sid, urgency: 'normal', topic: 'عميل معرّض للخروج (نجاح العميل)', message: `إشارات الاستخدام: ${riskText(health.reasons)}. الأرقام الحقيقية: ${JSON.stringify(real)}، عمر الحساب ${Math.floor(age)} يوم.`, source: 'health:at_risk' });
    } catch {}
  }
  const meta = { status: health.status, reasons: health.reasons, task: task || undefined };
  await logQuality(env, { cid: sid, step: 'health', passed: health.status !== 'at_risk', reasons: health.reasons, rounds: 1 });
  if (await limited(env, sid)) return json({ suggestion: fallback, ai: false, limited: true, ...meta });
  const user = `إشارات real (من جلسة المستخدم): ${JSON.stringify(real)}\nإشارات example (أرقام مثال توضيحية مو حقيقية، لا تبني عليها أي حكم عن العميل): ${JSON.stringify(example)}
حكم الفحص (من كود، التزم به): ${health.status === 'at_risk' ? 'معرّض للخروج: ' + riskText(health.reasons) : 'طبيعي'}\nأعطني JSON.`;
  const res = await askJson(env, RULES, user, d => typeof d.suggestion === 'string' && d.suggestion.length > 8, 500);
  let suggestion = res.data ? String(res.data.suggestion).slice(0, 300) : '';
  let ai = !!suggestion;
  if (ai) { // every number in the sentence must come from the signals
    const allowed = new Set([...Object.values(real), ...Object.values(example)].map(String));
    if (!nums(suggestion).every(n => allowed.has(String(Number(n))))) ai = false;
  }
  if (!ai) suggestion = fallback;
  await logCall(env, { cid: sid, kind: 'health', model: res.model, ok: ai, ms: Date.now() - t0, intent: 'health', error: ai ? null : (res.err || 'numbers_not_in_signals') });
  return json({ suggestion, ai, ...meta });
}
