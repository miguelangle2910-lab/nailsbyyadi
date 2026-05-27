// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — API: Cancelar cita
//  POST /api/cancel  body: { id?, token?, phone?, name? }
//
//  Permite cancelar:
//  - Con NOMBRE + TELÉFONO (auto-servicio fácil y seguro)
//  - Por código APT-XXX + token (link del email)
//  - Por código APT-XXX (cuando el cliente elige de una lista)
//
//  Un teléfono puede tener varias citas en días distintos; si hay
//  más de una, devuelve la lista para que el cliente elija cuál.
//
//  Después de cancelar: marca cancelled, notifica al primero en cola
//  para ese horario, y notifica a Yadi.
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
  if (!id) return '';
  const str = String(id);
  if (str.includes(',')) {
    return str.split(',').map(x => {
      const s = SERVICES.find(sv => sv.id === x.trim());
      return s ? s.name_es : x.trim();
    }).join(' + ');
  }
  const s = SERVICES.find(sv => sv.id === str);
  return s ? s.name_es : str;
}

function fmtDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Normaliza nombres para comparar (minúsculas, sin acentos, sin símbolos)
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function namesMatch(storedName, enteredNorm) {
  const a = norm(storedName);
  if (!a || !enteredNorm) return false;
  return a.includes(enteredNorm) || enteredNorm.includes(a);
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

// Cancela una cita ya encontrada: marca cancelled, notifica cola y a Yadi.
async function doCancelAppt(appt) {
  await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', appt.id);

  const { data: queueEntries } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('date', appt.date)
    .eq('time', appt.time)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true })
    .limit(1);

  let queueNotified = false;
  if (queueEntries && queueEntries.length > 0) {
    const qe = queueEntries[0];
    await supabase.from('queue_entries').update({ status: 'notified' }).eq('id', qe.id);
    if (qe.client_email) {
      sendEmail('queue_slot_opened', qe.client_email, {
        clientName:  qe.client_name,
        serviceName: svcName(qe.service_id),
        date:        fmtDate(appt.date),
        time:        appt.time,
        queueId:     qe.id,
        siteUrl:     SITE_URL,
      });
    }
    queueNotified = true;
  }

  sendEmail('owner_client_cancelled', OWNER_EMAIL, {
    clientName:  appt.client_name,
    serviceName: svcName(appt.service_id),
    date:        fmtDate(appt.date),
    time:        appt.time,
    apptId:      appt.id,
    queueNotified,
  });

  return queueNotified;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { id, token, phone, name } = req.body || {};
  const phoneDigits = phone ? String(phone).replace(/\D/g, '') : '';
  const nameNorm    = norm(name);

  // ── Camino 1: con código de cita (link del email o elección de lista) ──
  if (id) {
    const { data: appt, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !appt) {
      return res.status(404).json({ error: 'No encontramos una cita con ese código' });
    }

    // Validar identidad: token del email O teléfono que coincide
    const tokenOk = appt.cancel_token && token && appt.cancel_token === token;
    const phoneOk = phoneDigits && appt.client_phone &&
      appt.client_phone.replace(/\D/g, '').includes(phoneDigits.slice(-7));

    if (!tokenOk && !phoneOk) {
      return res.status(403).json({ error: 'No coincide el teléfono o el link expiró' });
    }

    if (appt.status === 'cancelled') {
      return res.status(200).json({ success: true, alreadyCancelled: true, message: 'Esta cita ya estaba cancelada' });
    }

    const queueNotified = await doCancelAppt(appt);
    return res.status(200).json({
      success: true, cancelled: true, queueNotified,
      message: `Tu cita del ${fmtDate(appt.date)} a las ${appt.time} ha sido cancelada.`,
    });
  }

  // ── Camino 2: con NOMBRE + TELÉFONO (auto-servicio) ──
  if (phoneDigits.length >= 7) {
    if (!nameNorm) {
      return res.status(400).json({ error: 'Ingresa también tu nombre (igual que al reservar).' });
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: appts, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'confirmed')
      .gte('date', today);

    if (error) {
      console.error('[cancel] lookup error:', error.message);
      return res.status(500).json({ error: 'Error al buscar tus citas' });
    }

    const matches = (appts || [])
      .filter(a => a.client_phone && a.client_phone.replace(/\D/g, '').includes(phoneDigits.slice(-7)))
      .filter(a => namesMatch(a.client_name, nameNorm))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    if (matches.length === 0) {
      return res.status(404).json({ error: 'No encontramos una cita con ese nombre y teléfono. Revisa que estén escritos igual que al reservar.' });
    }

    if (matches.length === 1) {
      const queueNotified = await doCancelAppt(matches[0]);
      return res.status(200).json({
        success: true, cancelled: true, queueNotified,
        message: `Tu cita del ${fmtDate(matches[0].date)} a las ${matches[0].time} ha sido cancelada.`,
      });
    }

    // Varias citas (días distintos) → que el cliente elija
    return res.status(200).json({
      multiple: true,
      appointments: matches.map(a => ({
        id:        a.id,
        date:      a.date,
        dateLabel: fmtDate(a.date),
        time:      a.time,
        service:   svcName(a.service_id),
      })),
    });
  }

  return res.status(400).json({ error: 'Ingresa tu nombre y tu número de teléfono.' });
};
