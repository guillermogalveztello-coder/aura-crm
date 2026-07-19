import { state } from '../state.js';
import { escapeHtml, money, campaignInfo } from '../utils.js';

const SELLERS = ['Guillermo', 'Andrea'];

export function renderDashboard(main){
  const leads = state.leads;
  const ganado = leads.filter(l=>l.status==='ganado');
  const totalIngresos = ganado.reduce((s,l)=>s+(Number(l.value)||0),0);
  const conversion = leads.length ? (ganado.length/leads.length*100) : 0;

  const campaignKeys = Object.keys(state.campaigns);
  const porCampania = campaignKeys.map(key=>{
    const clientes = leads.filter(l=>l.campaign===key);
    const ventas = clientes.filter(l=>l.status==='ganado');
    const ingresos = ventas.reduce((s,l)=>s+(Number(l.value)||0),0);
    const conv = clientes.length ? (ventas.length/clientes.length*100) : 0;
    return { key, nombre: campaignInfo(key).name, color: campaignInfo(key).color, clientes: clientes.length, ventas: ventas.length, ingresos, conv };
  }).sort((a,b)=>b.clientes-a.clientes);
  const sinCampania = leads.filter(l=>!l.campaign || !state.campaigns[l.campaign]);
  if(sinCampania.length){
    const ventasSc = sinCampania.filter(l=>l.status==='ganado');
    porCampania.push({ key:'', nombre:'Sin campaña', color:'#94A3B8', clientes: sinCampania.length, ventas: ventasSc.length, ingresos: ventasSc.reduce((s,l)=>s+(Number(l.value)||0),0), conv: sinCampania.length ? (ventasSc.length/sinCampania.length*100) : 0 });
  }

  const porVendedor = [...SELLERS, ''].map(seller=>{
    const ventas = ganado.filter(l=>(l.seller||'')===seller);
    const ingresos = ventas.reduce((s,l)=>s+(Number(l.value)||0),0);
    const ticket = ventas.length ? ingresos/ventas.length : 0;
    return { seller: seller || 'Sin asignar', ventas: ventas.length, ingresos, ticket };
  }).filter(v=>v.ventas>0 || v.seller!=='Sin asignar');

  main.innerHTML = `
    <h1 class="page-title"><span class="nav-dot" style="background:var(--terracotta)"></span>Dashboard</h1>
    <p class="page-sub">Resumen general de clientes, ventas y desempeño</p>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total clientes</div><div class="kpi-value">${leads.length}</div><div class="kpi-sub">Todos los ingresados</div></div>
      <div class="kpi-card"><div class="kpi-label">Ventas cerradas</div><div class="kpi-value">${ganado.length}</div><div class="kpi-sub">Estado ganado</div></div>
      <div class="kpi-card"><div class="kpi-label">Ingresos totales</div><div class="kpi-value">${money(totalIngresos)}</div><div class="kpi-sub">Suma de ventas concretadas</div></div>
      <div class="kpi-card"><div class="kpi-label">Conversión</div><div class="kpi-value">${conversion.toFixed(1)}%</div><div class="kpi-sub">Clientes que terminan en venta</div></div>
    </div>

    <div class="panel" style="margin-bottom:18px;">
      <h3 style="font-family:'Playfair Display',serif;margin:0 0 12px;font-size:16px;">Clientes por campaña (¿por dónde ingresaron?)</h3>
      ${porCampania.length===0 ? '<div class="empty-note">Todavía no hay campañas con clientes.</div>' : `
      <table>
        <thead><tr><th>Campaña</th><th>Clientes</th><th>Ventas</th><th>Ingresos</th><th>Conversión</th></tr></thead>
        <tbody>
          ${porCampania.map(c=>`
            <tr>
              <td><span class="campaign-tag" style="background:${c.color}1A;color:${c.color}">${escapeHtml(c.nombre)}</span></td>
              <td class="mono">${c.clientes}</td>
              <td class="mono">${c.ventas}</td>
              <td class="mono">${money(c.ingresos)}</td>
              <td class="mono">${c.conv.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>

    <div class="panel">
      <h3 style="font-family:'Playfair Display',serif;margin:0 0 12px;font-size:16px;">Ventas por vendedor</h3>
      ${porVendedor.length===0 ? '<div class="empty-note">Todavía no hay ventas con vendedor asignado.</div>' : `
      <table>
        <thead><tr><th>Vendedor</th><th>Ventas</th><th>Ingresos</th><th>Ticket promedio</th></tr></thead>
        <tbody>
          ${porVendedor.map(v=>`
            <tr>
              <td>${escapeHtml(v.seller)}</td>
              <td class="mono">${v.ventas}</td>
              <td class="mono">${money(v.ingresos)}</td>
              <td class="mono">${money(v.ticket)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>
  `;
}
