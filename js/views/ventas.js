import { state } from '../state.js';
import { escapeHtml, campaignInfo } from '../utils.js';
import { saveLeads } from '../storage.js';
import { openClientModal } from '../modals/clientModal.js';

export function renderVentas(main){
  const ventas = state.leads.filter(l=>l.status==='ganado');
  const total = ventas.reduce((s,l)=>s+(Number(l.value)||0),0);
  main.innerHTML = `
    <h1 class="page-title"><span class="nav-dot" style="background:var(--venta)"></span>Ventas</h1>
    <p class="page-sub">Sesiones ya concretadas y su ingreso total</p>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Ventas concretadas</div><div class="kpi-value">${ventas.length}</div><div class="kpi-sub">Total de sesiones cerradas</div></div>
      <div class="kpi-card"><div class="kpi-label">Ingreso total</div><div class="kpi-value">S/. ${total}</div><div class="kpi-sub">Suma de ventas concretadas</div></div>
    </div>
    <div class="panel">
      ${ventas.length===0 ? '<div class="empty-note">Todavía no hay ventas concretadas.</div>' : `
      <table>
        <thead><tr><th>Nombre</th><th>Teléfono</th><th>Campaña</th><th>Total</th><th>Fecha de venta</th><th>Observaciones</th><th></th></tr></thead>
        <tbody id="ventasBody"></tbody>
      </table>`}
    </div>
  `;
  if(ventas.length===0) return;
  const body = document.getElementById('ventasBody');
  body.innerHTML = ventas.map(v=>{
    const c = campaignInfo(v.campaign);
    return `
      <tr data-id="${v.id}">
        <td>${escapeHtml(v.name)}</td>
        <td class="mono">${escapeHtml(v.phone)||'—'}</td>
        <td><span class="campaign-tag" style="background:${c.color}1A;color:${c.color}">${escapeHtml(c.name)}</span></td>
        <td class="mono">S/.${v.value||0}</td>
        <td><input type="text" value="${escapeHtml(v.saleDate)}" data-field="saleDate" style="border:1px solid transparent;background:transparent;font-family:'IBM Plex Mono',monospace;font-size:12px;width:90px;"></td>
        <td style="max-width:180px;font-size:12px;color:var(--ink-dim);font-style:italic;">${escapeHtml(v.notes)||'—'}</td>
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
}
