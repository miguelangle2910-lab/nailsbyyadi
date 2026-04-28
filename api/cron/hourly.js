// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — Cron por Hora
//  GET /api/cron/hourly  (llamado por Vercel Cron cada hora)
//
//  Detecta citas que empiezan en los próximos 55–75 minutos
//  y envía recordatorio "1 hora antes" al cliente
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SITE_URL    = process.env.SITE_URL || 'https://nailsbyyadi.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET || '';

const SERVICES = require('../_services.json');
function svcName(id) {
  const s = SERVICES.find(sv => sv.id === id);
  return s ? s.name_es : id;
}

async function sendEmail(type, to, data) {
  const res = await fetch(`${SITE_URL}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, to, data }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

module.exports = async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now   = new Date();
  const today = now.toISOString().split('T')[0];

  // Traer citas de hoy
  const { data: appts, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', today)
    .eq('status', 'confirmed');

  if (error) return res.status(500).json({ error: error.message });

  const results = { checked: appts.length, sent: 0, errors: [] };

  for (const appt of appts || []) {
    // Calcular cuántos minutos faltan para la cita
    const apptTime = new Date(`${today}T${appt.time}:00`);
    const diffMins = (apptTime - now) / 1000 / 60;

    // Ventana: 55–75 min antes (evita doble envío si el cron se retrasa un poco)
    if (diffMins >= 55 && diffMins <= 75) {
      try {
        await sendEmail('client_reminder_hour', appt.client_email, {
          clientName:  appt.client_name,
          serviceName: svcName(appt.service_id),
          time:        appt.time,
          apptId:      appt.id,
        });
        results.sent++;
        console.log(`[hourly] 1h reminder → ${appt.client_email} (${appt.time})`);
      } catch (e) {
        results.errors.push(`${appt.id}: ${e.message}`);
        console.error(`[hourly] Error:`, e.message);
      }
    }
  }

  console.log('[hourly] Done:', results);
  res.status(200).json({ success: true, ...results });
};
