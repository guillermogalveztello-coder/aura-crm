import { state, ui, STATUS_COLUMNS } from '../state.js';
import { escapeHtml, campaignInfo, campaignBadgeHtml, toast } from '../utils.js';
import { saveLeads } from '../storage.js';
import { renderView } from '../nav.js';
import { openClientModal } from '../modals/clientModal.js';

export function renderEmbudo(main){
  const filtered = state.leads.filter(l=>{
    if(ui.filterCampaign !== 'todas' && l.campaign !== ui.filterCampaign) return false;
    if(ui.searchQuery && !((l.name||'').toLowerCase().includes(ui.searchQuery.toLowerCase()) || (l.phone||'').includes(ui.searchQuery))) return false;
    return true;
  });

  const campaignChips = ['todas', ...Object.keys(state.campaigns)];

  main.innerHTML = `
    <div class="top-row">
      <div>
        <h1 class="page-title"><span class="nav-dot" style="background:var(--terracotta)"></span>Embudo de ventas</h1>
        <p class="page-sub">Arrastra las tarjetas entre columnas para actualizar el estado</p>
      </div>
      <button class="btn primary" id="addClientBtn">+ Agregar cliente</button>
    </div>
    <div class="top-row">
      <input class="search-box" id="searchInput" placeholder="Buscar por nombre o celular..." value="${escapeHtml(ui.searchQuery)}">
      <div class="chip-row" id="campaignChips"></div>
    </div>
    <div class="kanban" id="kanbanCols"></div>
  `;

  const chipsEl = document.getElementById('campaignChips');
  chipsEl.innerHTML = campaignChips.map(k=>{
    const label = k==='todas' ? 'Todas' : campaignInfo(k).name;
    const active = ui.filterCampaign===k;
    const color = k==='todas' ? 'var(--terracotta)' : campaignInfo(k).color;
    return `<button class="chip ${active?'active':''}" data-k="${k}" style="${active?`background:${color}`:''}">${escapeHtml(label)}</button>`;
  }).join('');
  chipsEl.querySelectorAll('.chip').forEach(c=>{ c.onclick=()=>{ ui.filterCampaign=c.dataset.k; renderEmbudo(main); }; });

  document.getElementById('searchInput').oninput = (e)=>{ ui.searchQuery = e.target.value; renderKanbanCols(filtered.filter(l=>(l.name||'').toLowerCase().includes(ui.searchQuery.toLowerCase())||(l.phone||'').includes(ui.searchQuery))); };
  document.getElementById('addClientBtn').onclick = ()=> openClientModal(null);

  renderKanbanCols(filtered);
}

export function renderKanbanCols(filtered){
  const cols = document.getElementById('kanbanCols');
  if(!cols) return;
  cols.innerHTML = STATUS_COLUMNS.map(col=>{
    const items = filtered.filter(l=>l.status===col.key);
    return `
      <div class="kanban-col" data-status="${col.key}">
        <div class="kanban-col-head"><span class="nav-dot" style="background:${col.color}"></span>${col.label}<span class="count">${items.length}</span></div>
        <div class="kanban-items">
          ${items.length===0 ? '<div class="empty-note">Sin leads aquí</div>' : items.map(l=>leadCardHtml(l)).join('')}
        </div>
      </div>
    `;
  }).join('');

  cols.querySelectorAll('.lead-card').forEach(card=>{
    card.draggable = true;
    card.ondragstart = ()=>{ ui.dragId = parseInt(card.dataset.id,10); };
    card.onclick = ()=>{ openClientModal(parseInt(card.dataset.id,10)); };
  });
  cols.querySelectorAll('.kanban-col').forEach(colEl=>{
    colEl.ondragover = (e)=> e.preventDefault();
    colEl.ondrop = ()=>{
      const lead = state.leads.find(l=>l.id===ui.dragId);
      if(lead){ lead.status = colEl.dataset.status; saveLeads(); renderView(); toast('Estado actualizado'); }
    };
  });
}

function leadCardHtml(l){
  return `
    <div class="lead-card" data-id="${l.id}">
      <div class="lc-top"><span>${escapeHtml(l.name)||'Sin nombre'}</span><span class="mono">S/.${l.value||0}</span></div>
      <div class="lc-phone">${escapeHtml(l.phone)||'—'}</div>
      ${campaignBadgeHtml(l.campaign, 'lc-badge')}
      ${l.notes ? `<div class="lc-notes" title="${escapeHtml(l.notes)}">📝 ${escapeHtml(l.notes)}</div>` : ''}
    </div>
  `;
}
