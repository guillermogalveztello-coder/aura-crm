import { state, ui } from '../state.js';
import { escapeHtml, money, campaignInfo, remainingBalance } from '../utils.js';
import { openClientModal } from '../modals/clientModal.js';

const SELLERS = ['Guillermo', 'Andrea'];
const RANGE_OPTIONS = [
  { key:'todo', label:'Todo' },
  { key:'mes', label:'Este mes' },
  { key:'30d', label:'Últimos 30 días' },
  { key:'anio', label:`Año ${new Date().getFullYear()}` },
];
const NONE = '__none__';

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

function leadMiniCardsHtml(list){
  if(!list.length) return '<div class="empty-note">No hay registros para mostrar aquí.</div>';
  return `<div class="card-grid" style="margin-top:10px;">${list.map(l=>{
    const c = campaignInfo(l.campaign);
    return `
    <div class="res-card" data-id="${l.id}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="rc-name">${escapeHtml(l.name)}</span>
        <span class="campaign-tag" style="background:${c.color}1A;color:${c.color}">${escapeHtml(c.name)}</span>
      </div>
      <div class="rc-phone">${escapeHtml(l.phone)||'—'}</div>
      <div class="rc-money"><span>Total</span><b>${money(l.value)}</b></div>
      ${l.status==='ganado' ? `<div class="rc-money"><span>Fecha de venta</span><b>${escapeHtml(l.saleDate)||'—'}</b></div>` : `<div class="rc-money"><span>Estado</span><b>${escapeHtml(l.status)}</b></div>`}
      <div class="rc-actions"><button class="btn small" data-act="edit">Editar</button></div>
    </div>`;
  }).join('')}</div>`;
}

