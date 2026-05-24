// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — API: Cancelar cita
//  POST /api/cancel  body: { id, token?, phone? }
//
//  Permite cancelar:
//  - Por código APT-XXX + token (link del email)
//  - Por código APT-XXX + teléfono (auto-servicio)
//
//  Después de cancelar:
//  1. Marca la cita como cancelled
//  2. Busca el primero de la cola para ese horario
//  3. Le notifica que se liberó el turno
//  4. Notifica a Yadi
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SITE_URL    = process.env.SITE_URL    || 'https://nailsbyyadi-site.vercel.app';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'miguelangle2910@gmail.com';

const SERVICES = require('./_services.json');
function svcName(id) {
  const s = SERVICES.find(sv => sv.id === id);
  return s ? s.name_es : id;
}

function fmtDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function sendEmail(type, to, data) {
  try {
    const res = await fetch(`${SITE_URL}/api/send-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, to, data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[cancel] sendEmail error:', err.error || res.status);
    }
  } catch (e) {
    console.error('[cancel] sendEmail exception:', e.message);
  }
}

module.exports = async function handler(req, res) {
  // CORS para llamadas desde el frontend
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { id, token, phone } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Falta el código de cita (id)' });

  // Buscar la cita
  const { data: appt, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !appt) {
    return res.status(404).json({ error: 'No encontramos una cita con ese código' });
  }

  // Validar identidad: o token (del email) o teléfono coincide
  const tokenOk = appt.cancel_token && token && appt.cancel_token === token;
  const phoneOk = phone && appt.client_phone && (
    appt.client_phone.replace(/\D/g, '').includes(phone.replace(/\D/g, '').slice(-7))
  );

  if (!tokenOk && !phoneOk) {
    return res.status(403).json({ error: 'No coincide el teléfono o el link expiró' });
  }

  // Si ya está cancelada
  if (appt.status === 'cancelled') {
    return res.status(200).json({ success: true, alreadyCancelled: true, message: 'Esta cita ya estaba cancelada' });
  }

  // Cancelar la cita
  const { error: updateError } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('[cancel] update error:', updateError.message);
    return res.status(500).json({ error: 'Error al cancelar la cita' });
  }

  // Buscar el primer cliente en cola para este slot
  const { data: queueEntries, error: qErr } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('date', appt.date)
    .eq('time', appt.time)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true })
    .limit(1);

  let queueNotified = false;
  if (!qErr && queueEntries && queueEntries.length > 0) {
    const queueEntry = queueEntries[0];

    // Marcar como notificado
    await supabase
      .from('queue_entries')
      .update({ status: 'notified' })
      .eq('id', queueEntry.id);

    // Email al primer cliente en cola
    if (queueEntry.client_email) {
      sendEmail('queue_slot_opened', queueEntry.client_email, {
        clientName:  queueEntry.client_name,
        serviceName: svcName(queueEntry.service_id),
        date:        fmtDate(appt.date),
        time:        appt.time,
        queueId:     queueEntry.id,
        siteUrl:     SITE_URL,
      });
    }
    queueNotified = true;
  }

  // Notificar a Yadi
  sendEmail('owner_client_cancelled', OWNER_EMAIL, {
    clientName:  appt.client_name,
    serviceName: svcName(appt.service_id),
    date:        fmtDate(appt.date),
    time:        appt.time,
    apptId:      appt.id,
    queueNotified,
  });

  return res.status(200).json({
    success:       true,
    cancelled:     true,
    queueNotified,
    message:       queueNotified
      ? 'Cita cancelada. Le notificamos a la primera persona en cola.'
      : 'Cita cancelada. No había nadie en cola para este horario.',
  });
};
