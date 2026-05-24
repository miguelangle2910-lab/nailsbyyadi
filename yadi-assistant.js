// ═══════════════════════════════════════════════════════════════
//  Nails by Yadi — Asistente Virtual de Yadi (Dashboard)
//
//  Bot que entiende preguntas tipo:
//   - "dame mis citas de hoy"
//   - "muéstrame las citas de mañana"
//   - "qué tengo esta semana"
//   - "lista de citas próximas 3 semanas"
//   - "quiénes están en cola"
//   - "ingresos de hoy"
//   - "cuántas citas tengo confirmadas"
// ═══════════════════════════════════════════════════════════════

(function () {

  // ── Helpers de fechas ─────────────────────────────────────────
  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }
  function addDaysISO(d, n) {
    const x = new Date(d + 'T12:00:00');
    x.setDate(x.getDate() + n);
    return x.toISOString().split('T')[0];
  }
  function fmtDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ── Acceso a los datos (vienen de dashboard-data.js) ─────────
  function getAllAppts() {
    return (typeof window.getAppointments === 'function') ? window.getAppointments() : [];
  }
  function getQ() {
    return (typeof window.getQueue === 'function') ? window.getQueue() : [];
  }
  function svcName(id) {
    if (typeof window.getServiceById === 'function') {
      const s = window.getServiceById(id);
      return s ? (s.name_es || id) : id;
    }
    return id;
  }
  function svcPrice(id) {
    if (typeof window.getServiceById === 'function') {
      const s = window.getServiceById(id);
      return s ? s.price : 0;
    }
    return 0;
  }

  // ── Filtros por rango de fechas ───────────────────────────────
  function apptsBetween(fromISO, toISO) {
    return getAllAppts()
      .filter(a => a.status !== 'cancelled' && a.date >= fromISO && a.date <= toISO)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  // ── Formateo de listas para mostrar ──────────────────────────
  function formatApptList(appts, opts = {}) {
    if (appts.length === 0) {
      return `<div style="padding:12px;color:#888;font-style:italic">No hay citas en este rango. 😊</div>`;
    }

    const rows = appts.map(a => {
      const confirmIcon = a.clientConfirmed
        ? '<span style="color:#2e7d32;font-weight:600">✓ Confirmó</span>'
        : '<span style="color:#f59e0b">⏳ Sin confirmar</span>';
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8;font-weight:600">${a.date.slice(5)}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8">${a.time}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8">${a.clientName}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8;font-size:.8rem">${svcName(a.serviceId)}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8;font-size:.78rem">${confirmIcon}</td>
      </tr>`;
    }).join('');

    const totalRev = appts.reduce((s, a) => s + svcPrice(a.serviceId), 0);

    return `
      <div style="margin:6px 0">
        <table style="width:100%;border-collapse:collapse;font-size:.83rem">
          <thead>
            <tr style="background:#fce4f3">
              <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">Fecha</th>
              <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">Hora</th>
              <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">Cliente</th>
              <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">Servicio</th>
              <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:10px;padding:10px;background:#f7f0fb;border-radius:8px;font-size:.85rem">
          📊 <strong>${appts.length}</strong> citas · 💰 Ingresos estimados: <strong style="color:#e91e8c">$${totalRev}</strong>
        </div>
      </div>
    `;
  }

  function formatQueue(queue) {
    if (queue.length === 0) {
      return `<div style="padding:12px;color:#888;font-style:italic">No hay nadie en la cola virtual ahora mismo. 🎉</div>`;
    }
    const rows = queue.map((q, i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8;font-weight:600">#${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8">${q.name}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8;font-size:.8rem">${q.phone}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8;font-size:.8rem">${q.date} ${q.time}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0f8;font-size:.8rem">${svcName(q.serviceId)}</td>
      </tr>
    `).join('');
    return `
      <table style="width:100%;border-collapse:collapse;font-size:.83rem">
        <thead><tr style="background:#fce4f3">
          <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">#</th>
          <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">Cliente</th>
          <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">Teléfono</th>
          <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">Slot</th>
          <th style="padding:8px;text-align:left;font-size:.72rem;color:#888">Servicio</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ── Procesador de la pregunta del usuario ─────────────────────
  function processQuestion(q) {
    const text = (q || '').toLowerCase().trim();
    if (!text) return { html: '<i style="color:#888">Escribe algo para empezar...</i>' };

    // ── Cola virtual ─────────────────────────────────────────
    if (/(cola|espera|waitlist|queue)/.test(text)) {
      const queue = getQ();
      return {
        html: `<p style="margin:6px 0">🕐 <strong>Cola virtual actual:</strong></p>${formatQueue(queue)}`
      };
    }

    // ── Ingresos / dinero ────────────────────────────────────
    if (/(ingres|cuanto.*gan|cuánto.*gan|dinero|revenue|ganancia|cobr)/.test(text)) {
      let from = todayISO(), to = todayISO();
      if (/semana/.test(text)) { from = todayISO(); to = addDaysISO(from, 7); }
      else if (/mes/.test(text)) { from = todayISO(); to = addDaysISO(from, 30); }
      else if (/mañana|manana/.test(text)) { from = addDaysISO(todayISO(), 1); to = from; }

      const appts = apptsBetween(from, to);
      const total = appts.reduce((s, a) => s + svcPrice(a.serviceId), 0);
      return {
        html: `<p>💰 Ingresos estimados (${fmtDate(from)} → ${fmtDate(to)}):</p>
               <p style="font-size:1.6rem;color:#e91e8c;font-weight:700;margin:10px 0">$${total}</p>
               <p style="font-size:.85rem;color:#888">${appts.length} citas confirmadas en ese rango</p>`
      };
    }

    // ── Confirmadas vs sin confirmar ─────────────────────────
    if (/(confirm)/.test(text)) {
      let from = todayISO(), to = addDaysISO(from, 7);
      if (/hoy/.test(text)) to = from;
      else if (/mañana|manana/.test(text)) { from = addDaysISO(todayISO(), 1); to = from; }

      const appts = apptsBetween(from, to);
      const conf  = appts.filter(a => a.clientConfirmed).length;
      const pend  = appts.length - conf;
      return {
        html: `<p>📋 Citas entre ${fmtDate(from)} y ${fmtDate(to)}:</p>
               <p>✅ <strong>${conf}</strong> confirmadas por el cliente · ⏳ <strong>${pend}</strong> sin confirmar</p>
               ${formatApptList(appts)}`
      };
    }

    // ── Hoy ──────────────────────────────────────────────────
    if (/hoy/.test(text)) {
      const today = todayISO();
      const appts = apptsBetween(today, today);
      return { html: `<p>📅 <strong>Citas de hoy</strong> (${fmtDate(today)}):</p>${formatApptList(appts)}` };
    }

    // ── Mañana ───────────────────────────────────────────────
    if (/(mañana|manana|tomorrow)/.test(text)) {
      const m = addDaysISO(todayISO(), 1);
      const appts = apptsBetween(m, m);
      return { html: `<p>📅 <strong>Citas de mañana</strong> (${fmtDate(m)}):</p>${formatApptList(appts)}` };
    }

    // ── X semanas / días ────────────────────────────────────
    const matchSemanas = text.match(/(\d+)\s*semana/);
    if (matchSemanas) {
      const n = parseInt(matchSemanas[1]);
      const from = todayISO(), to = addDaysISO(from, n * 7);
      const appts = apptsBetween(from, to);
      return { html: `<p>📅 <strong>Próximas ${n} semana(s)</strong> (${fmtDate(from)} → ${fmtDate(to)}):</p>${formatApptList(appts)}` };
    }
    const matchDias = text.match(/(\d+)\s*d[ií]a/);
    if (matchDias) {
      const n = parseInt(matchDias[1]);
      const from = todayISO(), to = addDaysISO(from, n);
      const appts = apptsBetween(from, to);
      return { html: `<p>📅 <strong>Próximos ${n} día(s)</strong> (${fmtDate(from)} → ${fmtDate(to)}):</p>${formatApptList(appts)}` };
    }

    // ── Esta semana ──────────────────────────────────────────
    if (/(esta semana|semana|week)/.test(text)) {
      const from = todayISO(), to = addDaysISO(from, 7);
      const appts = apptsBetween(from, to);
      return { html: `<p>📅 <strong>Esta semana</strong> (${fmtDate(from)} → ${fmtDate(to)}):</p>${formatApptList(appts)}` };
    }

    // ── Este mes ─────────────────────────────────────────────
    if (/(este mes|mes|month)/.test(text)) {
      const from = todayISO(), to = addDaysISO(from, 30);
      const appts = apptsBetween(from, to);
      return { html: `<p>📅 <strong>Próximos 30 días</strong> (${fmtDate(from)} → ${fmtDate(to)}):</p>${formatApptList(appts)}` };
    }

    // ── Buscar por nombre ────────────────────────────────────
    const matchBuscar = text.match(/(busca|buscar|find|client[ea]?\s+)\s*([a-záéíóúñ]+)/i);
    if (matchBuscar && matchBuscar[2]) {
      const nombre = matchBuscar[2];
      const all = getAllAppts().filter(a =>
        a.status !== 'cancelled' &&
        a.clientName.toLowerCase().includes(nombre.toLowerCase())
      );
      return { html: `<p>🔍 Citas de cliente que contienen "<strong>${nombre}</strong>":</p>${formatApptList(all)}` };
    }

    // ── Ayuda ────────────────────────────────────────────────
    return {
      html: `
        <p>👋 ¡Hola Yadi! Soy tu asistente. Pregúntame cosas como:</p>
        <ul style="font-size:.88rem;line-height:1.7;color:#444;margin:10px 0;padding-left:20px">
          <li><em>"Dame mis citas de hoy"</em></li>
          <li><em>"Muéstrame las citas de mañana"</em></li>
          <li><em>"Qué tengo esta semana"</em></li>
          <li><em>"Citas próximas 3 semanas"</em></li>
          <li><em>"Cuántas confirmadas hay"</em></li>
          <li><em>"Quiénes están en cola"</em></li>
          <li><em>"Cuánto voy a ganar esta semana"</em></li>
          <li><em>"Buscar cliente María"</em></li>
        </ul>
      `
    };
  }

  // ── UI: Burbuja flotante + chat ──────────────────────────────
  function buildUI() {
    const html = `
      <button id="yadiBotFab" onclick="window.toggleYadiBot()"
              style="position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;
                     background:linear-gradient(135deg,#e91e8c,#9c27b0);color:#fff;border:none;
                     font-size:28px;cursor:pointer;box-shadow:0 6px 24px rgba(233,30,140,.4);
                     z-index:9998;display:flex;align-items:center;justify-content:center">💁‍♀️</button>

      <div id="yadiBotPanel"
           style="position:fixed;bottom:96px;right:24px;width:420px;max-width:calc(100vw - 48px);
                  height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:18px;
                  box-shadow:0 20px 60px rgba(0,0,0,.15);display:none;flex-direction:column;
                  overflow:hidden;z-index:9999">
        <div style="background:linear-gradient(135deg,#e91e8c,#9c27b0);color:#fff;padding:16px 20px;
                    display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-size:1rem">💁‍♀️ Asistente de Yadi</div>
            <div style="font-size:.72rem;opacity:.85">Pregúntame sobre tus citas</div>
          </div>
          <button onclick="window.toggleYadiBot()" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer">×</button>
        </div>
        <div id="yadiBotMessages" style="flex:1;overflow-y:auto;padding:14px;background:#fafafa">
          <div style="background:#fff;border-radius:12px;padding:12px;font-size:.88rem;color:#333;
                      box-shadow:0 1px 3px rgba(0,0,0,.05)">
            👋 ¡Hola Yadi! Pregúntame por tus citas, cola virtual, o ingresos.
          </div>
        </div>
        <div style="display:flex;gap:8px;padding:12px;border-top:1px solid #eee;background:#fff">
          <input id="yadiBotInput" type="text" placeholder="Ej: Dame mis citas de mañana"
                 onkeydown="if(event.key==='Enter') window.askYadiBot()"
                 style="flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:50px;
                        font-size:.88rem;outline:none">
          <button onclick="window.askYadiBot()"
                  style="background:linear-gradient(135deg,#e91e8c,#9c27b0);color:#fff;border:none;
                         border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:18px">→</button>
        </div>
      </div>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
  }

  window.toggleYadiBot = function () {
    const panel = document.getElementById('yadiBotPanel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      if (panel.style.display === 'flex') {
        const inp = document.getElementById('yadiBotInput');
        if (inp) inp.focus();
      }
    }
  };

  window.askYadiBot = function () {
    const inp = document.getElementById('yadiBotInput');
    const msg = (inp && inp.value || '').trim();
    if (!msg) return;
    if (inp) inp.value = '';

    const cont = document.getElementById('yadiBotMessages');
    if (!cont) return;

    // Mensaje del usuario
    const userBubble = document.createElement('div');
    userBubble.style.cssText = 'background:linear-gradient(135deg,#e91e8c,#9c27b0);color:#fff;border-radius:12px;padding:10px 14px;margin:8px 0 8px auto;max-width:80%;font-size:.88rem;width:fit-content;align-self:flex-end;text-align:right;margin-left:auto';
    userBubble.textContent = msg;
    cont.appendChild(userBubble);

    // Respuesta del bot
    const result = processQuestion(msg);
    const botBubble = document.createElement('div');
    botBubble.style.cssText = 'background:#fff;border-radius:12px;padding:12px;margin:8px 0;font-size:.85rem;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.05);max-width:90%';
    botBubble.innerHTML = result.html;
    cont.appendChild(botBubble);

    cont.scrollTop = cont.scrollHeight;
  };

  // Inicializar cuando el dashboard esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }

})();
