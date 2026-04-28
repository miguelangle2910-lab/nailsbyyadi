// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — API: Envío de Emails (Resend)
//  POST /api/send-email
//  Body: { type, to, data }
//  Types: booking_confirmation | client_reminder_day |
//         client_reminder_hour | owner_notification | owner_daily_summary
// ═══════════════════════════════════════════════════════════════

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || 'Nails by Yadi <onboarding@resend.dev>';
const BUSINESS = 'Nails by Yadi';
const ADDRESS  = '4377 Saturn Ave, West Palm Beach, FL 33406';

// ── Estilos base del email ────────────────────────────────────
const CSS = `
  body{margin:0;padding:20px;background:#f7f0fb;font-family:'Segoe UI',Arial,sans-serif}
  .card{background:#fff;border-radius:18px;max-width:580px;margin:0 auto;overflow:hidden;
        box-shadow:0 6px 32px rgba(0,0,0,.09)}
  .hd{background:linear-gradient(135deg,#e91e8c,#9c27b0);padding:34px 28px;text-align:center}
  .hd-logo{font-size:28px;margin-bottom:6px}
  .hd h1{color:#fff;margin:0 0 4px;font-size:22px;font-weight:700;letter-spacing:.3px}
  .hd p{color:rgba(255,255,255,.85);margin:0;font-size:13px}
  .body{padding:30px 28px}
  .greeting{font-size:15px;color:#333;margin-bottom:20px}
  .code-box{background:#fce4f3;border:2px dashed #e91e8c;border-radius:12px;padding:18px;
            text-align:center;margin:20px 0}
  .code-box .code{font-size:24px;font-weight:700;color:#e91e8c;letter-spacing:3px}
  .code-box .code-lbl{font-size:11px;color:#888;margin-top:5px}
  .details{background:#fdf6fb;border-radius:10px;overflow:hidden;margin:20px 0}
  .row{display:flex;justify-content:space-between;align-items:center;
       padding:11px 16px;border-bottom:1px solid #f0e0f8;font-size:14px}
  .row:last-child{border:none}
  .lbl{color:#888}
  .val{font-weight:600;color:#1a0a1e;text-align:right}
  .alert{border-radius:8px;padding:13px 16px;font-size:13px;margin:16px 0}
  .alert-info{background:#fce4f3;border-left:3px solid #e91e8c;color:#c2185b}
  .alert-warn{background:#fff8e8;border-left:3px solid #f59e0b;color:#92400e}
  .btn{display:inline-block;background:linear-gradient(135deg,#e91e8c,#9c27b0);color:#fff;
       text-decoration:none;padding:13px 30px;border-radius:50px;font-weight:700;
       font-size:14px;margin:8px 0;letter-spacing:.3px}
  .ft{background:#fdf6fb;padding:18px 28px;text-align:center;font-size:11px;color:#aaa;
      border-top:1px solid #f0e0f8}
  table.appts{width:100%;border-collapse:collapse}
  table.appts th{background:#f7f0fb;padding:9px 12px;text-align:left;font-size:11px;
                 color:#888;text-transform:uppercase;letter-spacing:.4px}
  table.appts td{padding:11px 12px;border-bottom:1px solid #f5eef9;font-size:13px;color:#333}
  table.appts tr:last-child td{border:none}
  .badge{background:#e91e8c;color:#fff;border-radius:50px;padding:2px 10px;
         font-size:11px;font-weight:600;display:inline-block}
`;

