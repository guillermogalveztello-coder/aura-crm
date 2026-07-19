import { state, ui } from '../state.js';
import { escapeHtml, money, campaignInfo, remainingBalance } from '../utils.js';
import { openClientModal } from '../modals/clientModal.js';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function pad(n){ return String(n).padStart(2,'0'); }
function toKey(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }

// Sesiones a agendar: cualquier lead con fecha de sesión que no esté perdido
// (incluye "propuesta" en espera de sesión y "ganado" con sesión aún pendiente de hacer).
function sessionsForMonth(year, month){
  const map = {};
  state.leads.forEach(l=>{
    if(!l.sessionDate || l.status==='perdido') return;
    const parts = l.sessionDate.split('-').map(Number);
    if(parts.length!==3) return;
    const [y,m] = parts;
    if(y===year && (m-1)===month){
      (map[l.sessionDate] = map[l.sessionDate] || []).push(l);
    }
  });
  Object.values(map).forEach(list=>list.sort((a,b)=>(a.sessionTime||'').localeCompare(b.sessionTime||'')));
  return map;
}

export function renderCalendario(main){
  if(ui.calYear==null){ const t = new Date(); ui.calYear = t.getFullYear(); ui.calMonth = t.getMonth(); }
  main.innerHTML = `
    <h1 class="page-title"><span class="nav-dot" style="background:var(--terracotta)"></span>Calendario de sesiones</h1>
    <p class="page-sub">Sesiones fotográficas agendadas, por fecha</p>
    <div class="top-row">
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn small" id="calPrev">‹</button>
        <div style="font-family:'Playfair Display',serif;font-weight:600;font-size:18px;min-width:170px;text-align:center;" id="calLabel"></div>
        <button class="btn small" id="calNext">›</button>
      </div>
      <button class="btn small" id="calToday">Hoy</button>
    </div>
    <div id="calGrid"></div>
    <div id="calDayPanel" style="margin-top:18px;"></div>
  `;
  document.getElementById('calPrev').onclick = ()=>{ shiftMonth(-1); renderCalendario(main); };
  document.getElementById('calNext').onclick = ()=>{ shiftMonth(1); renderCalendario(main); };
  document.getElementById('calToday').onclick = ()=>{
    const t = new Date();
    ui.calYear = t.getFullYear(); ui.calMonth = t.getMonth(); ui.calSelected = toKey(t.getFullYear(), t.getMonth(), t.getDate());
    renderCalendario(main);
  };
  document.getElementById('calLabel').textContent = `${MESES[ui.calMonth]} ${ui.calYear}`;
  renderGrid();
  renderDayPanel();
}

function shiftMonth(delta){
  let m = ui.calMonth + delta, y = ui.calYear;
  if(m<0){ m=11; y--; } else if(m>11){ m=0; y++; }
  ui.calMonth = m; ui.calYear = y;
}

function renderGrid(){
  const grid = document.getElementById('calGrid');
  const year = ui.calYear, month = ui.calMonth;
  const sessions = sessionsForMonth(year, month);
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const t = new Date();
  const todayKey = toKey(t.getFullYear(), t.getMonth(), t.getDate());

  let cells = '';
  for(let i=0;i<startWeekday;i++) cells += `<div class="cal-cell cal-empty"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const key = toKey(year, month, d);
    const list = sessions[key] || [];
    const isToday = key===todayKey;
    const isSelected = key===ui.calSelected;
    cells += `
      <div class="cal-cell ${list.length?'has-sessions':''} ${isToday?'is-today':''} ${isSelected?'is-selected':''}" data-key="${key}">
        <div class="cal-daynum">${d}</div>
        ${list.length ? `<div class="cal-dots">
          ${list.slice(0,6).map(l=>`<span class="cal-dot" style="background:${campaignInfo(l.campaign).color}"></span>`).join('')}
          ${list.length>6 ? `<span class="cal-dot-more">+${list.length-6}</span>` : ''}
        </div>` : ''}
      </div>
    `;
  }
  grid.innerHTML = `
    <div class="cal-weekdays">${DIAS.map(d=>`<div>${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
  `;
  grid.querySelectorAll('.cal-cell[data-key]').forEach(cell=>{
    cell.onclick = ()=>{ ui.calSelected = cell.dataset.key===ui.calSelected ? null : cell.dataset.key; renderGrid(); renderDayPanel(); };
  });
}

function renderDayPanel(){
  const panel = document.getElementById('calDayPanel');
  if(!ui.calSelected){ panel.innerHTML = `<div class="empty-note">Toca un día con sesiones para ver el detalle.</div>`; return; }
  const list = state.leads
    .filter(l=>l.sessionDate===ui.calSelected && l.status!=='perdido')
    .sort((a,b)=>(a.sessionTime||'').localeCompare(b.sessionTime||''));
  const [y,m,d] = ui.calSelected.split('-').map(Number);
  const label = `${d} de ${MESES[m-1]} ${y}`;
  if(!list.length){
    panel.innerHTML = `<h3 style="font-family:'Playfair Display',serif;margin-bottom:8px;">${label}</h3><div class="empty-note">Sin sesiones agendadas este día.</div>`;
    return;
  }
  panel.innerHTML = `
    <h3 style="font-family:'Playfair Display',serif;margin-bottom:8px;">${label}</h3>
    <div class="card-grid" id="calDayGrid"></div>
  `;
  const dayGrid = document.getElementById('calDayGrid');
  dayGrid.innerHTML = list.map(l=>{
    const remaining = remainingBalance(l);
    const c = campaignInfo(l.campaign);
    return `
    <div class="res-card" data-id="${l.id}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="rc-name">${escapeHtml(l.name)}</span>
        <span class="campaign-tag" style="background:${c.color}1A;color:${c.color}">${escapeHtml(c.name)}</span>
      </div>
      <div class="rc-phone">🕐 ${escapeHtml(l.sessionTime)||'Hora no definida'}</div>
      <div class="rc-phone">${escapeHtml(l.phone)||'—'}</div>
      ${l.notes ? `<div class="rc-notes">📝 ${escapeHtml(l.notes)}</div>` : ''}
      <div class="rc-money"><span>${l.status==='ganado' ? '✓ Vendido' : 'Falta pagar'}</span><b>${l.status==='ganado' ? money(l.value) : money(remaining)}</b></div>
      <div class="rc-actions"><button class="btn small" data-act="edit">Editar</button></div>
    </div>
  `;
  }).join('');
  dayGrid.querySelectorAll('[data-act="edit"]').forEach(btn=>{
    btn.onclick = ()=>{ const id = parseInt(btn.closest('.res-card').dataset.id,10); openClientModal(id); };
  });
}
