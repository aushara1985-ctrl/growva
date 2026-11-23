// POST {sid, real:{...numbers}, example:{...numbers}} -> {suggestion, ai}
// One plain suggestion for management. The AI may only use numbers we gave it; otherwise we fall back to a fixed rule.
import { askJson, json, limited, logCall, cleanSid } from '../_lib/cs.js';

const RULES = `أنت مساعد «نجاح العميل» في رفيق (ذكاء اصطناعي، مو إنسان). تكتب اقتراح واحد قصير (١٥ إلى ٣٠ كلمة) للإدارة بالسعودي البسيط، بناءً على إشارات الاستخدام فقط.
- استخدم فقط الأرقام الموجودة في الإشارات. ممنوع رقم جديد أو نسبة أو ريال من عندك.
- إذا بنيت الاقتراح على أرقام «example» اكتب كلمة «مثال» بين قوسين بجانبها. أرقام «real» هي اللي سواها المستخدم فعلاً في الديمو.
- الاقتراح ينتهي بسؤال عرض مساعدة مثل «نساعدك؟». لا نصيحة طبية. لا وعود.
- إذا كل أرقام real صفر، شجّعه على أول خطوة مفيدة (اعتماد ملف أو إرسال متابعة) بدون أرقام.
أخرج JSON: {"suggestion":"..."}`;

function nums(s) { return (String(s).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).match(/\d+/g) || []); }

export async function onRequestPost({ request, env }) {
  const t0 = Date.now();
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const sid = cleanSid(b.sid) || 'anon';
  const pick = (o) => { const r = {}; for (const k of Object.keys(o || {}).slice(0, 12)) { const v = o[k]; if (typeof v === 'number' && isFinite(v)) r[String(k).slice(0, 40)] = Math.round(v); } return r; };
  const real = pick(b.real), example = pick(b.example);
  const fallback = (real.followups_sent_7d || 0) === 0 && (real.visits_7d || 0) === 0
    ? 'ما انسجل نشاط في تجربتك بعد. جرّب تعتمد ملف زيارة وترسل متابعة، ونشوف لك الرقم الحقيقي. نساعدك؟'
    : `الاستقبال ما أرسل متابعات من ${example.reception_days_without_send ?? 5} أيام (مثال). نساعدك؟`;
  if (await limited(env, sid)) return json({ suggestion: fallback, ai: false, limited: true });
  const user = `إشارات real (من جلسة المستخدم): ${JSON.stringify(real)}\nإشارات example (أرقام مثال توضيحية مو حقيقية): ${JSON.stringify(example)}\nأعطني JSON.`;
  const res = await askJson(env, RULES, user, d => typeof d.suggestion === 'string' && d.suggestion.length > 8, 500);
  let suggestion = res.data ? String(res.data.suggestion).slice(0, 300) : '';
  let ai = !!suggestion;
  if (ai) { // every number in the sentence must come from the signals
    const allowed = new Set([...Object.values(real), ...Object.values(example)].map(String));
    if (!nums(suggestion).every(n => allowed.has(String(Number(n))))) ai = false;
  }
  if (!ai) suggestion = fallback;
  await logCall(env, { sid, kind: 'health', model: res.model, ok: ai, ms: Date.now() - t0, intent: 'health', msg: JSON.stringify(real), reply: suggestion, error: ai ? null : (res.err || 'numbers_not_in_signals') });
  return json({ suggestion, ai });
}
