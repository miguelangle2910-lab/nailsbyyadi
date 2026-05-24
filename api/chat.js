// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — API: Chatbot con IA (Google Gemini, plan gratis)
//  POST /api/chat   { message, lang, history:[{role,text}] }
//  → { reply: "..." }
//
//  La llave va en Vercel como variable secreta:  GEMINI_API_KEY
//  (Sácala gratis en https://aistudio.google.com/apikey)
// ═══════════════════════════════════════════════════════════════

const SERVICES = require('./_services.json');

// Lista de modelos a intentar en orden (Google retiró algunos viejos).
const MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
const PHONE = '(561) 317-8387';

function buildSystem(lang) {
  const isEN = lang === 'en';
  const priceList = SERVICES
    .map(s => `- ${s.name_es} / ${s.name_en}: $${s.price} (${s.dur} min)`)
    .join('\n');

  return [
    `Eres el asistente virtual de "Nails by Yadi", un salón de uñas en West Palm Beach, Florida.`,
    `Responde SIEMPRE en ${isEN ? 'inglés' : 'español'}. Tono cálido, cercano y profesional. Respuestas cortas (2 a 4 frases). Puedes usar 1 emoji ocasional.`,
    ``,
    `SERVICIOS Y PRECIOS (no inventes otros precios ni promociones):`,
    priceList,
    ``,
    `HORARIO: Lunes a Viernes 8:30am–6:00pm · Sábados 9:00am–4:00pm · Domingos cerrado. Se puede reservar en línea 24/7.`,
    `DIRECCIÓN: 4377 Saturn Ave, West Palm Beach, FL 33406. Teléfono/WhatsApp: ${PHONE}.`,
    ``,
    `CÓMO RESERVAR: en la página "Reservar" (book.html) eligen servicio, fecha, hora y sus datos. El pago es EN PERSONA (no se paga en línea, no hay depósito).`,
    `RECORDATORIOS: se envía un recordatorio 24 horas antes para confirmar la cita; si no confirman, el turno pasa a la siguiente persona en cola, sin ningún cargo. También se envía un recordatorio 1 hora antes.`,
    `COLA VIRTUAL: si un horario está lleno, pueden unirse a la cola y se les avisa si se libera un turno.`,
    `CANCELAR: pueden escribir "cancelar" aquí mismo y dar su código (APT-...) o su teléfono, o llamar al salón. No hay cargos por cancelar.`,
    ``,
    `REGLAS:`,
    `- Para reservar o cancelar, guía a la persona a la acción correcta (página de reservar, o escribir "cancelar" en el chat).`,
    `- Si te preguntan algo que no sabes con certeza, o algo médico/de salud delicado, sugiere contactar directamente al salón al ${PHONE}. No des consejos médicos.`,
    `- No inventes datos, precios ni promociones. Usa solo la información de arriba.`,
    `- Si te piden hablar con una persona, comparte el teléfono ${PHONE}.`,
  ].join('\n');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return await new Promise(resolve => {
    let d = '';
    req.on('data', c => (d += c));
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    console.error('[chat] Falta GEMINI_API_KEY');
    return res.status(500).json({ error: 'AI not configured' });
  }

  const body = await readBody(req);
  const message = (body.message || '').toString().slice(0, 800).trim();
  const lang = body.lang === 'en' ? 'en' : 'es';
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

  if (!message) return res.status(400).json({ error: 'Empty message' });

  // Construir la conversación para Gemini
  const contents = [];
  history.forEach(h => {
    if (h && h.text) {
      contents.push({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(h.text).slice(0, 1000) }],
      });
    }
  });
  contents.push({ role: 'user', parts: [{ text: message }] });

  const payload = {
    system_instruction: { parts: [{ text: buildSystem(lang) }] },
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 320, topP: 0.9 },
  };

  let lastStatus = 0;
  let lastErr = '';

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        const data = await r.json();
        const parts = data &&
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts;
        const reply = Array.isArray(parts)
          ? parts.map(p => p.text || '').join(' ').trim()
          : '';
        if (reply) return res.status(200).json({ reply });
        lastStatus = 200;
        lastErr = 'empty reply';
        continue;
      }

      lastErr = await r.text().catch(() => '');
      lastStatus = r.status;
      console.error('[chat] Gemini error', model, r.status, String(lastErr).slice(0, 300));
      // Llave inválida o sin permiso → no tiene sentido probar otros modelos
      if (r.status === 400 || r.status === 401 || r.status === 403) break;
    } catch (e) {
      lastStatus = 0;
      lastErr = e.message;
      console.error('[chat] excepción con', model, e.message);
    }
  }

  return res.status(502).json({
    error: 'AI upstream error',
    status: lastStatus,
    detail: String(lastErr).slice(0, 200),
  });
};
