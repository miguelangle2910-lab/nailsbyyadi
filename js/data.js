// ============================================================
//  Nails by Yadi — Data Layer (localStorage)
// ============================================================

// ── Services catalogue ───────────────────────────────────────
const SERVICES = [
  // Manicure
  { id:'s1',  cat:'manicure', icon:'💅', price:20,  dur:30,  name_es:'Manicure Básico',         name_en:'Basic Manicure',          desc_es:'Limado, cutículas y esmalte clásico.',                desc_en:'Filing, cuticles and classic polish.' },
  { id:'s2',  cat:'manicure', icon:'✨', price:35,  dur:45,  name_es:'Manicure Gel',             name_en:'Gel Manicure',             desc_es:'Esmalte en gel de larga duración.',                   desc_en:'Long-lasting gel polish.' },
  { id:'s3',  cat:'manicure', icon:'🌟', price:40,  dur:60,  name_es:'Dip Powder',              name_en:'Dip Powder',              desc_es:'Polvo de inmersión resistente y elegante.',           desc_en:'Durable and elegant dip powder finish.' },
  { id:'s4',  cat:'manicure', icon:'🎨', price:45,  dur:60,  name_es:'Nail Art Básico',          name_en:'Basic Nail Art',           desc_es:'Diseños sencillos: flores, líneas, puntos.',         desc_en:'Simple designs: flowers, lines, dots.' },
  { id:'s5',  cat:'manicure', icon:'👑', price:65,  dur:90,  name_es:'Nail Art Complejo',        name_en:'Complex Nail Art',        desc_es:'Diseños personalizados detallados.',                  desc_en:'Detailed custom nail art designs.' },
  // Pedicure
  { id:'s6',  cat:'pedicure', icon:'🦶', price:30,  dur:45,  name_es:'Pedicure Básico',          name_en:'Basic Pedicure',          desc_es:'Limado, cutículas, esmalte en pies.',                 desc_en:'Filing, cuticles and polish for feet.' },
  { id:'s7',  cat:'pedicure', icon:'💎', price:45,  dur:60,  name_es:'Pedicure Gel',             name_en:'Gel Pedicure',            desc_es:'Gel de larga duración en los pies.',                  desc_en:'Long-lasting gel on feet.' },
  { id:'s8',  cat:'pedicure', icon:'🌸', price:55,  dur:75,  name_es:'Pedicure Spa',             name_en:'Spa Pedicure',            desc_es:'Relajante con masaje, exfoliación y hidratación.',    desc_en:'Relaxing with massage, exfoliation and moisturizing.' },
  // Acrílico
  { id:'s9',  cat:'acrylic',  icon:'💍', price:55,  dur:90,  name_es:'Acrílico Full Set',        name_en:'Full Set Acrylic',        desc_es:'Set completo de uñas de acrílico.',                   desc_en:'Complete acrylic nail set.' },
  { id:'s10', cat:'acrylic',  icon:'🔄', price:40,  dur:60,  name_es:'Relleno Acrílico',         name_en:'Acrylic Fill',            desc_es:'Mantenimiento de uñas acrílicas existentes.',        desc_en:'Maintenance of existing acrylic nails.' },
  { id:'s11', cat:'acrylic',  icon:'🦋', price:75,  dur:120, name_es:'Acrílico con Diseño',      name_en:'Acrylic with Art',        desc_es:'Set acrílico con nail art personalizado.',           desc_en:'Acrylic set with custom nail art.' },
  // Extensiones
  { id:'s12', cat:'ext',      icon:'🌺', price:65,  dur:90,  name_es:'Extensiones de Gel',       name_en:'Gel Extensions',          desc_es:'Extensiones con gel para más longitud.',              desc_en:'Gel extensions for added length.' },
  { id:'s13', cat:'ext',      icon:'🔮', price:85,  dur:120, name_es:'Extensiones con Diseño',   name_en:'Extensions with Art',     desc_es:'Extensiones de gel con arte personalizado.',         desc_en:'Gel extensions with custom nail art.' },
  // Combos & extras
  { id:'s14', cat:'combo',    icon:'🎀', price:45,  dur:75,  name_es:'Combo Mani + Pedi',        name_en:'Mani + Pedi Combo',       desc_es:'Manicure básico + pedicure básico.',                  desc_en:'Basic manicure + basic pedicure.' },
  { id:'s15', cat:'extra',    icon:'🖌️', price:5,   dur:5,   name_es:'Nail Art por Uña',         name_en:'Nail Art per Nail',       desc_es:'Diseño individual por uña (precio por uña).',        desc_en:'Individual nail art per nail (price per nail).' },
  { id:'s16', cat:'extra',    icon:'🔓', price:15,  dur:20,  name_es:'Remoción',                 name_en:'Removal',                 desc_es:'Remoción de gel, acrílico o dip powder.',            desc_en:'Removal of gel, acrylic or dip powder.' },
  { id:'s17', cat:'extra',    icon:'🩹', price:8,   dur:10,  name_es:'Reparación de Uña',        name_en:'Nail Repair',             desc_es:'Reparación de una uña rota o dañada.',               desc_en:'Repair of one broken or damaged nail.' },
];

