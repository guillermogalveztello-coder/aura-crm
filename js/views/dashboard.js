import { state, ui } from '../state.js';
import { escapeHtml, money, campaignInfo } from '../utils.js';

const SELLERS = ['Guillermo', 'Andrea'];
const RANGE_OPTIONS = [
  { key:'todo', label:'Todo' },
  { key:'mes', label:'Este mes' },
  { key:'30d', label:'Últimos 30 días' },
  { key:'anio', label:`Año ${new Date().getFullYear()}` },
];

// Las fechas antiguas de venta vienen en formatos mixtos (d/m/aaaa o aaaa-mm-dd).
// Si no se puede interpretar la fecha, el registro se excluye del rango filtrado.
function parseFlexibleDate(str){
  if(!str) return null;
  const s = String(str).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) return new Date(+m[1], +m[2]-1, +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m) return new Date(+m[3], +m[2]-1, +m[1]);
  return null;
}

function rangeBounds(key){
  const now = new Date();
  if(key==='mes') return [new Date(now.getFullYear(), now.getMonth(), 1), now];
  if(key==='30d') return [new Date(now.getTime()-30*24*60*60*1000), now];
  if(key==='anio') return [new Date(now.getFullYear(),0,1), new Date(now.getFullYear(),11,31,23,59,59)];
  return null;
}

function inRange(lead, bounds){
  if(!bounds) return true;
  const d = parseFlexibleDate(lead.saleDate);
  if(!d) return false;
  return d >= bounds[0] && d <= bounds[1];
}

export function renderDashboard(main){
  if(!ui.dashboardRange) ui.dashboardRange = 'todo';
  const leads = state.leads;
  const bounds = rangeBounds(ui.dashboardRange);
  const ganadoAll = leads.filter(l=>l.status==='ganado');
  const ganado = ganadoAll.filter(l=>inRange(l, bounds));
  const totalIngresos = ganado.reduce((s,l)=>s+(Number(l.value)||0),0);
  const conversion = leads.length ? (ganado.length/leads.length*100) : 0;
  const periodoNota = ui.dashboardRange==='todo' ? '' : ' (en el periodo)';

  const campaignKeys = Object.keys(state.campaigns);
  const porCampania = campaignKeys.map(key=>{
    const clientes = leads.filter(l=>l.campaign===key);
    const ventasAll = clientes.filter(l=>l.status==='ganado');
    const ventas = ventasAll.filter(l=>inRange(l, bounds));
    const ingresos = ventas.reduce((s,l)=>s+(Number(l.value)||0),0);
    const conv = clientes.length ? (ventas.length/clientes.length*100) : 0;
    return { key, nombre: campaignInfo(key).name, color: campaignInfo(key).color, clientes: clientes.length, ventas: ventas.length, ingresos, conv };
  }).sort((a,b)=>b.clientes-a.clientes);
  const sinCampania = leads.filter(l=>!l.campaign || !state.campaigns[l.campaign]);
  if(sinCampania.length){
    const ventasSc = sinCampania.filter(l=>l.status==='ganado' && inRange(l, bounds));
    porCampania.push({ key:'', nombre:'Sin campaña', color:'#94A3B8', clientes: sinCampania.length, ventas: ventasSc.length, ingresos: ventasSc.reduce((s,l)=>s+(Number(l.value)||0),0), conv: sinCampania.length ? (ventasSc.length/sinCampania.length*100) : 0 });
  }

  const porVendedor = [...SELLERS, ''].map(seller=>{
    const ventas = ganado.filter(l=>(l.seller||'')===seller);
    const ingresos = ventas.reduce((s,l)=>s+(Number(l.value)||0),0);
    const ticket = ventas.length ? ingresos/ventas.length : 0;
    return { seller: seller || 'Sin asignar', ventas: ventas.length, ingresos, ticket };
  }).filter(v=>v.ventas>0 || v.seller!=='Sin asignar');

  main.innerHTML = `
    <div class="top-row">
      <div>
        <h1 class="page-title"><span class="nav-dot" style="background:var(--terracotta)"></span>Dashboard</h1>
        <p class="page-sub">Resumen general de clientes, ventas y desempeño</p>
      </div>
      <div class="chip-row" id="rangeChips"></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total clientes</div><div class="kpi-value">${leads.length}</div><div class="kpi-sub">Todos los ingresados</div></div>
      <div class="kpi-card"><div class="kpi-label">Ventas cerradas</div><div class="kpi-value">${ganado.length}</div><div class="kpi-sub">Estado ganado${periodoNota}</div></div>
      <div class="kpi-card"><div class="kpi-label">Ingresos totales</div><div class="kpi-value">${money(totalIngresos)}</div><div class="kpi-sub">Suma de ventas concretadas${periodoNota}</div></div>
      <div class="kpi-card"><div class="kpi-label">Conversión</div><div class="kpi-value">${conversion.toFixed(1)}%</div><div class="kpi-sub">Clientes que terminan en venta${periodoNota}</div></div>
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

  const chipsEl = document.getElementById('rangeChips');
  chipsEl.innerHTML = RANGE_OPTIONS.map(o=>{
    const active = ui.dashboardRange===o.key;
    return `<button class="chip ${active?'active':''}" data-k="${o.key}" style="${active?'background:var(--terracotta)':''}">${o.label}</button>`;
  }).join('');
  chipsEl.querySelectorAll('.chip').forEach(c=>{
    c.onclick = ()=>{ ui.dashboardRange = c.dataset.k; renderDashboard(main); };
  });
}
