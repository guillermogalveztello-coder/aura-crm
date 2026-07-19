import { state, ui } from '../state.js';
import { escapeHtml, campaignBadgeHtml } from '../utils.js';
import { saveLeads } from '../storage.js';
import { openClientModal } from '../modals/clientModal.js';

const PAGE_SIZE = 10;

export function renderVentas(main){
  const ventas = state.leads.filter(l=>l.status==='ganado');
  const total = ventas.reduce((s,l)=>s+(Number(l.value)||0),0);
  const totalPages = Math.max(1, Math.ceil(ventas.length/PAGE_SIZE));
  if(ui.ventasPage >= totalPages) ui.ventasPage = totalPages-1;
  if(ui.ventasPage < 0) ui.ventasPage = 0;
  const pageItems = ventas.slice(ui.ventasPage*PAGE_SIZE, ui.ventasPage*PAGE_SIZE+PAGE_SIZE);

  main.innerHTML = `
    <h1 class="page-title"><span class="nav-dot" style="background:var(--venta)"></span>Ventas</h1>
    <p class="page-sub">Sesiones ya concretadas y su ingreso total</p>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Ventas concretadas</div><div class="kpi-value">${ventas.length}</div><div class="kpi-sub">Total de sesiones cerradas</div></div>
      <div class="kpi-card"><div class="kpi-label">Ingreso total</div><div class="kpi-value">S/. ${total}</div><div class="kpi-sub">Suma de ventas concretadas</div></div>
    </div>
    <div class="panel">
      ${ventas.length===0 ? '<div class="empty-note">Todavía no hay ventas concretadas.</div>' : `
      <table class="ventas-table">
        <colgroup>
          <col style="width:20%"><col style="width:13%"><col style="width:16%"><col style="width:11%">
          <col style="width:8%"><col style="width:11%"><col class="c-obs"><col style="width:6%">
        </colgroup>
        <thead><tr><th>Nombre</th><th>Teléfono</th><th>Campaña</th><th>Vendedor</th><th>Total</th><th>Fecha de venta</th><th>Observaciones</th><th></th></tr></thead>
        <tbody id="ventasBody"></tbody>
      </table>
      ${ventas.length>PAGE_SIZE ? `
      <div class="ventas-pagination">
        <button class="btn small" id="ventasPrev" ${ui.ventasPage===0?'disabled':''}>‹ Anterior</button>
        <span>Página ${ui.ventasPage+1} de ${totalPages}</span>
        <button class="btn small" id="ventasNext" ${ui.ventasPage>=totalPages-1?'disabled':''}>Siguiente ›</button>
      </div>` : ''}
      `}
    </div>
  `;
  if(ventas.length===0) return;
  const body = document.getElementById('ventasBody');
  body.innerHTML = pageItems.map(v=>{
    return `
      <tr data-id="${v.id}">
        <td>${escapeHtml(v.name)}</td>
        <td class="mono">${escapeHtml(v.phone)||'—'}</td>
        <td>${campaignBadgeHtml(v.campaign)}</td>
        <td>${escapeHtml(v.seller)||'—'}</td>
        <td class="mono">S/.${v.value||0}</td>
        <td><input type="text" value="${escapeHtml(v.saleDate)}" data-field="saleDate" style="border:1px solid transparent;background:transparent;font-family:'IBM Plex Mono',monospace;font-size:12px;width:90px;"></td>
        <td class="td-obs" title="${escapeHtml(v.notes)||''}">${escapeHtml(v.notes)||'—'}</td>
        <td><button class="btn small" data-act="edit">Editar</button></td>
      </tr>
    `;
  }).join('');
  body.querySelectorAll('[data-field="saleDate"]').forEach(inp=>{
    inp.onchange = ()=>{
      const id = parseInt(inp.closest('tr').dataset.id,10);
      const lead = state.leads.find(l=>l.id===id);
      lead.saleDate = inp.value; saveLeads();
    };
  });
  body.querySelectorAll('[data-act="edit"]').forEach(btn=>{
    btn.onclick = ()=>{ const id = parseInt(btn.closest('tr').dataset.id,10); openClientModal(id); };
  });
  const prevBtn = document.getElementById('ventasPrev');
  const nextBtn = document.getElementById('ventasNext');
  if(prevBtn) prevBtn.onclick = ()=>{ ui.ventasPage--; renderVentas(main); };
  if(nextBtn) nextBtn.onclick = ()=>{ ui.ventasPage++; renderVentas(main); };
}
