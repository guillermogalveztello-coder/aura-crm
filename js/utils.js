import { state } from './state.js';

export function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}
export function money(n){ return 'S/. ' + (Number(n)||0).toFixed(0); }
export function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
export function campaignInfo(key){ return state.campaigns[key] || {name:key, color:"#999"}; }
