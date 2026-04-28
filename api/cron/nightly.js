// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — Cron Nocturno (10pm todos los días)
//  GET /api/cron/nightly  (llamado por Vercel Cron)
//
//  1. Envía recordatorio "día anterior" a cada cliente con cita mañana
//  2. Envía resumen de mañana a Yadi
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // clave service_role (secreta, solo servidor)
);

const SITE_URL    = process.env.SITE_URL    || 'https://nailsbyyadi.vercel.app';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'miguelangle2910@gmail.com';
const OWNER_NAME  = process.env.OWNER_NAME  || 'Yadi';
const CRON_SECRET = process.env.CRON_SECRET || '';

// Servicios (mismo que data.js pero en JSON importable)
const SERVICES = require('../_services.json');
function svcName(id) {
  const s = SERVICES.find(sv => sv.id === id);
  return s ? s.name_es : id;
}
function svcPrice(id) {
  const s = SERVICES.find(sv => sv.id === id);
  return s ? s.price : 0;
}

async function sendEmail(type, to, data) {
  const res = await fetch(`${SITE_URL}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, to, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function fmtDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

module.exports = async function handler(req, res) {
  // Verificar que viene de Vercel Cron (seguridad básica)
  const auth = req.headers.authorization || '';
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tomorrow = tomorrowStr();
  console.log(`[nightly] Running for ${tomorrow}`);

  // Obtener citas confirmadas de mañana
  const { data: appts, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', tomorrow)
    .eq('status', 'confirmed')
    .order('time');

  if (error) {
    console.error('[nightly] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  const results = { date: tomorrow, total: appts.length, reminders: 0, summary: false, errors: [] };

  // 1. Recordatorio día anterior a cada cliente
  for (const appt of appts) {
    try {
      await sendEmail('client_reminder_day', appt.client_email, {
        clientName:  appt.client_name,
        serviceName: svcName(appt.service_id),
        date:        fmtDate(tomorrow),
        time:        appt.time,
        apptId:      appt.id,
      });
      results.reminders++;
      console.log(`[nightly] Reminder sent → ${appt.client_email} (${appt.id})`);
    } catch (e) {
      results.errors.push(`${appt.id}: ${e.message}`);
      console.error(`[nightly] Error sending to ${appt.client_email}:`, e.message);
    }
  }

  // 2. Resumen nocturno para Yadi
  try {
    await sendEmail('owner_daily_summary', OWNER_EMAIL, {
      ownerName: OWNER_NAME,
      date:      fmtDate(tomorrow),
      appointments: appts.map(a => ({
        time:        a.time,
        clientName:  a.client_name,
        clientPhone: a.client_phone,
        serviceName: svcName(a.service_id),
        price:       svcPrice(a.service_id),
      })),
    });
    results.summary = true;
    console.log(`[nightly] Owner summary sent → ${OWNER_EMAIL}`);
  } catch (e) {
    results.errors.push(`Owner summary: ${e.message}`);
    console.error('[nightly] Error sending owner summary:', e.message);
  }

  console.log('[nightly] Done:', results);
  res.status(200).json({ success: true, ...results });
};
