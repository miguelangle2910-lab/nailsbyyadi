// ============================================================
//  Nails by Yadi — Asistente Virtual (Chatbot)
//  Bilingüe ES/EN | Tour guiado | Cancelaciones | Reservas
// ============================================================

(function () {
  // ── CSS ───────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .chat-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 8000;
      width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg,#e91e8c,#9c27b0);
      color: #fff; border: none; font-size: 1.5rem;
      box-shadow: 0 4px 20px rgba(233,30,140,.45);
      cursor: pointer; transition: all .3s;
      display: flex; align-items: center; justify-content: center;
      animation: chatPulse 2.5s ease-in-out infinite;
    }
    @keyframes chatPulse { 0%,100%{box-shadow:0 4px 20px rgba(233,30,140,.45)} 50%{box-shadow:0 4px 32px rgba(233,30,140,.75)} }
    .chat-fab:hover { transform: scale(1.1); animation: none; }
    .chat-fab.open  { animation: none; }
    .chat-dot {
      position: absolute; top: -3px; right: -3px;
      background: #f44336; color: #fff; border-radius: 50%;
      width: 20px; height: 20px; font-size: .65rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; transition: all .3s;
    }
    .chat-dot.hidden { display: none; }
    .chat-panel {
      position: fixed; bottom: 100px; right: 28px; z-index: 8000;
      width: 340px; max-height: 560px;
      background: #fff; border-radius: 20px;
      box-shadow: 0 16px 56px rgba(0,0,0,.22);
      display: flex; flex-direction: column;
      transform: scale(.88) translateY(24px);
      opacity: 0; pointer-events: none;
      transition: all .28s cubic-bezier(.34,1.56,.64,1);
      transform-origin: bottom right;
      overflow: hidden;
    }
    .chat-panel.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    .chat-head {
      background: linear-gradient(135deg,#e91e8c,#9c27b0);
      color: #fff; padding: 14px 16px;
      display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    .chat-head-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; flex-shrink: 0;
    }
    .chat-head-name { font-weight: 600; font-size: .9rem; line-height: 1.2; }
    .chat-head-status { font-size: .7rem; opacity: .8; }
    .chat-head-close {
      margin-left: auto; background: none; border: none;
      color: #fff; font-size: 1.4rem; cursor: pointer;
      opacity: .8; padding: 0 4px; transition: opacity .2s;
    }
    .chat-head-close:hover { opacity: 1; }
    .chat-msgs {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
      min-height: 160px; max-height: 310px;
      scroll-behavior: smooth;
    }
    .chat-msgs::-webkit-scrollbar { width: 4px; }
    .chat-msgs::-webkit-scrollbar-thumb { background: #e0c0e8; border-radius: 4px; }
    .cmsg {
      max-width: 85%; padding: 9px 13px;
      border-radius: 14px; font-size: .83rem; line-height: 1.55;
      animation: msgPop .2s ease;
      white-space: pre-wrap; word-break: break-word;
    }
    @keyframes msgPop { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    .cmsg.bot {
      background: #f8f2fc; color: #333;
      border-radius: 4px 14px 14px 14px;
      align-self: flex-start;
    }
    .cmsg.bot a { color: #e91e8c; text-decoration: underline; }
    .cmsg.user {
      background: linear-gradient(135deg,#e91e8c,#9c27b0);
      color: #fff; border-radius: 14px 4px 14px 14px;
      align-self: flex-end;
    }
    .cmsg.typing { font-style: italic; color: #aaa; font-size: .78rem; }
    .chat-qr {
      padding: 8px 12px; display: flex; gap: 6px; flex-wrap: wrap;
      border-top: 1px solid #f0d0e8; flex-shrink: 0;
      max-height: 90px; overflow-y: auto;
    }
    .cqr {
      background: #fce4f0; color: #e91e8c;
      border: 1px solid #f0b0d8; border-radius: 50px;
      padding: 4px 11px; font-size: .73rem; font-weight: 500;
      cursor: pointer; transition: all .18s; white-space: nowrap;
      font-family: 'Poppins', sans-serif;
    }
    .cqr:hover { background: #e91e8c; color: #fff; border-color: #e91e8c; }
    .chat-input-row {
      display: flex; gap: 8px; padding: 10px 14px;
      border-top: 1px solid #f0d0e8; flex-shrink: 0;
    }
    .chat-inp {
      flex: 1; border: 1.5px solid #f0d0e8; border-radius: 50px;
      padding: 8px 14px; font-size: .83rem;
      font-family: 'Poppins', sans-serif; outline: none;
      transition: border-color .2s;
    }
    .chat-inp:focus { border-color: #e91e8c; }
    .chat-send {
      background: linear-gradient(135deg,#e91e8c,#9c27b0);
      color: #fff; border: none; border-radius: 50%;
      width: 36px; height: 36px; display: flex;
      align-items: center; justify-content: center;
      cursor: pointer; font-size: .9rem; flex-shrink: 0;
      transition: transform .2s;
    }
    .chat-send:hover { transform: scale(1.1); }

    /* Tour overlay */
    .tour-overlay {
      position: fixed; inset: 0; z-index: 7500;
      background: rgba(26,10,30,.7);
      pointer-events: none;
    }
    .tour-hole {
      position: absolute; background: transparent;
      box-shadow: 0 0 0 9999px rgba(26,10,30,.7);
      border-radius: 12px;
      transition: all .4s ease;
    }
    .tour-tip {
      position: fixed; z-index: 7600; background: #fff;
      border-radius: 16px; padding: 18px 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,.25);
      max-width: 260px; font-family: 'Poppins', sans-serif;
      animation: msgPop .3s ease;
    }
    .tour-tip h4 { font-size: .92rem; color: #1a0a1e; margin-bottom: 5px; font-family: 'Playfair Display', serif; }
    .tour-tip p  { font-size: .78rem; color: #777; line-height: 1.6; }
    .tour-tip-nav { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
    .tour-btn {
      padding: 5px 14px; border-radius: 50px; border: none;
      font-size: .75rem; font-weight: 600; cursor: pointer;
      font-family: 'Poppins', sans-serif;
    }
    .tour-btn-next { background: linear-gradient(135deg,#e91e8c,#9c27b0); color: #fff; }
    .tour-btn-skip { background: #f0d0e8; color: #e91e8c; }

    @media (max-width: 400px) {
      .chat-panel { width: calc(100vw - 24px); right: 12px; }
      .chat-fab   { right: 16px; bottom: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button class="chat-fab" id="chatFab" aria-label="Chat">
      <span id="chatFabIcon">💬</span>
      <span class="chat-dot" id="chatDot">1</span>
    </button>
    <div class="chat-panel" id="chatPanel">
      <div class="chat-head">
        <div class="chat-head-avatar">💅</div>
        <div>
          <div class="chat-head-name">Yadi Assistant</div>
          <div class="chat-head-status" id="chatStatusLine">● En línea</div>
        </div>
        <button class="chat-head-close" id="chatClose">×</button>
      </div>
      <div class="chat-msgs" id="chatMsgs"></div>
      <div class="chat-qr" id="chatQR"></div>
      <div class="chat-input-row">
        <input class="chat-inp" id="chatInp" type="text" placeholder="Escribe aquí..." autocomplete="off"/>
        <button class="chat-send" id="chatSend">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  // ── State ─────────────────────────────────────────────────
  const fab     = document.getElementById('chatFab');
  const panel   = document.getElementById('chatPanel');
  const dot     = document.getElementById('chatDot');
  const fabIcon = document.getElementById('chatFabIcon');
  const msgs    = document.getElementById('chatMsgs');
  const qrDiv   = document.getElementById('chatQR');
  const inp     = document.getElementById('chatInp');
  const sendBtn = document.getElementById('chatSend');
  const closeBtn= document.getElementById('chatClose');

  let isOpen    = false;
  let lang      = (typeof currentLang !== 'undefined' ? currentLang : localStorage.getItem('nby_lang')) || 'es';
  let awaitingCancel = false;
  let awaitingCancelPhone = false;
  let tourActive     = false;
  let tourStep       = 0;

  // ── Strings ───────────────────────────────────────────────
  const T = {
    es: {
      status:    '● En línea',
      placeholder: 'Escribe aquí...',
      greeting1: '¡Hola! 👋 Soy el asistente de **Nails by Yadi**.\n¿Es tu primera vez aquí?',
      greeting2: '¡Bienvenida de nuevo! 💅 ¿En qué puedo ayudarte?',
      tour_offer:'Puedo darte una visita guiada para que veas todo lo que ofrecemos. ¿Te la muestro?',
      qr_first:  ['🗺️ Sí, muéstrame el tour','📅 Reservar una cita','💅 Ver servicios','❓ Tengo una pregunta'],
      qr_main:   ['📅 Reservar','💅 Servicios','💰 Precios','🕐 Cola virtual','⏰ Horarios','📍 Ubicación','❌ Cancelar cita'],
      book_msg:  '📅 **Para reservar:**\n1️⃣ Elige tu servicio (manicure, pedicure, acrílico...)\n2️⃣ Selecciona la fecha en el calendario\n3️⃣ Elige el horario disponible\n4️⃣ Ingresa tus datos y listo ✅\n\n👉 <a href="book.html">Ir a reservar →</a>',
      services_msg:'💅 **Nuestros servicios:**\n• Manicure (básico $20 · gel $35 · dip $40)\n• Pedicure (básico $30 · gel $45 · spa $55)\n• Acrílico (full set $55 · relleno $40)\n• Extensiones de gel ($65)\n• Nail art y extras\n\n👉 <a href="index.html#services">Ver catálogo completo →</a>',
      price_msg: '💰 **Precios populares:**\n• Manicure básico: $20\n• Gel manicure: $35\n• Acrílico full set: $55\n• Pedicure spa: $55\n• Extensiones gel: $65\n• Combo mani+pedi: $45\n\n👉 <a href="index.html#services">Ver todos los precios →</a>',
      queue_msg: '🕐 **Cola Virtual:**\nSi el horario que quieres está lleno, puedes unirte a la cola. Cuando alguien cancele:\n1. Te avisamos al instante 🔔\n2. Tienes 15 min para confirmar ✅\n3. ¡Tu cita queda lista!\n\n👉 <a href="queue.html">Ver mi posición en cola →</a>',
      hours_msg: '⏰ **Horario:**\n📅 Lun–Vie: 8:30 am – 6:00 pm\n📅 Sábados: 9:00 am – 4:00 pm\n🚫 Domingos: Cerrado\n\nPuedes reservar en línea las 24 horas 🌙',
      location_msg:'📍 **Dónde estamos:**\n4377 Saturn Ave\nWest Palm Beach, FL 33406\n\n📱 WhatsApp: (561) 555-YADI\n📸 Instagram: @nailsbyyadi\n\n👉 <a href="index.html#contact">Ver mapa →</a>',
      cancel_ask:'Para ayudarte a cancelar necesito tu **código de cita**.\nEjemplo: APT-1716000000\n\n¿Lo tienes a mano? 😊\n(O llámanos al ☎️ (561) 555-YADI)',
      cancel_ok: (id) => `✅ Cita **${id}** cancelada correctamente.\n\n📱 Se notificará a la primera persona en la cola de espera de ese horario.\n\n¿Quieres reservar otra cita? 👇`,
      cancel_notfound: (id) => `❌ No encontré ninguna cita con el código **${id}**.\n\nVerifica el código o llámanos:\n☎️ (561) 555-YADI`,
      reminder_msg: '⏰ **Recordatorio 1 hora antes:**\nSí, enviamos un mensaje automático 1 hora antes de tu cita para que no se te olvide.\nPuedes confirmar o cancelar directamente desde el mensaje. 😊',
      payment_msg: '💳 **Métodos de pago:**\n• Depósito de $10 al reservar (asegura tu lugar)\n• Pago completo en persona al llegar\n\nTú eliges cuál prefieres al moment de reservar.',
      default_msg:'No entendí del todo 😅 Aquí algunas opciones:',
      yes_tour:  '¡Perfecto! Vamos a ver el sitio juntas 🗺️',
      no_tour:   'Sin problema. ¿En qué más puedo ayudarte?',
      tour_done: '¡Tour completado! 🎉 Ahora ya conoces todo el sitio. ¿Quieres reservar tu cita ahora?',
      qr_after_cancel: ['📅 Reservar nueva cita','💅 Ver servicios','🏠 Inicio'],
      cancel_phone_notfound: '❌ No encontré citas activas con ese número de teléfono.\n\n¿Tienes el código APT? O llámanos:\n☎️ (561) 555-YADI',
      cancel_choose: (list) => '🔍 Encontré estas citas:\n\n' + list + '\n\nEscribe el **código** (APT-xxx) de la que deseas cancelar.',

    },
    en: {
      status:    '● Online',
      placeholder: 'Type here...',
      greeting1: 'Hi! 👋 I\'m the **Nails by Yadi** assistant.\nIs this your first visit?',
      greeting2: 'Welcome back! 💅 How can I help you?',
      tour_offer:'I can give you a quick tour to show you everything we offer. Want to see it?',
      qr_first:  ['🗺️ Yes, show me the tour','📅 Book an appointment','💅 View services','❓ I have a question'],
      qr_main:   ['📅 Book','💅 Services','💰 Prices','🕐 Virtual queue','⏰ Hours','📍 Location','❌ Cancel appointment'],
      book_msg:  '📅 **To book an appointment:**\n1️⃣ Choose your service\n2️⃣ Pick a date on the calendar\n3️⃣ Select an available time slot\n4️⃣ Enter your info and confirm ✅\n\n👉 <a href="book.html">Book now →</a>',
      services_msg:'💅 **Our services:**\n• Manicure (basic $20 · gel $35 · dip $40)\n• Pedicure (basic $30 · gel $45 · spa $55)\n• Acrylic (full set $55 · fill $40)\n• Gel Extensions ($65)\n• Nail art & extras\n\n👉 <a href="index.html#services">View full catalog →</a>',
      price_msg: '💰 **Popular prices:**\n• Basic manicure: $20\n• Gel manicure: $35\n• Full set acrylic: $55\n• Spa pedicure: $55\n• Gel extensions: $65\n• Mani+Pedi combo: $45\n\n👉 <a href="index.html#services">See all prices →</a>',
      queue_msg: '🕐 **Virtual Queue:**\nIf the time you want is fully booked, join the queue. When someone cancels:\n1. We notify you instantly 🔔\n2. You have 15 min to confirm ✅\n3. Your appointment is set!\n\n👉 <a href="queue.html">Check my queue position →</a>',
      hours_msg: '⏰ **Hours:**\n📅 Mon–Fri: 8:30 am – 6:00 pm\n📅 Saturdays: 9:00 am – 4:00 pm\n🚫 Sundays: Closed\n\nYou can book online 24/7 🌙',
      location_msg:'📍 **Location:**\n4377 Saturn Ave\nWest Palm Beach, FL 33406\n\n📱 WhatsApp: (561) 555-YADI\n📸 Instagram: @nailsbyyadi\n\n👉 <a href="index.html#contact">View map →</a>',
      cancel_ask:'To help you cancel, I need your **appointment code**.\nExample: APT-1716000000\n\nDo you have it handy? 😊\n(Or call us at ☎️ (561) 555-YADI)',
      cancel_ok: (id) => `✅ Appointment **${id}** cancelled.\n\n📱 The first person in the waitlist for that slot will be notified.\n\nWant to book another? 👇`,
      cancel_notfound: (id) => `❌ No appointment found with code **${id}**.\n\nDouble-check the code or call us:\n☎️ (561) 555-YADI`,
      reminder_msg: '⏰ **1-hour reminder:**\nYes! We send an automatic message 1 hour before your appointment so you don\'t forget.\nYou can confirm or cancel directly from the message. 😊',
      payment_msg: '💳 **Payment options:**\n• $10 deposit when booking (secures your spot)\n• Full payment in person when you arrive\n\nYou choose which you prefer when booking.',
      default_msg:'I didn\'t quite understand 😅 Here are some options:',
      yes_tour:  'Great! Let\'s explore the site together 🗺️',
      no_tour:   'No problem. How else can I help?',
      tour_done: 'Tour complete! 🎉 Now you know the whole site. Ready to book your appointment?',
      qr_after_cancel: ['📅 Book new appointment','💅 View services','🏠 Home'],
      cancel_phone_notfound: '❌ No active appointments found with that phone number.\n\nDo you have an APT code? Or call us:\n☎️ (561) 555-YADI',
      cancel_choose: (list) => '🔍 I found these appointments:\n\n' + list + '\n\nType the **code** (APT-xxx) of the one you want to cancel.',

    }
  };

  function s(key, ...args) {
    const val = T[lang][key];
    return typeof val === 'function' ? val(...args) : val;
  }

  // ── Tour steps ────────────────────────────────────────────
  const TOUR_STEPS_ES = [
    { selector: '.hero', title: '🏠 Página principal', text: 'Aquí está el hero del sitio. Puedes elegir una fecha y hora directamente desde esta tarjeta y hacer clic en "Reservar".' },
    { selector: '#services', title: '💅 Servicios', text: 'Desplázate a esta sección para ver todos nuestros servicios con precios y duración. Puedes filtrar por categoría.' },
    { selector: '#how', title: '📋 Cómo funciona', text: 'Aquí explicamos el proceso de reserva en 4 pasos simples. ¡Es muy fácil!' },
    { selector: '#queue-section', title: '🕐 Cola Virtual', text: 'Si el horario está lleno, no te vayas. Únete a la cola virtual y te avisamos si se libera un turno.' },
    { selector: '#contact', title: '📍 Contacto', text: 'Aquí encontrarás la dirección, horarios, teléfono e Instagram.' },
  ];

  const TOUR_STEPS_EN = [
    { selector: '.hero', title: '🏠 Home page', text: 'This is the hero section. You can pick a date and time right here and click "Book".' },
    { selector: '#services', title: '💅 Services', text: 'Scroll here to see all services with prices and duration. You can filter by category.' },
    { selector: '#how', title: '📋 How it works', text: 'We explain the 4-step booking process here. Super easy!' },
    { selector: '#queue-section', title: '🕐 Virtual Queue', text: 'If a slot is full, don\'t leave. Join the virtual queue and we\'ll notify you when it opens.' },
    { selector: '#contact', title: '📍 Contact', text: 'Find our address, hours, phone and Instagram here.' },
  ];

  function tourSteps() { return lang === 'en' ? TOUR_STEPS_EN : TOUR_STEPS_ES; }

  // ── Open / Close ──────────────────────────────────────────
  function openChat() {
    isOpen = true;
    panel.classList.add('open');
    fab.classList.add('open');
    fabIcon.textContent = '×';
    dot.classList.add('hidden');
    inp.focus();
  }

  function closeChat() {
    isOpen = false;
    panel.classList.remove('open');
    fab.classList.remove('open');
    fabIcon.textContent = '💬';
  }

  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  // ── Messaging ─────────────────────────────────────────────
  function addMsg(text, who, delay = 0) {
    return new Promise(resolve => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'cmsg ' + who;
        // Bold (**text**) and links
        div.innerHTML = text
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
        resolve();
      }, delay);
    });
  }

  function typingMsg(ms = 900) {
    return new Promise(resolve => {
      const div = document.createElement('div');
      div.className = 'cmsg bot typing';
      div.id = 'chatTyping';
      div.textContent = '● ● ●';
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      setTimeout(() => { div.remove(); resolve(); }, ms);
    });
  }

  async function botReply(text, qrs = null, delay = 400) {
    await typingMsg(delay);
    await addMsg(text, 'bot');
    setQR(qrs || s('qr_main'));
  }

  function setQR(options) {
    qrDiv.innerHTML = '';
    if (!options || options.length === 0) return;
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'cqr';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleUserMsg(opt));
      qrDiv.appendChild(btn);
    });
  }

  // ── Intent matching ───────────────────────────────────────
  function matchIntent(text) {
    const t = text.toLowerCase();
    // ⚠️ Check CANCEL first — "cancelar cita" contains "cita" which would match 'book'
    if (/cancel|cancela|anula|remove/.test(t))                  return 'cancel';
    if (text.includes('❌') || text.includes('Cancel'))         return 'cancel';
    // APT code
    if (/apt-\d+/i.test(text))                                  return 'apt_code';
    // Quick reply buttons
    if (text.includes('📅') || text.includes('Reservar') || text.includes('Book')) return 'book';
    if (text.includes('💅') || text.includes('Servic'))         return 'services';
    if (text.includes('💰') || text.includes('Preci') || text.includes('Price')) return 'price';
    if (text.includes('🕐') || text.includes('Cola') || text.includes('Queue')) return 'queue';
    if (text.includes('⏰') || text.includes('Horari') || text.includes('Hour')) return 'hours';
    if (text.includes('📍') || text.includes('Ubicaci') || text.includes('Location')) return 'location';
    if (text.includes('🗺️') || text.includes('Tour'))          return 'tour';
    if (text.includes('Inicio') || text.includes('Home'))       return 'home';
    // Keyword regexes
    if (/reserv|book|appointment|agenda|turno/.test(t))         return 'book';
    if (/servic|manicur|pedicur|acrili|acrylic|gel|dip|nail/.test(t)) return 'services';
    if (/preci|price|cost|cuánto|cuanto|vale|cuesta|dollar|\$/.test(t)) return 'price';
    if (/cola|queue|espera|wait|lleno|full/.test(t))            return 'queue';
    if (/hora|horari|hour|cierr|abr|open|close/.test(t))       return 'hours';
    if (/ubic|direcc|location|donde|dónde|mapa|map|address|saturn|palm/.test(t)) return 'location';
    if (/record|remind|aviso|notif/.test(t))                    return 'reminder';
    if (/pago|pay|payment|deposit|efectiv|card|tarjet/.test(t)) return 'payment';
    if (/tour|guia|guía|visita|show|enseñ|mostrar/.test(t))     return 'tour';
    if (/hola|hi|hello|hey|buenas/.test(t))                    return 'greet';
    if (/\bsi\b|\bsí\b|\byes\b|yep|claro|sure|por favor|\bok\b/.test(t)) return 'yes';
    if (/\bno\b|nope|nel|nah/.test(t))                        return 'no';
    return null;
  }

  // ── Handle user message ───────────────────────────────────
  async function handleUserMsg(text) {
    if (!text.trim()) return;
    await addMsg(text, 'user');
    setQR([]);
    inp.value = '';

    // ── Awaiting cancel: APT code or phone number ────────────
    if (awaitingCancel) {
      const aptMatch = text.match(/APT-\d+/i);
      const phoneMatch = text.replace(/\D/g,'').length >= 7;

      if (aptMatch) {
        // Cancel by APT code
        const code = aptMatch[0].toUpperCase();
        awaitingCancel = false;
        const appts = JSON.parse(localStorage.getItem('nby_appts') || '[]');
        const appt  = appts.find(a => a.id === code && a.status === 'confirmed');
        if (appt) {
          const updated = appts.map(a => a.id === code ? {...a, status:'cancelled'} : a);
          localStorage.setItem('nby_appts', JSON.stringify(updated));
          await botReply(s('cancel_ok', code), s('qr_after_cancel'));
        } else {
          await botReply(s('cancel_notfound', code));
        }
        return;

      } else if (phoneMatch) {
        // Look up by phone number
        awaitingCancel = false;
        awaitingCancelPhone = true;
        const digits = text.replace(/\D/g,'');
        const appts  = JSON.parse(localStorage.getItem('nby_appts') || '[]');
        const found  = appts.filter(a =>
          a.status === 'confirmed' &&
          a.clientPhone && a.clientPhone.replace(/\D/g,'').includes(digits.slice(-7))
        );
        if (found.length === 0) {
          awaitingCancelPhone = false;
          await botReply(s('cancel_phone_notfound'));
        } else if (found.length === 1) {
          // Only one — ask for confirmation
          const a = found[0];
          const svc = typeof SERVICES !== 'undefined' ? SERVICES.find(sv=>sv.id===a.serviceId) : null;
          const svcName = svc ? (lang==='en'?svc.name_en:svc.name_es) : a.serviceId;
          const detail = lang==='es'
            ? `📅 ${a.date} · ⏰ ${a.time}\n💅 ${svcName}\n🆔 ${a.id}`
            : `📅 ${a.date} · ⏰ ${a.time}\n💅 ${svcName}\n🆔 ${a.id}`;
          awaitingCancelPhone = false;
          awaitingCancel = true;
          const msg = lang==='es'
            ? `Encontré esta cita:\n\n${detail}\n\n¿Es la que quieres cancelar? Escribe el código **${a.id}** para confirmar.`
            : `I found this appointment:\n\n${detail}\n\nIs this the one you want to cancel? Type the code **${a.id}** to confirm.`;
          await botReply(msg);
        } else {
          // Multiple — list them all
          const list = found.map(a => {
            const svc = typeof SERVICES !== 'undefined' ? SERVICES.find(sv=>sv.id===a.serviceId) : null;
            const svcName = svc ? (lang==='en'?svc.name_en:svc.name_es) : a.serviceId;
            return `• **${a.id}** · ${a.date} ${a.time} · ${svcName}`;
          }).join('\n');
          awaitingCancelPhone = false;
          awaitingCancel = true;
          await botReply(s('cancel_choose', list));
        }
        return;

      } else {
        await botReply(lang === 'es'
          ? '😊 Puedes escribir tu **número de teléfono** o tu **código APT-xxx** para buscar tu cita.'
          : '😊 Please write your **phone number** or your **APT-xxx code** to find your appointment.');
        return;
      }
    }

    const intent = matchIntent(text);

    switch (intent) {
      case 'book':     await botReply(s('book_msg')); break;
      case 'services': await botReply(s('services_msg')); break;
      case 'price':    await botReply(s('price_msg')); break;
      case 'queue':    await botReply(s('queue_msg')); break;
      case 'hours':    await botReply(s('hours_msg')); break;
      case 'location': await botReply(s('location_msg')); break;
      case 'reminder': await botReply(s('reminder_msg')); break;
      case 'payment':  await botReply(s('payment_msg')); break;
      case 'greet':
        await botReply(lang === 'es'
          ? '¡Hola! 💅 ¿En qué puedo ayudarte hoy?'
          : 'Hello! 💅 How can I help you today?'); break;
      case 'cancel':
        awaitingCancel = true;
        await botReply(s('cancel_ask'));
        break;
      case 'apt_code':
        // Treat as cancel code directly
        awaitingCancel = true;
        await handleUserMsg(text);
        break;
      case 'tour':
        await startTour();
        break;
      case 'yes':
        if (!localStorage.getItem('nby_chat_toured')) {
          await startTour();
        } else {
          await botReply(lang === 'es' ? '¡Perfecto! ¿En qué más puedo ayudarte? 😊' : 'Great! How else can I help? 😊');
        }
        break;
      case 'no':
        await botReply(s('no_tour'));
        break;
      case 'home':
        window.location.href = 'index.html';
        break;
      default:
        await botReply(s('default_msg'));
    }
  }

  sendBtn.addEventListener('click', () => handleUserMsg(inp.value.trim()));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleUserMsg(inp.value.trim()); });

  // ── Guided Tour ───────────────────────────────────────────
  async function startTour() {
    if (window.location.pathname.includes('book') ||
        window.location.pathname.includes('queue') ||
        window.location.pathname.includes('dashboard')) {
      await botReply(lang === 'es'
        ? '¡El tour es en la página principal! 👉 <a href="index.html?tour=1">Ir al tour →</a>'
        : 'The tour is on the home page! 👉 <a href="index.html?tour=1">Start tour →</a>');
      return;
    }
    localStorage.setItem('nby_chat_toured', '1');
    tourActive = true;
    tourStep = 0;
    closeChat();
    await sleep(300);
    showTourStep();
  }

  function showTourStep() {
    removeTourOverlay();
    const steps = tourSteps();
    if (tourStep >= steps.length) {
      endTour();
      return;
    }
    const step = steps[tourStep];
    const el = document.querySelector(step.selector);
    if (!el) { tourStep++; showTourStep(); return; }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.className = 'tour-overlay';
      overlay.id = 'tourOverlay';

      const hole = document.createElement('div');
      hole.className = 'tour-hole';
      const pad = 12;
      hole.style.cssText = `top:${rect.top - pad}px;left:${rect.left - pad}px;width:${rect.width + pad*2}px;height:${Math.min(rect.height + pad*2, 300)}px;`;
      overlay.appendChild(hole);
      document.body.appendChild(overlay);

      const tip = document.createElement('div');
      tip.className = 'tour-tip';
      tip.id = 'tourTip';
      const isLast = tourStep === steps.length - 1;
      const nextLabel = lang === 'es' ? (isLast ? '✅ Terminar' : 'Siguiente →') : (isLast ? '✅ Done' : 'Next →');
      const skipLabel = lang === 'es' ? 'Saltar' : 'Skip';
      tip.innerHTML = `
        <h4>${step.title}</h4>
        <p>${step.text}</p>
        <div class="tour-tip-nav">
          <button class="tour-btn tour-btn-skip" onclick="window.__endTour()">${skipLabel}</button>
          <button class="tour-btn tour-btn-next" onclick="window.__nextTourStep()">${nextLabel}</button>
        </div>`;

      // Position tip below or above rect
      const tipTop = rect.bottom + pad + 16 < window.innerHeight - 150
        ? rect.bottom + pad + 8
        : rect.top - 180;
      const tipLeft = Math.max(12, Math.min(rect.left, window.innerWidth - 280));
      tip.style.cssText = `top:${tipTop}px;left:${tipLeft}px;`;
      document.body.appendChild(tip);
    }, 500);
  }

  function removeTourOverlay() {
    document.getElementById('tourOverlay')?.remove();
    document.getElementById('tourTip')?.remove();
  }

  window.__nextTourStep = function() {
    tourStep++;
    showTourStep();
  };

  window.__endTour = function() {
    tourActive = false;
    removeTourOverlay();
    openChat();
    setTimeout(async () => {
      await botReply(s('tour_done'), ['📅 ' + (lang==='es'?'Reservar cita':'Book now'), '💅 ' + (lang==='es'?'Ver servicios':'View services')]);
    }, 300);
  };

  function endTour() { window.__endTour(); }

  // ── Init ──────────────────────────────────────────────────
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function init() {
    // Sync language
    if (typeof currentLang !== 'undefined') lang = currentLang;
    document.getElementById('chatStatusLine').textContent = s('status');
    inp.placeholder = s('placeholder');

    const firstVisit = !localStorage.getItem('nby_chat_visited');
    localStorage.setItem('nby_chat_visited', '1');

    // Auto-open after 3.5s on first visit
    if (firstVisit) {
      setTimeout(async () => {
        openChat();
        await addMsg(s('greeting1'), 'bot');
        await sleep(600);
        await addMsg(s('tour_offer'), 'bot', 200);
        setQR(s('qr_first'));
      }, 3500);
    } else {
      // Show dot badge to indicate chat is available
      setTimeout(() => { dot.classList.remove('hidden'); }, 4000);
      // Pre-load welcome message when opened
      fab.addEventListener('click', function initMsg() {
        fab.removeEventListener('click', initMsg);
        setTimeout(async () => {
          if (msgs.children.length === 0) {
            await addMsg(s('greeting2'), 'bot');
            setQR(s('qr_main'));
          }
        }, 200);
      });
    }

    // Auto-start tour if redirected with ?tour=1
    if (new URLSearchParams(location.search).get('tour') === '1') {
      setTimeout(startTour, 1000);
    }

    // Watch for language changes
    const observer = new MutationObserver(() => {
      if (typeof currentLang !== 'undefined' && currentLang !== lang) {
        lang = currentLang;
        document.getElementById('chatStatusLine').textContent = s('status');
        inp.placeholder = s('placeholder');
      }
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
