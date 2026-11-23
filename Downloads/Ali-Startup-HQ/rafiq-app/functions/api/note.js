// POST {transcript, specialty, patient, sid, ref}
// Turns a visit conversation into a structured, doctor-reviewable record. Documentation only:
// it never invents a diagnosis or treatment that the doctor did not say.

const SPECIALTY = {
  ob: 'Obstetrics & Gynecology. specialty_fields: {"gestational_age_weeks": number|null, "lmp": string|null, "edd": string|null, "gravida_para": string|null, "fetal_findings": string|null, "upcoming_pregnancy_tests": [string]}',
  dental: 'Dentistry. specialty_fields: {"teeth": [{"tooth": "FDI number as said", "finding": string, "procedure": string}], "hygiene_recall_months": number|null}',
  ortho: 'Orthopedics. specialty_fields: {"site": string|null, "side": "left"|"right"|"both"|null, "imaging": [string], "activity_restrictions": string|null}',
  physio: 'Physical therapy & rehabilitation. specialty_fields: {"sessions_plan": string|null, "sessions_total": number|null, "home_exercises": [string], "pain_score": string|null, "goals": [string]}',
  general: 'Family / internal medicine. specialty_fields: {"vitals": string|null, "chronic_conditions": [string], "lifestyle_advice": [string]}',
  derm: 'Dermatology & aesthetics. specialty_fields: {"areas": [string], "package_sessions": number|null, "session_interval_weeks": number|null, "photos_needed": boolean|null, "consent_needed": boolean|null}',
  psych: 'Psychiatry / psychotherapy (extra confidential, minimal necessary detail). specialty_fields: {"session_number": number|null, "mood_scale": "e.g. PHQ-9 or GAD-7 score if said, or patient self-rating 0-10", "risk_screen": "only what was said about self-harm/safety, else null", "homework_ar": [string], "next_session_focus": string|null}. Patient-facing text must be gentle and never repeat sensitive details.',
  peds: 'Pediatrics. specialty_fields: {"age": string|null, "weight": string|null, "vaccines_due": [string], "growth_notes": string|null}',
};

const SCHEMA = `{
 "visit_title_ar": "short Arabic title of the visit",
 "chief_complaint": "English",
 "soap": {"subjective": "English", "objective": "English (only findings actually stated)", "assessment": "English (only what the doctor said)", "plan": "English"},
 "patient_summary_ar": "warm, simple Saudi-friendly Arabic summary for the patient: what we found, what to do, when to come back",
 "medications": [{"name": "", "dose": "", "frequency": "", "duration": "", "notes": "", "how_ar": "one short Arabic line for the patient, e.g. حبة وحدة يومياً بعد الأكل"}],
 "investigations": [{"name": "", "when": ""}],
 "diagnoses": [{"label": "English, as stated by the doctor", "icd10": "best matching ICD-10 code", "certainty": "stated|probable"}],
 "treatment_plan": [{"item_ar": "", "sessions": null, "price_sar": null, "status": "proposed|accepted|done"}],
 "follow_ups": [{"in_days": 0, "type": "appointment|test|session|call", "reason_ar": ""}],
 "whatsapp_message_ar": "a short WhatsApp message from the clinic to the patient after the visit, Saudi tone, no medical jargon, mentions next step and date if known; sign as the clinic",
 "referral": null,
 "documentation_gaps_ar": ["important items the doctor did not mention, e.g. allergies, blood pressure, pregnancy status, consent; only if relevant"],
 "specialty_fields": {}
}`;

