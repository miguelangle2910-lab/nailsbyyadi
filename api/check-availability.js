// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — API: Verificar doble reserva el mismo día
//  POST /api/check-availability  { phone, date }  →  { exists: bool }
//
//  Regla: una misma persona (teléfono) NO puede tener dos citas el
//  MISMO día, pero SÍ en días distintos.
//  Si algo falla, devuelve exists:false (preferimos dejar reservar).
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
  res.setHeader('Access-Control-Allow-Origin',  process.env.SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const body = await readBody(req);
  // Límites estrictos (anti-abuso)
  const date = (body.date || '').toString().slice(0, 20).trim();
  const phoneRaw = body.phone ? String(body.phone).slice(0, 30) : '';
  const phoneDigits = phoneRaw.replace(/\D/g, '');

  if (!date || phoneDigits.length < 7) {
    return res.status(200).json({ exists: false });
  }

  try {
    const { data: appts, error } = await supabase
      .from('appointments')
      .select('client_phone, status, date')
      .eq('status', 'confirmed')
      .eq('date', date);

    if (error) {
      console.error('[check-availability]', error.message);
      return res.status(200).json({ exists: false });
    }

    const exists = (appts || []).some(a =>
      a.client_phone && a.client_phone.replace(/\D/g, '').includes(phoneDigits.slice(-7))
    );

    return res.status(200).json({ exists });
  } catch (e) {
    console.error('[check-availability] exception:', e.message);
    return res.status(200).json({ exists: false });
  }
};
