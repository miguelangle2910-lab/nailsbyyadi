// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — Cloud Data Layer
//  Cargado DESPUÉS de data.js y config.js
//
//  Si NBY_CLOUD === true (Supabase configurado):
//    • Sobreescribe createAppointment() para guardar en Supabase
//    • Sobreescribe joinQueue() para guardar en Supabase
//    • Lee citas/cola desde Supabase en lugar de localStorage
//
//  Si NBY_CLOUD === false: no hace nada, data.js toma el control.
// ═══════════════════════════════════════════════════════════════

(function () {
  if (!window.NBY_CLOUD) return;   // modo demo: salir sin hacer nada

  const cfg = window.NBY_CONFIG;

  // ── Cliente Supabase (cargado desde CDN en el HTML) ──────────
  const { createClient } = window.supabase;
  const db = createClient(cfg.supabaseUrl, cfg.supabaseKey);

  // ── Helper: llamar /api/send-email ───────────────────────────
  async function sendEmail(type, to, data) {
    try {
      const res = await fetch(`${cfg.siteUrl}/api/send-email`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, to, data }),
      });
      if (!res.ok) console.warn('[cloud] send-email HTTP', res.status);
    } catch (e) {
      console.warn('[cloud] send-email error:', e.message);
    }
  }

  // ── Reemplazar createAppointment ─────────────────────────────
  window.createAppointment = async function (data) {
    // 1. Guardar en localStorage como fallback inmediato
    const appts = getAppointments();
    const appt  = {
      id:        'APT-' + Date.now(),
      ...data,
      status:    'confirmed',
      createdAt: new Date().toISOString(),
    };
    appts.push(appt);
    saveAppointments(appts);

    // 2. Guardar en Supabase
    const { error } = await db.from('appointments').insert({
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
    });

    if (error) console.error('[cloud] Supabase insert error:', error.message);

    // 3. Enviar correos de confirmación (cliente + propietaria)
    const svc  = SERVICES.find(s => s.id === appt.serviceId);
    const svcN = svc ? svc.name_es : appt.serviceId;
    const fmtDate = (str) => {
      const d = new Date(str + 'T12:00:00');
      return d.toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    };

    // Correo al cliente
    await sendEmail('booking_confirmation', appt.clientEmail, {
      clientName:  appt.clientName,
      serviceName: svcN,
      date:        fmtDate(appt.date),
      time:        appt.time,
      payment:     appt.payment || 'Efectivo',
      apptId:      appt.id,
      siteUrl:     cfg.siteUrl,
    });

    // Correo a Yadi
    await sendEmail('owner_notification', cfg.ownerEmail, {
      clientName:  appt.clientName,
      clientPhone: appt.clientPhone,
      serviceName: svcN,
      date:        fmtDate(appt.date),
      time:        appt.time,
      payment:     appt.payment || 'Efectivo',
      apptId:      appt.id,
    });

    return appt;
  };

  // ── Reemplazar joinQueue ─────────────────────────────────────
  //  (si existe joinQueue en data.js)
  if (typeof window.joinQueue === 'function' || typeof joinQueue !== 'undefined') {
    window.joinQueue = async function (data) {
      // 1. localStorage como fallback
      const queue = getQueue ? getQueue() : [];
      const entry = {
        id:          'Q-' + Date.now(),
        ...data,
        status:      'waiting',
        position:    queue.filter(e => e.status === 'waiting').length + 1,
        createdAt:   new Date().toISOString(),
      };
      if (typeof saveQueue === 'function') {
        queue.push(entry);
        saveQueue(queue);
      }

      // 2. Guardar en Supabase
      const { error } = await db.from('queue_entries').insert({
        id:           entry.id,
        client_name:  entry.clientName,
        client_phone: entry.clientPhone,
        client_email: entry.clientEmail || null,
        service_id:   entry.serviceId,
        notes:        entry.notes || null,
        status:       'waiting',
      });

      if (error) console.error('[cloud] Queue insert error:', error.message);
      return entry;
    };
  }

  // ── isSlotTaken: síncrono usando localStorage (UI inmediata) ──
  //  book.html la llama síncronamente — dejamos la versión de data.js.
  //  La fuente de verdad es Supabase pero se sincroniza en background.
  //  (No sobreescribir aquí para evitar que una Promise truthy bloquee todos los slots)

  // ── getAppointmentsByDate y cancelAppointment ────────────────
  //  Se dejan las versiones síncronas de data.js para la UI.
  //  Supabase se usa solo para guardar (createAppointment).

  console.info('☁️  Nails by Yadi — Cloud Layer activo (Supabase)');
})();
