import { state, ui } from '../state.js';
import { escapeHtml, campaignInfo, campaignBadgeHtml, money, remainingBalance, paymentStatus, toast } from '../utils.js';
import { saveLeads } from '../storage.js';
import { renderView } from '../nav.js';
import { openClientModal } from '../modals/clientModal.js';

function filterReservas(list){
  return list.filter(l=>{
    if(ui.filterCampaign !== 'todas' && l.campaign !== ui.filterCampaign) return false;
    if(ui.searchQuery && !((l.name||'').toLowerCase().includes(ui.searchQuery.toLowerCase()) || (l.phone||'').includes(ui.searchQuery))) return false;
    return true;
  });
}

function sortByUrgency(list){
  return list.slice().sort((a,b)=>{
    const dateA = a.sessionDate || '9999-99-99';
    const dateB = b.sessionDate || '9999-99-99';
    if(dateA !== dateB) return dateA < dateB ? -1 : 1;
    return remainingBalance(b) - remainingBalance(a);
  });
}

export function renderReservas(main){
  const all = state.leads.filter(l=>l.status==='propuesta');
  const totalEsperado = all.reduce((s,l)=>s+(Number(l.value)||0),0);
  const totalCobrado = all.reduce((s,l)=>s+(Number(l.paid)||0),0);
  const totalPendiente = totalEsperado - totalCobrado;
  const campaignChips = ['todas', ...Object.keys(state.campaigns)];

  main.innerHTML = `
    <h1 class="page-title"><span class="nav-dot" style="background:var(--reserva)"></span>Reservas</h1>
    <p class="page-sub">Clientes con sesión agendada, en espera de completar el pago o concretar la venta</p>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total esperado</div><div class="kpi-value">${money(totalEsperado)}</div><div class="kpi-sub">Suma de reservas activas</div></div>
      <div class="kpi-card"><div class="kpi-label">Cobrado</div><div class="kpi-value">${money(totalCobrado)}</div><div class="kpi-sub">Adelantos y pagos recibidos</div></div>
      <div class="kpi-card"><div class="kpi-label">Pendiente</div><div class="kpi-value">${money(totalPendiente)}</div><div class="kpi-sub">Falta por cobrar</div></div>
    </div>
    <div class="top-row">
      <input class="search-box" id="searchInput" placeholder="Buscar por nombre o celular..." value="${escapeHtml(ui.searchQuery)}">
      <div class="chip-row" id="campaignChips"></div>
    </div>
    <div class="panel" id="reservasPanel"></div>
  `;

  const chipsEl = document.getElementById('campaignChips');
  const renderChips = ()=>{
    chipsEl.innerHTML = campaignChips.map(k=>{
      const label = k==='todas' ? 'Todas' : campaignInfo(k).name;
      const active = ui.filterCampaign===k;
      const color = k==='todas' ? 'var(--reserva)' : campaignInfo(k).color;
      return `<button class="chip ${active?'active':''}" data-k="${k}" style="${active?`background:${color}`:''}">${escapeHtml(label)}</button>`;
    }).join('');
    chipsEl.querySelectorAll('.chip').forEach(c=>{
      c.onclick = ()=>{ ui.filterCampaign = c.dataset.k; renderChips(); renderReservasList(all); };
    });
  };
  renderChips();

  document.getElementById('searchInput').oninput = (e)=>{ ui.searchQuery = e.target.value; renderReservasList(all); };

  renderReservasList(all);
}

function renderReservasList(all){
  const panel = document.getElementById('reservasPanel');
  if(!panel) return;
  const list = sortByUrgency(filterReservas(all));
  panel.innerHTML = list.length===0
    ? `<div class="empty-note">${all.length===0 ? 'Ningún cliente reservado todavía.' : 'Ningún resultado con estos filtros.'}</div>`
    : `<div class="card-grid" id="reservasGrid"></div>`;
  if(list.length===0) return;
  const grid = document.getElementById('reservasGrid');
  grid.innerHTML = list.map(r=>reservaCardHtml(r)).join('');
  wireReservaCards(grid);
}

function reservaCardHtml(r){
  const remaining = remainingBalance(r);
  const isPaid = paymentStatus(r)==='paid';
  const attendees = (r.attendees||[]).filter(a=>a.name);
  return `
    <div class="res-card" data-id="${r.id}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="rc-name">${escapeHtml(r.name)}</span>
        ${campaignBadgeHtml(r.campaign)}
      </div>
      <div class="rc-remaining ${isPaid?'is-paid':'is-pending'}">
        <span>${isPaid ? '✓ Pagado completo' : 'Falta pagar'}</span>
        ${isPaid ? '' : `<b>${money(remaining)}</b>`}
      </div>
      <div class="rc-phone">${escapeHtml(r.phone)||'—'}${r.dni?(' · DNI '+escapeHtml(r.dni)):''}</div>
      ${(r.sessionDate||r.sessionTime) ? `<div class="rc-phone">📅 ${escapeHtml(r.sessionDate)||'—'} ${escapeHtml(r.sessionTime||'')}</div>` : ''}
      ${attendees.length ? `<div class="rc-notes">Asistentes: ${attendees.map(a=>escapeHtml(a.name)+(a.age?` (${escapeHtml(a.age)}a)`:'')).join(', ')}</div>` : ''}
      ${r.notes ? `<div class="rc-notes">📝 ${escapeHtml(r.notes)}</div>` : ''}
      <div class="rc-money"><span>Total</span><b>${money(r.value)}</b></div>
      <div class="rc-money"><span>Pagado</span><b>${money(r.paid)}</b></div>
      <div class="rc-actions">
        <button class="btn small" data-act="edit">Editar</button>
        <button class="btn small" data-act="pay">+ Abono</button>
        <button class="btn small ok" data-act="conclude" ${!isPaid?`disabled title="Falta pagar ${money(remaining)} para poder concretar la venta"`:''}>Concretar venta</button>
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
  grid.querySelectorAll('[data-act="conclude"]:not(:disabled)').forEach(btn=>{
    btn.onclick = ()=>{
      const id = parseInt(btn.closest('.res-card').dataset.id,10);
      const lead = state.leads.find(l=>l.id===id);
      if(remainingBalance(lead) > 0){ toast('Todavía falta cobrar el saldo'); return; }
      lead.status = 'ganado';
      lead.saleDate = new Date().toLocaleDateString('es-PE');
      saveLeads(); renderView(); toast('Venta concretada 🎉');
    };
  });
}
