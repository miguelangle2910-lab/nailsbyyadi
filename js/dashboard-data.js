// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — Dashboard Data Layer (Supabase)
//  Lee citas y cola directamente de Supabase para que Yadi vea
//  TODAS las reservas (las suyas y las que hacen los clientes online).
// ═══════════════════════════════════════════════════════════════

(function () {
  if (!window.NBY_CLOUD || !window.NBY_CONFIG) {
    console.warn('[dashboard-data] NBY_CLOUD o NBY_CONFIG no disponibles — usando localStorage');
    return;
  }

  // Cliente Supabase (publishable key, segura para frontend)
  const db = window.supabase.createClient(
    window.NBY_CONFIG.supabaseUrl,
    window.NBY_CONFIG.supabaseKey
  );

  // ── Cache local (se refresca cada vez que llamamos refreshFromCloud) ──
  let _cloudAppts = [];
  let _cloudQueue = [];
  let _cloudSettings = null;
  let _lastFetch  = 0;

  // Convierte una fila de Supabase al formato que espera el dashboard
  function mapAppt(row) {
    return {
      id:               row.id,
      date:             row.date,
      time:             row.time,
      serviceId:        row.service_id,
      clientName:       row.client_name,
      clientPhone:      row.client_phone,
      clientEmail:      row.client_email,
      paymentType:      (row.payment === 'Depósito') ? 'deposit' : 'later',
      payment:          row.payment,
      status:           row.status,
      notes:            row.notes,
      clientConfirmed:  row.client_confirmed === true,
      cancelToken:      row.cancel_token,
      createdAt:        row.created_at,
    };
  }

  function mapQueue(row) {
    return {
      id:           row.id,
      date:         row.date,
      time:         row.time,
      serviceId:    row.service_id,
      name:         row.client_name,
      phone:        row.client_phone,
      email:        row.client_email,
      position:     row.position || 1,
      status:       row.status,
      createdAt:    row.created_at,
    };
  }

  // ── Refrescar datos desde Supabase ────────────────────────────
  async function refreshFromCloud() {
    try {
      // Citas — todas las del último año + futuras
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const fromDate = oneYearAgo.toISOString().split('T')[0];

      const { data: appts, error: e1 } = await db
        .from('appointments')
        .select('*')
        .gte('date', fromDate)
        .order('date', { ascending: false })
        .order('time', { ascending: true });

      if (e1) {
        console.error('[dashboard-data] Error citas:', e1.message);
      } else {
        _cloudAppts = (appts || []).map(mapAppt);
      }

      // Cola virtual — solo las que están waiting/notified
      const { data: queue, error: e2 } = await db
        .from('queue_entries')
        .select('*')
        .in('status', ['waiting', 'notified'])
        .order('created_at', { ascending: true });

      if (e2) {
        console.error('[dashboard-data] Error cola:', e2.message);
      } else {
        _cloudQueue = (queue || []).map(mapQueue);
      }

      // Settings del negocio
      const { data: settings, error: e3 } = await db
        .from('business_settings')
        .select('*')
        .eq('id', 'main')
        .single();

      if (!e3 && settings) {
        _cloudSettings = settings;
      }

      _lastFetch = Date.now();
      console.info('[dashboard-data] ✅ Refrescado:', _cloudAppts.length, 'citas,', _cloudQueue.length, 'cola');
      return true;
    } catch (e) {
      console.error('[dashboard-data] Error refresh:', e.message);
      return false;
    }
  }

  // ── Sobrescribir las funciones globales que usa dashboard.html ──
  // Las funciones siguen siendo síncronas (devuelven el cache),
  // pero el cache se refresca cada vez que dashboard.html llama refreshAll.

  window.getAppointments       = function () { return _cloudAppts.slice(); };
  window.getAppointmentsByDate = function (dateStr) {
    return _cloudAppts.filter(a => a.date === dateStr && a.status !== 'cancelled');
  };
  window.getQueue              = function () { return _cloudQueue.slice(); };
  window.getBusinessSettings   = function () { return _cloudSettings || {}; };

  // ── Acciones (escriben a Supabase) ────────────────────────────
  window.markApptCloud = async function (id, status) {
    const updates = { status };
    if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();
    const { error } = await db
      .from('appointments')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('[dashboard-data] markAppt error:', error.message);
      return false;
    }
    await refreshFromCloud();
    return true;
  };

  window.removeQueueCloud = async function (id) {
    const { error } = await db
      .from('queue_entries')
      .update({ status: 'expired' })
      .eq('id', id);
    if (error) console.error('[dashboard-data] removeQueue error:', error.message);
    await refreshFromCloud();
    return !error;
  };

  window.notifyQueueCloud = async function (id) {
    const { error } = await db
      .from('queue_entries')
      .update({ status: 'notified' })
      .eq('id', id);
    if (error) console.error('[dashboard-data] notifyQueue error:', error.message);
    await refreshFromCloud();
    return !error;
  };

  window.saveBusinessSettings = async function (changes) {
    const { error } = await db
      .from('business_settings')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', 'main');
    if (error) console.error('[dashboard-data] saveSettings error:', error.message);
    await refreshFromCloud();
    return !error;
  };

  // ── Exponer refreshFromCloud globalmente ──────────────────────
  window.refreshFromCloud = refreshFromCloud;

  // Carga inicial al entrar al dashboard
  refreshFromCloud();

  console.info('☁️  Dashboard conectado a Supabase');
})();
