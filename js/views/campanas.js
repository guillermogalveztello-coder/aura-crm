import { state, CAMPAIGN_COLORS } from '../state.js';
import { escapeHtml, toast } from '../utils.js';
import { saveCampaigns, deleteCampaignRemote } from '../storage.js';
import { renderView } from '../nav.js';

export function renderCampanas(main){
  main.innerHTML = `
    <div class="top-row">
      <div>
        <h1 class="page-title"><span class="nav-dot" style="background:var(--ink-dim)"></span>Campañas</h1>
        <p class="page-sub">Agrega, edita o quita las campañas activas</p>
      </div>
      <button class="btn primary" id="addCampaignBtn">+ Nueva campaña</button>
    </div>
    <div id="campaignsList"></div>
  `;
  document.getElementById('addCampaignBtn').onclick = ()=>{
    document.getElementById('nName').value='';
    document.getElementById('campOverlay').classList.add('show');
  };
  const list = document.getElementById('campaignsList');
  list.innerHTML = Object.keys(state.campaigns).map(key=>{
    const c = state.campaigns[key];
    const count = state.leads.filter(l=>l.campaign===key).length;
    return `
      <div class="campaign-item" data-key="${key}">
        <div class="ci-head">
          <span class="nav-dot" style="background:${c.color}"></span>
          <span class="ci-name">${escapeHtml(c.name)}</span>
          <span class="campaign-tag" style="background:${c.color}1A;color:${c.color}">${count} cliente${count===1?'':'s'}</span>
        </div>
        <label>Nombre de campaña</label>
        <input type="text" data-field="name" value="${escapeHtml(c.name)}">
        <label>Objetivo / descripción</label>
        <textarea data-field="objective" rows="2">${escapeHtml(c.objective||'')}</textarea>
        <div class="rc-actions">
          <button class="btn small" data-act="save">Guardar cambios</button>
          <button class="btn small danger" data-act="delete">Eliminar campaña</button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.campaign-item').forEach(item=>{
    const key = item.dataset.key;
    item.querySelector('[data-act="save"]').onclick = ()=>{
      const name = item.querySelector('[data-field="name"]').value.trim();
      const objective = item.querySelector('[data-field="objective"]').value.trim();
      if(!name){ toast('Ponle un nombre a la campaña'); return; }
      state.campaigns[key].name = name;
      state.campaigns[key].objective = objective;
      saveCampaigns(); renderView(); toast('Campaña actualizada');
    };
    item.querySelector('[data-act="delete"]').onclick = async ()=>{
      const count = state.leads.filter(l=>l.campaign===key).length;
      if(count>0){
        if(!confirm(`Esta campaña tiene ${count} cliente(s). ¿Eliminarla igual? Los clientes quedarán sin campaña asignada.`)) return;
      }
      delete state.campaigns[key];
      await deleteCampaignRemote(key);
      renderView(); toast('Campaña eliminada');
    };
  });
}

export function wireCampaignModal(){
  document.getElementById('nCancel').onclick = ()=> document.getElementById('campOverlay').classList.remove('show');
  document.getElementById('nSave').onclick = ()=>{
    const name = document.getElementById('nName').value.trim();
    if(!name){ toast('Ponle un nombre a la campaña'); return; }
    const key = 'camp_' + Date.now();
    const usedColors = Object.values(state.campaigns).map(c=>c.color);
    const color = CAMPAIGN_COLORS.find(c=>!usedColors.includes(c)) || CAMPAIGN_COLORS[Math.floor(Math.random()*CAMPAIGN_COLORS.length)];
    state.campaigns[key] = { name, color, objective: '' };
    saveCampaigns(); renderView();
    document.getElementById('campOverlay').classList.remove('show');
    toast('Campaña creada');
  };
  document.getElementById('campOverlay').addEventListener('click', e=>{ if(e.target===e.currentTarget) e.currentTarget.classList.remove('show'); });
}
