import { state, ui } from '../state.js';
import { escapeHtml, campaignInfo, money, toast } from '../utils.js';
import { saveLeads } from '../storage.js';
import { renderView } from '../nav.js';
import { openClientModal } from '../modals/clientModal.js';

export function renderReservas(main){
  const reservas = state.leads.filter(l=>l.status==='propuesta');
  main.innerHTML = `
    <h1 class="page-title"><span class="nav-dot" style="background:var(--reserva)"></span>Reservas</h1>
    <p class="page-sub">Clientes con sesión agendada, en espera de completar el pago o concretar la venta</p>
    <div class="panel">
      ${reservas.length===0 ? '<div class="empty-note">Ningún cliente reservado todavía.</div>' : `<div class="card-grid" id="reservasGrid"></div>`}
    </div>
  `;
  if(reservas.length===0) return;
  const grid = document.getElementById('reservasGrid');
  grid.innerHTML = reservas.map(r=>reservaCardHtml(r)).join('');
  wireReservaCards(grid);
}

function reservaCardHtml(r){
  const c = campaignInfo(r.campaign);
  const remaining = (Number(r.value)||0) - (Number(r.paid)||0);
  const attendees = (r.attendees||[]).filter(a=>a.name);
  return `
    <div class="res-card" data-id="${r.id}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="rc-name">${escapeHtml(r.name)}</span>
        <span class="campaign-tag" style="background:${c.color}1A;color:${c.color}">${escapeHtml(c.name)}</span>
      </div>
      <div class="rc-phone">${escapeHtml(r.phone)||'—'}${r.dni?(' · DNI '+escapeHtml(r.dni)):''}</div>
      ${(r.sessionDate||r.sessionTime) ? `<div class="rc-phone">📅 ${escapeHtml(r.sessionDate)||'—'} ${escapeHtml(r.sessionTime||'')}</div>` : ''}
      ${attendees.length ? `<div class="rc-notes">Asistentes: ${attendees.map(a=>escapeHtml(a.name)+(a.age?` (${escapeHtml(a.age)}a)`:'')).join(', ')}</div>` : ''}
      ${r.notes ? `<div class="rc-notes">📝 ${escapeHtml(r.notes)}</div>` : ''}
      <div class="rc-money"><span>Total</span><b>${money(r.value)}</b></div>
      <div class="rc-money"><span>Pagado</span><b>${money(r.paid)}</b></div>
      <div class="rc-remaining"><span>Falta pagar</span><b>${money(remaining)}</b></div>
      <div class="rc-actions">
        <button class="btn small" data-act="edit">Editar</button>
        <button class="btn small" data-act="pay">+ Abono</button>
        <button class="btn small ok" data-act="conclude">Concretar venta</button>
      </div>
    </div>
  `;
}

function wireReservaCards(grid){
  grid.querySelectorAll('[data-act="edit"]').forEach(btn=>{
    btn.onclick = ()=>{ const id = parseInt(btn.closest('.res-card').dataset.id,10); openClientModal(id); };
  });
  grid.querySelectorAll('[data-act="pay"]').forEach(btn=>{
    btn.onclick = ()=>{ ui.payingId = parseInt(btn.closest('.res-card').dataset.id,10); document.getElementById('pAmount').value=''; document.getElementById('payOverlay').classList.add('show'); };
  });
  grid.querySelectorAll('[data-act="conclude"]').forEach(btn=>{
    btn.onclick = ()=>{
      const id = parseInt(btn.closest('.res-card').dataset.id,10);
      const lead = state.leads.find(l=>l.id===id);
      lead.status = 'ganado';
      lead.saleDate = new Date().toLocaleDateString('es-PE');
      saveLeads(); renderView(); toast('Venta concretada 🎉');
    };
  });
}
