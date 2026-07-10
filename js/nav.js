import { ui } from './state.js';
import { renderEmbudo } from './views/embudo.js';
import { renderReservas } from './views/reservas.js';
import { renderVentas } from './views/ventas.js';
import { renderCampanas } from './views/campanas.js';

export function renderNav(){
  const nav = document.getElementById('nav');
  const items = [
    {key:'embudo', label:'Embudo de ventas', color:'var(--terracotta)'},
    {key:'reservas', label:'Reservas', color:'var(--reserva)'},
    {key:'ventas', label:'Ventas', color:'var(--venta)'},
    {key:'campanas', label:'Campañas', color:'var(--ink-dim)'},
  ];
  nav.innerHTML = items.map(it=>`
    <button class="nav-btn ${ui.view===it.key?'active':''}" data-view="${it.key}" style="${ui.view===it.key?`background:${it.color}`:''}">
      <span class="nav-dot" style="background:${it.color}"></span> ${it.label}
    </button>
  `).join('');
  nav.querySelectorAll('.nav-btn').forEach(b=>{
    b.onclick = ()=>{ ui.view = b.dataset.view; renderNav(); renderView(); };
  });
}

export function renderView(){
  const main = document.getElementById('main');
  if(ui.view === 'embudo') return renderEmbudo(main);
  if(ui.view === 'reservas') return renderReservas(main);
  if(ui.view === 'ventas') return renderVentas(main);
  if(ui.view === 'campanas') return renderCampanas(main);
}