function wrap(content) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>${CSS}</style></head><body>${content}</body></html>`;
}

// ── Plantillas ────────────────────────────────────────────────

function tplBookingConfirmation({ clientName, serviceName, date, time, payment, apptId, siteUrl }) {
  return wrap(`<div class="card">
  <div class="hd">
    <div class="hd-logo">💅</div>
    <h1>¡Cita Confirmada!</h1>
    <p>${BUSINESS} · West Palm Beach, FL</p>
  </div>
  <div class="body">
    <p class="greeting">Hola <strong>${clientName}</strong>, tu cita está reservada. ¡Te esperamos! 🎉</p>
    <div class="code-box">
      <div class="code">${apptId}</div>
      <div class="code-lbl">Guarda este código — lo necesitas para cancelar</div>
    </div>
    <div class="details">
      <div class="row"><span class="lbl">💅 Servicio</span><span class="val">${serviceName}</span></div>
      <div class="row"><span class="lbl">📅 Fecha</span><span class="val">${date}</span></div>
      <div class="row"><span class="lbl">⏰ Hora</span><span class="val">${time}</span></div>
      <div class="row"><span class="lbl">💳 Pago</span><span class="val">${payment}</span></div>
      <div class="row"><span class="lbl">📍 Dirección</span><span class="val">${ADDRESS}</span></div>
    </div>
    <div class="alert alert-info">⏰ Recibirás un recordatorio automático el día anterior y 1 hora antes de tu cita.</div>
    <center><a href="${siteUrl || ''}" class="btn">Ver mis citas →</a></center>
  </div>
  <div class="ft">© ${BUSINESS} · Para cancelar escríbenos o usa el chatbot en el sitio web · Código: ${apptId}</div>
</div>`);
}

function tplClientReminderDay({ clientName, serviceName, date, time, apptId }) {
  return wrap(`<div class="card">
  <div class="hd">
    <div class="hd-logo">📅</div>
    <h1>Recordatorio: Cita Mañana</h1>
    <p>${BUSINESS} · West Palm Beach, FL</p>
  </div>
  <div class="body">
    <p class="greeting">Hola <strong>${clientName}</strong> 👋<br>Te recordamos que <strong>mañana</strong> tienes tu cita con nosotras.</p>
    <div class="details">
      <div class="row"><span class="lbl">💅 Servicio</span><span class="val">${serviceName}</span></div>
      <div class="row"><span class="lbl">📅 Fecha</span><span class="val">${date}</span></div>
      <div class="row"><span class="lbl">⏰ Hora</span><span class="val">${time}</span></div>
      <div class="row"><span class="lbl">📍 Dirección</span><span class="val">${ADDRESS}</span></div>
    </div>
    <div class="alert alert-warn">💡 Si necesitas cancelar, hazlo con al menos 2 horas de anticipación para que podamos ofrecerle el turno a otra persona.</div>
  </div>
  <div class="ft">© ${BUSINESS} · Código de cita: ${apptId}</div>
</div>`);
}

function tplClientReminderHour({ clientName, serviceName, time, apptId }) {
  return wrap(`<div class="card">
  <div class="hd">
    <div class="hd-logo">⏰</div>
    <h1>¡Tu cita es en 1 hora!</h1>
    <p>${BUSINESS} · West Palm Beach, FL</p>
  </div>
  <div class="body">
    <p class="greeting">Hola <strong>${clientName}</strong> 💅<br>Tu cita de <strong>${serviceName}</strong> es <strong>hoy a las ${time}</strong>. ¡Ya casi!</p>
    <div class="details">
      <div class="row"><span class="lbl">💅 Servicio</span><span class="val">${serviceName}</span></div>
      <div class="row"><span class="lbl">⏰ Hora</span><span class="val">${time}</span></div>
      <div class="row"><span class="lbl">📍 Dirección</span><span class="val">${ADDRESS}</span></div>
    </div>
    <div class="alert alert-info">🌸 ¡Te esperamos! Si tienes algún problema para llegar, escríbenos.</div>
  </div>
  <div class="ft">© ${BUSINESS} · Código: ${apptId}</div>
