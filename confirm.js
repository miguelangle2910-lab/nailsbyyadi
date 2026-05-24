// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — API: Confirmar cita por email
//  GET /api/confirm?id=APT-XXX&token=XXX
//
//  Cuando la cliente hace clic en "Confirmar mi cita" del email,
//  marca la cita como confirmada y notifica a Yadi.
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
      console.error('[confirm] sendEmail error:', err.error || res.status);
    }
  } catch (e) {
    console.error('[confirm] sendEmail exception:', e.message);
  }
}

// Página HTML que se le muestra al cliente después de confirmar
function pageHTML(title, message, color, emoji) {
  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} — Nails by Yadi</title>
<style>
  body{margin:0;padding:40px 20px;background:linear-gradient(135deg,#fce4f3,#f7f0fb);min-height:100vh;
       font-family:'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center}
  .card{background:#fff;border-radius:18px;max-width:500px;padding:40px 30px;text-align:center;
        box-shadow:0 10px 40px rgba(0,0,0,.1)}
  .emoji{font-size:64px;margin-bottom:14px}
  h1{color:${color};margin:0 0 12px;font-size:26px}
  p{color:#555;font-size:15px;line-height:1.6;margin:8px 0}
  .btn{display:inline-block;background:linear-gradient(135deg,#e91e8c,#9c27b0);color:#fff;
       text-decoration:none;padding:13px 30px;border-radius:50px;font-weight:700;margin-top:20px}
</style></head><body>
<div class="card">
  <div class="emoji">${emoji}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="${SITE_URL}" class="btn">← Volver al inicio</a>
</div></body></html>`;
}

module.exports = async function handler(req, res) {
  const { id, token } = req.query || {};

  if (!id) {
    res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(pageHTML('Error', 'Falta el código de cita.', '#c62828', '❌'));
  }

  // Buscar la cita
  const { data: appt, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !appt) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(pageHTML('Cita no encontrada', `No encontramos una cita con el código <strong>${id}</strong>.`, '#c62828', '❓'));
  }

  // Validar token (si existe en la cita)
  if (appt.cancel_token && token !== appt.cancel_token) {
    res.status(403).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(pageHTML('Link inválido', 'Este link expiró o no es válido. Si crees que hay un error, escríbenos.', '#c62828', '🔒'));
  }

  // Si ya está cancelada
  if (appt.status === 'cancelled') {
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(pageHTML('Cita cancelada', 'Esta cita ya está cancelada. No se puede confirmar.', '#c62828', '✗'));
  }

  // Si ya estaba confirmada por el cliente
  if (appt.client_confirmed) {
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(pageHTML('Ya está confirmada', `Tu cita del <strong>${fmtDate(appt.date)} a las ${appt.time}</strong> ya estaba confirmada. ¡Te esperamos! 💅`, '#2e7d32', '✅'));
  }

  // Marcar como confirmada
  const { error: updateError } = await supabase
    .from('appointments')
    .update({
      client_confirmed: true,
      client_confirmed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('[confirm] update error:', updateError.message);
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(pageHTML('Error', 'Hubo un error al confirmar tu cita. Por favor escríbenos.', '#c62828', '⚠️'));
  }

  // Notificar a Yadi (background, no bloquea respuesta al cliente)
  sendEmail('owner_client_confirmed', OWNER_EMAIL, {
    clientName:  appt.client_name,
    serviceName: svcName(appt.service_id),
    date:        fmtDate(appt.date),
    time:        appt.time,
    apptId:      appt.id,
  });

  // Mostrar página de éxito
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(pageHTML(
    '¡Cita confirmada!',
    `Gracias <strong>${appt.client_name}</strong>. Tu cita del <strong>${fmtDate(appt.date)} a las ${appt.time}</strong> está confirmada. ¡Nos vemos! 💅`,
    '#2e7d32',
    '✅'
  ));
};