const CAT_LABELS = {
  manicure: { es:'Manicure',    en:'Manicure' },
  pedicure: { es:'Pedicure',    en:'Pedicure' },
  acrylic:  { es:'Acrílico',    en:'Acrylic' },
  ext:      { es:'Extensiones', en:'Extensions' },
  combo:    { es:'Combos',      en:'Combos' },
  extra:    { es:'Extras',      en:'Extras' },
};

// ── Business hours & slot config ─────────────────────────────
const BUSINESS_HOURS = {
  // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  0: [],                              // Closed
  1: ['08:30','10:30','13:00','14:30','16:00'],
  2: ['08:30','10:30','13:00','14:30','16:00'],
  3: ['08:30','10:30','13:00','14:30','16:00'],
  4: ['08:30','10:30','13:00','14:30','16:00'],
  5: ['08:30','10:30','13:00','14:30','16:00'],
  6: ['09:00','10:30','12:00','14:00'],
};

// ── Storage helpers ──────────────────────────────────────────
function getDB(key, def = []) {
  try { return JSON.parse(localStorage.getItem('nby_' + key)) || def; }
  catch { return def; }
}
function setDB(key, val) {
  localStorage.setItem('nby_' + key, JSON.stringify(val));
}

// ── Appointments CRUD ────────────────────────────────────────
function getAppointments()    { return getDB('appts', []); }
function saveAppointments(a)  { setDB('appts', a); }

function createAppointment(data) {
  const appts = getAppointments();
  const appt  = { id: 'APT-' + Date.now(), ...data, status:'confirmed', createdAt: new Date().toISOString() };
  appts.push(appt);
  saveAppointments(appts);
  return appt;
}

function getAppointmentsByDate(dateStr) {
  return getAppointments().filter(a => a.date === dateStr && a.status !== 'cancelled');
}

function isSlotTaken(dateStr, time) {
  return getAppointmentsByDate(dateStr).some(a => a.time === time);
}

function updateAppointmentStatus(id, status) {
  const appts = getAppointments().map(a => a.id === id ? { ...a, status } : a);
  saveAppointments(appts);
  // If cancelled → notify queue
  if (status === 'cancelled') notifyQueue(appts.find(a => a.id === id));
}

// ── Queue CRUD ───────────────────────────────────────────────
function getQueue()     { return getDB('queue', []); }
function saveQueue(q)   { setDB('queue', q); }

function joinQueue(data) {
  const queue = getQueue();
  const sameSlot = queue.filter(q => q.date === data.date && q.time === data.time && q.status === 'waiting');
  const entry = {
    id:       'Q-' + Date.now(),
    ...data,
    position: sameSlot.length + 1,
    status:   'waiting',
    createdAt: new Date().toISOString()
  };
  queue.push(entry);
  saveQueue(queue);
  return entry;
}

function getQueueForSlot(dateStr, time) {
  return getQueue()
    .filter(q => q.date === dateStr && q.time === time && q.status === 'waiting')
    .sort((a, b) => a.position - b.position);
}

