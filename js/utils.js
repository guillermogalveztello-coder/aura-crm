import { state } from './state.js';

export function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}
export function money(n){ return 'S/. ' + (Number(n)||0).toFixed(0); }
export function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
export function campaignInfo(key){ return state.campaigns[key] || {name:key, color:"#999"}; }
export function campaignBadgeHtml(key, cls='campaign-tag'){
  const c = campaignInfo(key);
  return `<span class="${cls}" style="background:${c.color}1A;color:${c.color}">${escapeHtml(c.name)}</span>`;
}
export function remainingBalance(lead){ return (Number(lead.value)||0) - (Number(lead.paid)||0); }
export function paymentStatus(lead){ return remainingBalance(lead) > 0 ? 'pending' : 'paid'; }

// Arte de campaña: se busca por coincidencia de nombre (no depende del id interno de la campaña),
// así funciona aunque la campaña se haya creado desde la UI con una key aleatoria.
const CAMPAIGN_IMAGE_MAP = [
  { match: /aura ?kids/i, src: 'assets/campaigns/aurakids.jpg' },
  { match: /padre.*hij/i, src: 'assets/campaigns/padre-e-hijas.jpg' },
];
export function campaignImageSrc(key){
  const c = campaignInfo(key);
  if(c.image) return c.image;
  const found = CAMPAIGN_IMAGE_MAP.find(m => m.match.test(c.name||''));
  return found ? found.src : null;
}

// Saludo de WhatsApp: usa el nombre si parece un nombre real (no un número de teléfono),
// y menciona la campaña de la que vino el lead.
export function buildWhatsAppGreeting(lead, campaign){
  const looksLikePhone = !lead.name || /^[+\d][\d\s()-]{5,}$/.test(lead.name.trim());
  const saludoNombre = looksLikePhone ? '¡Hola! 👋' : `¡Hola ${lead.name.trim().split(' ')[0]}! 👋`;
  const campName = campaign ? campaign.name : '';
  return `${saludoNombre} Soy de *Aura Studio* 🌙. Vimos tu interés en nuestra sesión "${campName}" y queríamos darte la bienvenida. Cualquier consulta sobre precios, fechas o el paquete que más te convenga, aquí estamos para ayudarte. ✨`;
}
export function whatsappUrl(phone, message){
  const digits = String(phone||'').replace(/[^\d]/g,'');
  const withCountry = digits.startsWith('51') ? digits : ('51' + digits.replace(/^0+/,''));
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
