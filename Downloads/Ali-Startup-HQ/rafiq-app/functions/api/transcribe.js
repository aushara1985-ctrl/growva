// POST {audio: base64 16kHz mono WAV, sid, ref, part}
// Speech-to-text with Workers AI Whisper (large-v3-turbo). Demo only: acted visits, no real patient data.
const PROMPT = 'زيارة عيادة باللهجة السعودية مع مصطلحات طبية بالإنجليزي. Patient visit, mixed Arabic and English: blood pressure, ultrasound, CBC, HbA1c, paracetamol, folic acid, ferritin, follow up.';

export async function onRequestPost({ request, env }) {
  const t0 = Date.now();
  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const audio = String(body.audio || '');
  if (audio.length < 1000) return json({ error: 'audio_too_short' }, 400);
  if (audio.length > 12_000_000) return json({ error: 'audio_too_long' }, 413);
  if (await overDailyCap(env)) return json({ error: 'daily_cap' }, 429);
  let text = '', err = null;
  try {
    const r = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
      audio, task: 'transcribe', vad_filter: true, initial_prompt: PROMPT,
    });
    text = String(r?.text || '').trim();
  } catch (e) { err = String(e?.message || e).slice(0, 300); }
  await log(env, body, 'transcribe', !err, Date.now() - t0, audio.length, null, text, err);
  if (err) return json({ error: 'stt_failed', detail: err }, 502);
  return json({ text, ms: Date.now() - t0 });
}

async function overDailyCap(env) {
  try {
    const r = await env.DB.prepare('SELECT COUNT(*) n FROM runs WHERE ts > ?').bind(Date.now() - 86400000).first();
    return Number(r?.n || 0) > 600;
  } catch { return false; }
}
async function log(env, b, kind, ok, ms, chars, input, output, error) {
  try {
    await env.DB.prepare('INSERT INTO runs (ts,sid,ref,kind,specialty,ok,ms,input_chars,input_text,output_text,error) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(Date.now(), String(b.sid || '').slice(0, 64), String(b.ref || '').slice(0, 64), kind, String(b.specialty || '').slice(0, 32),
        ok ? 1 : 0, ms, chars, input, (output || '').slice(0, 20000), error).run();
  } catch {}
}
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } }); }
