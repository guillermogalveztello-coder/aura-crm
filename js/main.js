import { state, DEFAULT_CAMPAIGNS, SEED_LEADS } from './state.js';
import { loadLeads, saveLeads, loadCampaigns, saveCampaigns } from './storage.js';
import { toast } from './utils.js';
import { renderNav, renderView } from './nav.js';
import { wireClientModal } from './modals/clientModal.js';
import { wirePaymentModal } from './modals/paymentModal.js';
import { wireCampaignModal } from './views/campanas.js';

async function init(){
  let leads = await loadLeads();
  let source = leads ? `guardado (${leads.length})` : '';
  if(!leads){ leads = SEED_LEADS.map(l=>({...l})); source = `nuevo (${leads.length})`; }
  let camps = await loadCampaigns();
  if(!camps) camps = DEFAULT_CAMPAIGNS;
  state.leads = leads;
  state.campaigns = camps;
  document.getElementById('dataSourceLabel').textContent = source;
  await saveLeads();
  await saveCampaigns();
  renderNav();
  renderView();
}

async function manualRefresh(){
  const btn = document.getElementById('refreshBtn');
  btn.textContent = 'Actualizando...';
  try{
    const fresh = await loadLeads();
    if(fresh && fresh.length){
      const map = new Map(state.leads.map(l=>[l.id,l]));
      fresh.forEach(l=>map.set(l.id,l));
      state.leads = Array.from(map.values()).sort((a,b)=>a.id-b.id);
      renderView();
      toast('Datos actualizados');
    }
  }catch(e){ console.error(e); }
  btn.textContent = '↻ Actualizar datos';
}

document.getElementById('refreshBtn').onclick = manualRefresh;

wireClientModal();
wirePaymentModal();
wireCampaignModal();

init();