const RULES = `You are a clinical documentation assistant for a Saudi clinic. Input is a doctor-patient conversation in Saudi Arabic mixed with English medical terms (speech-to-text, may contain errors).
Rules:
- Document ONLY what was said. Never invent findings, diagnoses, doses or prices. If something was not said, leave it empty, null or [] and, if clinically important, list it in documentation_gaps_ar.
- Clinical note fields (soap, chief_complaint, diagnoses labels) in concise professional English. Patient-facing fields in Arabic.
- patient_summary_ar and whatsapp_message_ar may only repeat facts that were actually said. Never write that a test, value or result is normal unless the doctor said so.
- ICD-10: code only conditions the doctor stated or clearly implied. Never code a condition that is only being screened for or ruled out; use the matching Z code (e.g. Z36.x antenatal screening, Z34.x supervision of normal pregnancy, Z01.x/Z13.x screening). In pregnant patients use O-chapter codes for conditions complicating pregnancy (e.g. anemia in pregnancy O99.01x with trimester). Prefer the most specific valid code.
- Fix obvious speech-to-text errors in drug and test names.
- treatment_plan: every procedure, package or session series discussed, with price_sar only if a price was said. Use status "conditional" for items that depend on something (e.g. root canal only if pain continues), "accepted" when the patient agreed, "done" when done today.
- follow_ups: every return visit, test, or session the doctor asked for, with in_days estimated from what was said (e.g. "بعد أسبوعين" = 14). For conditional instructions ("if the pain continues call us") use in_days null and type "call".
- referral: {"to": "", "reason": ""} only if a referral was discussed, else null.
- Output ONE JSON object only, no markdown, matching this shape:
${SCHEMA}`;

export async function onRequestPost({ request, env }) {
  const t0 = Date.now();
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const transcript = String(b.transcript || '').trim().slice(0, 16000);
  if (transcript.length < 40) return json({ error: 'too_short' }, 400);
  const sp = SPECIALTY[b.specialty] ? b.specialty : 'general';
  const patient = String(b.patient || '').slice(0, 300);
  const instructions = RULES + `\nSpecialty: ${SPECIALTY[sp]}\nPatient context: ${patient || 'not given'}`;
  const user = `Visit conversation:\n"""\n${transcript}\n"""\nReturn the JSON now.`;

  let raw = '', data = null, err = null, model = '';
  for (const m of ['@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast']) {
    try {
      model = m;
      raw = await runModel(env, m, instructions, user);
      data = parseJson(raw);
      if (data && data.soap) { err = null; break; }
      err = 'parse_failed';
    } catch (e) { err = String(e?.message || e).slice(0, 300); }
  }
  await log(env, b, 'note', !!data && !err, Date.now() - t0, transcript.length, transcript, raw, err ? `${model}: ${err}` : null, sp);
  if (!data || err) return json({ error: 'note_failed', detail: err }, 502);
  return json({ note: data, model, ms: Date.now() - t0 });
}

async function runModel(env, model, instructions, user) {
  if (model.includes('gpt-oss')) {
    const r = await env.AI.run(model, { instructions, input: user, reasoning: { effort: 'low' }, max_output_tokens: 4000 });
    return extractText(r);
  }
  const r = await env.AI.run(model, {
    messages: [{ role: 'system', content: instructions }, { role: 'user', content: user }],
    max_tokens: 3500, temperature: 0.2,
  });
  return extractText(r);
}

function extractText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r.response === 'string') return r.response;
  if (r.response && typeof r.response === 'object') return JSON.stringify(r.response);
  if (typeof r.output_text === 'string') return r.output_text;
  if (Array.isArray(r.output)) {
    const parts = [];
    for (const o of r.output) if (o?.type === 'message') for (const c of o.content || []) if (c?.text) parts.push(c.text);
    if (parts.length) return parts.join('');
  }
  if (r.choices?.[0]?.message?.content) return r.choices[0].message.content;
  return JSON.stringify(r);
}

function parseJson(s) {
  if (!s) return null;
  const a = s.indexOf('{'), z = s.lastIndexOf('}');
  if (a < 0 || z <= a) return null;
  try { return JSON.parse(s.slice(a, z + 1)); } catch { return null; }
}

async function log(env, b, kind, ok, ms, chars, input, output, error, sp) {
  try {
    await env.DB.prepare('INSERT INTO runs (ts,sid,ref,kind,specialty,ok,ms,input_chars,input_text,output_text,error) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(Date.now(), String(b.sid || '').slice(0, 64), String(b.ref || '').slice(0, 64), kind, sp, ok ? 1 : 0, ms, chars,
        (input || '').slice(0, 16000), (output || '').slice(0, 20000), error).run();
  } catch {}
}
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } }); }