function updateQueueStatus(id, status) {
  const queue = getQueue().map(q => q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q);
  saveQueue(queue);
}

function notifyQueue(cancelledAppt) {
  if (!cancelledAppt) return;
  const next = getQueueForSlot(cancelledAppt.date, cancelledAppt.time)[0];
  if (next) {
    // Mark as notified
    updateQueueStatus(next.id, 'notified');
    // Simulate notification
    showQueueNotification(next);
  }
}

function confirmQueueSlot(queueId) {
  const queue = getQueue();
  const entry = queue.find(q => q.id === queueId);
  if (!entry) return null;
  updateQueueStatus(queueId, 'confirmed');
  // Create appointment
  const appt = createAppointment({
    date:        entry.date,
    time:        entry.time,
    serviceId:   entry.serviceId,
    clientName:  entry.name,
    clientPhone: entry.phone,
    clientEmail: entry.email,
    paymentType: 'later',
    fromQueue:   true,
  });
  return appt;
}

// Simulated queue notification (browser toast)
function showQueueNotification(entry) {
  showToast(`🔔 ¡Turno disponible! ${entry.date} a las ${entry.time}. ¡Confirma ahora!`, 'warning', 8000);
}

// ── Available slots ──────────────────────────────────────────
function getSlotsForDate(dateStr) {
  const d    = new Date(dateStr + 'T12:00:00');
  const dow  = d.getDay();
  const hours = BUSINESS_HOURS[dow] || [];
  return hours.map(time => {
    const taken    = isSlotTaken(dateStr, time);
    const queueLen = taken ? getQueueForSlot(dateStr, time).length : 0;
    return { time, taken, queueLen };
  });
}

// ── Seed demo data (only once) ───────────────────────────────
// Las citas de demostración usan fechas PASADAS para que NO bloqueen
// los horarios futuros disponibles para los clientes reales.
function seedDemoData() {
  if (getDB('seeded')) return;
  // No sembrar citas en fechas futuras — solo dejar el dashboard limpio.
  // Si quieres ver datos en el dashboard, descomenta el bloque de abajo.
  setDB('seeded', true);

  /*
  const today = new Date();
  const fmt   = d => d.toISOString().split('T')[0];
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

  const demos = [
    { date: fmt(addDays(today,-7)), time:'08:30', serviceId:'s2', clientName:'María López',  clientPhone:'(561) 555-0101', clientEmail:'maria@email.com',  paymentType:'deposit', status:'completed' },
    { date: fmt(addDays(today,-5)), time:'10:30', serviceId:'s9', clientName:'Ana García',   clientPhone:'(561) 555-0102', clientEmail:'ana@email.com',    paymentType:'later',   status:'completed' },
    { date: fmt(addDays(today,-3)), time:'13:00', serviceId:'s8', clientName:'Sofia Perez',  clientPhone:'(561) 555-0103', clientEmail:'sofia@email.com',  paymentType:'deposit', status:'completed' },
    { date: fmt(addDays(today,-2)), time:'09:00', serviceId:'s1', clientName:'Carmen Rivera',clientPhone:'(561) 555-0104', clientEmail:'carmen@email.com', paymentType:'later',   status:'completed' },
    { date: fmt(addDays(today,-1)), time:'10:30', serviceId:'s11',clientName:'Lucia Torres', clientPhone:'(561) 555-0105', clientEmail:'lucia@email.com',  paymentType:'deposit', status:'completed' },
  ];
  demos.forEach(d => createAppointment(d));
  */
}

// Auto-limpieza: borra citas y cola guardadas en localStorage para
// que el sitio siempre muestre horarios disponibles a clientes nuevos.
// Se ejecuta una sola vez tras este cambio (controlado por una clave).
function cleanupStaleDemo() {
  const FLAG = 'cleaned_v2';
  if (getDB(FLAG)) return;
  try {
    localStorage.removeItem('nby_appts');
    localStorage.removeItem('nby_queue');
    localStorage.removeItem('nby_seeded');
  } catch (e) { /* ignore */ }
  setDB(FLAG, true);
}
