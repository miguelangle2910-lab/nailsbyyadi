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

  // ── Sobrescribir isSlotTaken para consultar Supabase ─────────
  window.isSlotTaken = async function (dateStr, time) {
    // Verificar en localStorage primero (respuesta inmediata)
    const local = getAppointments().some(
      a => a.date === dateStr && a.time === time && a.status !== 'cancelled'
    );
    if (local) return true;

    // Verificar en Supabase (fuente de verdad)
    const { data, error } = await db
      .from('appointments')
      .select('id')
      .eq('date', dateStr)
      .eq('time', time)
      .eq('status', 'confirmed')
      .limit(1);

    if (error) { console.warn('[cloud] isSlotTaken error:', error.message); return false; }
    return data && data.length > 0;
  };

  // ── Sobrescribir getAppointmentsByDate para consultar Supabase
  window.getAppointmentsByDate = async function (dateStr) {
    const { data, error } = await db
      .from('appointments')
      .select('*')
      .eq('date', dateStr)
      .eq('status', 'confirmed')
      .order('time');

    if (error) {
      console.warn('[cloud] getAppointmentsByDate error:', error.message);
      // fallback a localStorage
      return getAppointments().filter(a => a.date === dateStr && a.status !== 'cancelled');
    }

    // Normalizar campos snake_case → camelCase para compatibilidad con el resto del código
    return (data || []).map(normalizeAppt);
  };

  // ── Cancelar cita ────────────────────────────────────────────
  window.cancelAppointment = async function (apptId) {
    // localStorage
    const appts = getAppointments().map(a =>
      a.id === apptId ? { ...a, status: 'cancelled' } : a
    );
    saveAppointments(appts);

    // Supabase
    const { error } = await db
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', apptId);

    if (error) console.error('[cloud] cancelAppointment error:', error.message);
    return true;
  };

  // ── Helper: normalizar campos snake_case → camelCase ─────────
  function normalizeAppt(a) {
    return {
      id:          a.id,
      date:        a.date,
      time:        a.time,
      serviceId:   a.service_id,
      clientName:  a.client_name,
      clientPhone: a.client_phone,
      clientEmail: a.client_email,
      payment:     a.payment,
      status:      a.status,
      notes:       a.notes,
      createdAt:   a.created_at,
    };
  }

  console.info('☁️  Nails by Yadi — Cloud Layer activo (Supabase)');
})();