</div>`);
}

function tplOwnerNotification({ clientName, clientPhone, serviceName, date, time, payment, apptId }) {
  return wrap(`<div class="card">
  <div class="hd">
    <div class="hd-logo">🌸</div>
    <h1>Nueva Cita Reservada</h1>
    <p>${BUSINESS} · Panel de Yadira</p>
  </div>
  <div class="body">
    <p class="greeting">Se acaba de confirmar una nueva cita en el sistema.</p>
    <div class="details">
      <div class="row"><span class="lbl">👤 Cliente</span><span class="val">${clientName}</span></div>
      <div class="row"><span class="lbl">📱 Teléfono</span><span class="val">${clientPhone}</span></div>
      <div class="row"><span class="lbl">💅 Servicio</span><span class="val">${serviceName}</span></div>
      <div class="row"><span class="lbl">📅 Fecha</span><span class="val">${date}</span></div>
      <div class="row"><span class="lbl">⏰ Hora</span><span class="val">${time}</span></div>
      <div class="row"><span class="lbl">💳 Pago</span><span class="val">${payment}</span></div>
      <div class="row"><span class="lbl">🆔 Código</span><span class="val"><span class="badge">${apptId}</span></span></div>
    </div>
  </div>
  <div class="ft">© ${BUSINESS} · Notificación automática del sistema</div>
</div>`);
}

function tplOwnerDailySummary({ ownerName, date, appointments }) {
  const rows = appointments.length > 0
    ? appointments.map(a => `
      <tr>
        <td><strong>${a.time}</strong></td>
        <td>${a.clientName}</td>
        <td>${a.serviceName}</td>
        <td>${a.clientPhone}</td>
        <td>$${a.price || '—'}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">No hay citas para mañana 😊</td></tr>`;

  const totalRev = appointments.reduce((s, a) => s + (parseInt(a.price) || 0), 0);

  return wrap(`<div class="card">
  <div class="hd">
    <div class="hd-logo">📅</div>
    <h1>Tus citas de mañana</h1>
    <p>${date} · ${BUSINESS}</p>
  </div>
  <div class="body">
    <p class="greeting">Hola <strong>${ownerName}</strong> 👋 Aquí está tu resumen para mañana:</p>
    <div class="details" style="margin-bottom:16px">
      <div class="row"><span class="lbl">📋 Total citas</span><span class="val">${appointments.length}</span></div>
      <div class="row"><span class="lbl">💰 Ingresos estimados</span><span class="val" style="color:#e91e8c">$${totalRev}</span></div>
    </div>
    <table class="appts">
      <thead><tr>
        <th>Hora</th><th>Cliente</th><th>Servicio</th><th>Teléfono</th><th>Precio</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="ft">© ${BUSINESS} · Resumen automático enviado a las 10pm · Buenas noches Yadi 🌙</div>
</div>`);
}

// ── Handler principal ─────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, to, data } = req.body || {};
  if (!type || !to || !data) return res.status(400).json({ error: 'Missing type, to, or data' });

  let html, subject;

  try {
    switch (type) {
      case 'booking_confirmation':
        html    = tplBookingConfirmation(data);
        subject = `✅ Cita confirmada — ${data.date} ${data.time} · ${BUSINESS}`;
        break;
      case 'client_reminder_day':
        html    = tplClientReminderDay(data);
        subject = `📅 Recordatorio: Tu cita mañana a las ${data.time} — ${BUSINESS}`;
        break;
      case 'client_reminder_hour':
        html    = tplClientReminderHour(data);
        subject = `⏰ Tu cita es en 1 hora — ${BUSINESS}`;
        break;
      case 'owner_notification':
        html    = tplOwnerNotification(data);
        subject = `🌸 Nueva cita: ${data.clientName} · ${data.date} ${data.time}`;
        break;
      case 'owner_daily_summary':
        html    = tplOwnerDailySummary(data);
        subject = `📅 Tus citas de mañana (${data.appointments.length}) — ${BUSINESS}`;
        break;
      default:
        return res.status(400).json({ error: `Unknown email type: ${type}` });
    }

    const result = await resend.emails.send({ from: FROM, to: [to], subject, html });
    res.status(200).json({ success: true, id: result.data?.id });

  } catch (err) {
    console.error('[send-email] Error:', err);
    res.status(500).json({ error: err.message });
  }
};