function wireMiniCards(container){
  container.querySelectorAll('[data-act="edit"]').forEach(btn=>{
    btn.onclick = (e)=>{ e.stopPropagation(); const id = parseInt(btn.closest('.res-card').dataset.id,10); openClientModal(id); };
  });
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
    porCampania.push({ key:'sin-campania', nombre:'Sin campaña', color:'#94A3B8', clientes: sinCampania.length, ventas: ventasSc.length, ingresos: ventasSc.reduce((s,l)=>s+(Number(l.value)||0),0), conv: sinCampania.length ? (ventasSc.length/sinCampania.length*100) : 0 });
  }

  const porVendedor = [...SELLERS, ''].map(seller=>{
    const ventas = ganado.filter(l=>(l.seller||'')===seller);
    const ingresos = ventas.reduce((s,l)=>s+(Number(l.value)||0),0);
    const ticket = ventas.length ? ingresos/ventas.length : 0;
    return { key: seller || 'sin-asignar', label: seller || 'Sin asignar', ventas: ventas.length, ingresos, ticket };
  }).filter(v=>v.ventas>0 || v.key!=='sin-asignar');

  const reservas = leads.filter(l=>l.status==='propuesta');
  const porVendedorReservas = [...SELLERS, ''].map(seller=>{
    const items = reservas.filter(l=>(l.seller||'')===seller);
    const pendiente = items.reduce((s,l)=>s+remainingBalance(l),0);
    return { key: seller || 'sin-asignar', label: seller || 'Sin asignar', reservas: items.length, pendiente };
  }).filter(v=>v.reservas>0 || v.key!=='sin-asignar');

  const selectedCampaign = ui.dashSelectedCampaign || NONE;
  const selectedSeller = ui.dashSelectedSeller || NONE;
  const selectedReservaSeller = ui.dashSelectedReservaSeller || NONE;
  const campaignDetailList = selectedCampaign==='sin-campania' ? sinCampania
    : selectedCampaign!==NONE ? leads.filter(l=>l.campaign===selectedCampaign) : [];
  const sellerDetailList = selectedSeller===NONE ? []
    : selectedSeller==='sin-asignar' ? ganado.filter(l=>!l.seller)
    : ganado.filter(l=>l.seller===selectedSeller);
  const reservaDetailList = selectedReservaSeller===NONE ? []
    : selectedReservaSeller==='sin-asignar' ? reservas.filter(l=>!l.seller)
    : reservas.filter(l=>l.seller===selectedReservaSeller);

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
      <h3 style="font-family:'Playfair Display',serif;margin:0 0 4px;font-size:16px;">Clientes por campaña (¿por dónde ingresaron?)</h3>
      <p style="font-size:11.5px;color:var(--ink-dim);margin:0 0 10px;">Toca una fila para ver los clientes de esa campaña</p>
      ${porCampania.length===0 ? '<div class="empty-note">Todavía no hay campañas con clientes.</div>' : `
      <table id="campaignTable">
        <thead><tr><th>Campaña</th><th>Clientes</th><th>Ventas</th><th>Ingresos</th><th>Conversión</th></tr></thead>
        <tbody>
          ${porCampania.map(c=>`
            <tr class="clickable-row ${selectedCampaign===c.key?'active':''}" data-campaign-key="${c.key}">
              <td><span class="campaign-tag" style="background:${c.color}1A;color:${c.color}">${escapeHtml(c.nombre)}</span></td>
              <td class="mono">${c.clientes}</td>
              <td class="mono">${c.ventas}</td>
              <td class="mono">${money(c.ingresos)}</td>
              <td class="mono">${c.conv.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div id="campaignDetail">${selectedCampaign!==NONE ? leadMiniCardsHtml(campaignDetailList) : ''}</div>
      `}
    </div>

    <div class="panel">
      <h3 style="font-family:'Playfair Display',serif;margin:0 0 4px;font-size:16px;">Ventas por vendedor</h3>
      <p style="font-size:11.5px;color:var(--ink-dim);margin:0 0 10px;">Toca una fila para ver el detalle de esas ventas</p>
      ${porVendedor.length===0 ? '<div class="empty-note">Todavía no hay ventas con vendedor asignado.</div>' : `
      <table id="vendorTable">
        <thead><tr><th>Vendedor</th><th>Ventas</th><th>Ingresos</th><th>Ticket promedio</th></tr></thead>
        <tbody>
          ${porVendedor.map(v=>`
            <tr class="clickable-row ${selectedSeller===v.key?'active':''}" data-seller-key="${v.key}">
              <td>${escapeHtml(v.label)}</td>
              <td class="mono">${v.ventas}</td>
              <td class="mono">${money(v.ingresos)}</td>
              <td class="mono">${money(v.ticket)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div id="vendorDetail">${selectedSeller!==NONE ? leadMiniCardsHtml(sellerDetailList) : ''}</div>
      `}
    </div>

    <div class="panel" style="margin-top:18px;">
      <h3 style="font-family:'Playfair Display',serif;margin:0 0 4px;font-size:16px;">Reservas por vendedor</h3>
      <p style="font-size:11.5px;color:var(--ink-dim);margin:0 0 10px;">Clientes en Propuesta (sesión reservada, venta todavía sin cerrar) por vendedor</p>
      ${porVendedorReservas.length===0 ? '<div class="empty-note">Todavía no hay reservas con vendedor asignado.</div>' : `
      <table id="reservaVendorTable">
        <thead><tr><th>Vendedor</th><th>Reservas</th><th>Pendiente por cobrar</th></tr></thead>
        <tbody>
          ${porVendedorReservas.map(v=>`
            <tr class="clickable-row ${selectedReservaSeller===v.key?'active':''}" data-reserva-seller-key="${v.key}">
              <td>${escapeHtml(v.label)}</td>
              <td class="mono">${v.reservas}</td>
              <td class="mono">${money(v.pendiente)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div id="reservaVendorDetail">${selectedReservaSeller!==NONE ? leadMiniCardsHtml(reservaDetailList) : ''}</div>
      `}
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

  const campaignTable = document.getElementById('campaignTable');
  if(campaignTable){
    campaignTable.querySelectorAll('tr[data-campaign-key]').forEach(tr=>{
      tr.onclick = ()=>{
        const key = tr.dataset.campaignKey;
        ui.dashSelectedCampaign = ui.dashSelectedCampaign===key ? null : key;
        renderDashboard(main);
      };
    });
  }
  const vendorTable = document.getElementById('vendorTable');
  if(vendorTable){
    vendorTable.querySelectorAll('tr[data-seller-key]').forEach(tr=>{
      tr.onclick = ()=>{
        const key = tr.dataset.sellerKey;
        ui.dashSelectedSeller = ui.dashSelectedSeller===key ? null : key;
        renderDashboard(main);
      };
    });
  }
  const reservaVendorTable = document.getElementById('reservaVendorTable');
  if(reservaVendorTable){
    reservaVendorTable.querySelectorAll('tr[data-reserva-seller-key]').forEach(tr=>{
      tr.onclick = ()=>{
        const key = tr.dataset.reservaSellerKey;
        ui.dashSelectedReservaSeller = ui.dashSelectedReservaSeller===key ? null : key;
        renderDashboard(main);
      };
    });
  }
  const campaignDetail = document.getElementById('campaignDetail');
  if(campaignDetail) wireMiniCards(campaignDetail);
  const vendorDetail = document.getElementById('vendorDetail');
  if(vendorDetail) wireMiniCards(vendorDetail);
  const reservaVendorDetail = document.getElementById('reservaVendorDetail');
  if(reservaVendorDetail) wireMiniCards(reservaVendorDetail);
}
