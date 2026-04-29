// ═══════════════════════════════════════════════════════════════
//  NAILS BY YADI — Configuración del Proyecto
//  Llena estos valores después de crear tus cuentas gratuitas
//  Ver instrucciones en: SETUP.md
// ═══════════════════════════════════════════════════════════════

window.NBY_CONFIG = {

  // ── Supabase (base de datos) ────────────────────────────────
  // → supabase.com → tu proyecto → Settings → API
  supabaseUrl: 'https://gfwwnsxtzjubkjgxpehq.supabase.co',
  supabaseKey: 'sb_publishable_4NjSGp-kFZmOpno9O2Gf9Q_neCslgBr',

  // ── Vercel (donde está el sitio publicado) ──────────────────
  // → Se actualizará después de publicar en Vercel
  siteUrl: 'https://nailsbyyadi.vercel.app',

  // ── Información del negocio ─────────────────────────────────
  ownerName:  'Yadi',
  ownerEmail: 'miguelangle2910@gmail.com',
  ownerPhone: '15613178387',
  businessName: 'Nails by Yadi',
  businessAddress: '4377 Saturn Ave, West Palm Beach, FL 33406',

};

// Detecta si el config está listo (valores reales, no placeholders)
window.NBY_CLOUD = !!(
  window.NBY_CONFIG.supabaseUrl &&
  !window.NBY_CONFIG.supabaseUrl.includes('YOUR_') &&
  window.NBY_CONFIG.supabaseKey &&
  !window.NBY_CONFIG.supabaseKey.includes('YOUR_')
);

if (window.NBY_CLOUD) {
  console.info('✅ Nails by Yadi — Modo Cloud activo (Supabase + Resend)');
} else {
  console.info('ℹ️  Nails by Yadi — Modo Demo (localStorage). Configura js/config.js para activar el cloud.');
}
