// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — Cloud Data Layer
//  Cargado DESPUÉS de data.js y config.js
//
//  Estrategia: las funciones de UI siguen siendo síncronas
//  (localStorage). Supabase y emails corren en background.
// ═══════════════════════════════════════════════════════════════

(function () {
  if (!window.NBY_CLOUD) return;

  const cfg = window.NBY_CONFIG;

  // ── Cliente Supabase ──────────────────────────────────────────
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  // ── Helper: enviar email ──────────────────────────────────────
  function sendEmail(type, to, data) {
    fetch(cfg.siteUrl + '/api/send-email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, to, data }),
    }).catch(function(e) { console.warn('[cloud] send-email:', e.message); });
  }

  // ── Guardar cita en Supabase (background) ────────────────────
  function syncAppointment(appt) {
    db.from('appointments').insert({
      id:           appt.id,
      date:         appt.date,
      time:         appt.time,
      service_id:   appt.serviceId,
      client_name:  appt.clientName,
      client_phone: appt.clientPhone,
      client_email: appt.clientEmail,
      payment:      appt.payment || 'Efectivo',
      status:       'confirmed',
      notes:        appt.notes || null,
    }).then(function(res) {
      if (res.error) console.error('[cloud] Supabase insert:', res.error.message);
    });
  }

  // ── Interceptar createAppointment (síncrono) ─────────────────
  var _orig = window.createAppointment || createAppointment;
  window.createAppointment = function(data) {
    // 1. Llamar la versión original (síncrona, localStorage) → UI no se rompe
    var appt = _orig(data);

    // 2. En background: guardar en Supabase
    syncAppointment(appt);

    // 3. En background: enviar emails
    var svc  = typeof SERVICES !== 'undefined' ? SERVICES.find(function(s){ return s.id === appt.serviceId; }) : null;
    var svcN = svc ? svc.name_es : appt.serviceId;
    var d    = new Date((appt.date || '') + 'T12:00:00');
    var dateStr = d.toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    sendEmail('booking_confirmation', appt.clientEmail, {
      clientName:  appt.clientName,
      serviceName: svcN,
      date:        dateStr,
      time:        appt.time,
      payment:     appt.payment || 'Efectivo',
      apptId:      appt.id,
      siteUrl:     cfg.siteUrl,
    });

    sendEmail('owner_notification', cfg.ownerEmail, {
      clientName:  appt.clientName,
      clientPhone: appt.clientPhone,
      serviceName: svcN,
      date:        dateStr,
      time:        appt.time,
      payment:     appt.payment || 'Efectivo',
      apptId:      appt.id,
    });

    // 4. Devolver resultado síncrono (igual que antes)
    return appt;
  };

  console.info('☁️  Nails by Yadi — Cloud Layer activo');
})();
