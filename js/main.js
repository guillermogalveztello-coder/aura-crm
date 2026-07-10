import { state, DEFAULT_CAMPAIGNS, SEED_LEADS } from './state.js';
import { loadLeads, saveLeads, loadCampaigns, saveCampaigns, migrateLocalIfEmpty, subscribeRealtime, exportBackup, importBackup } from './storage.js';
import { toast } from './utils.js';
import { renderNav, renderView } from './nav.js';
import { wireClientModal } from './modals/clientModal.js';
import { wirePaymentModal } from './modals/paymentModal.js';
import { wireCampaignModal } from './views/campanas.js';
import { getSession, onAuthChange, signIn, signOut } from './auth.js';

let realtimeChannel = null;

async function loadData(){
  await migrateLocalIfEmpty();
  let leads = await loadLeads();
  let source = leads ? `Supabase (${leads.length})` : '';
  if(!leads){ leads = SEED_LEADS.map(l=>({...l})); source = `nuevo (${leads.length})`; }
  let camps = await loadCampaigns();
  if(!camps) camps = DEFAULT_CAMPAIGNS;
  state.leads = leads;
  state.campaigns = camps;
  document.getElementById('dataSourceLabel').textContent = source;
  if(source.startsWith('nuevo')){ await saveLeads(); await saveCampaigns(); }
  renderNav();
  renderView();
}

async function startApp(){
  document.getElementById('loginOverlay').classList.remove('show');
  document.getElementById('appFrame').style.display = '';
  await loadData();
  if(!realtimeChannel){
    realtimeChannel = subscribeRealtime(async ()=>{
      const [leads, camps] = await Promise.all([loadLeads(), loadCampaigns()]);
      if(leads) state.leads = leads;
      if(camps) state.campaigns = camps;
      renderView();
    });
  }
}

function showLogin(msg){
  document.getElementById('appFrame').style.display = 'none';
  document.getElementById('loginOverlay').classList.add('show');
  document.getElementById('loginError').textContent = msg || '';
}

async function manualRefresh(){
  const btn = document.getElementById('refreshBtn');
  btn.textContent = 'Actualizando...';
  try{
    const [leads, camps] = await Promise.all([loadLeads(), loadCampaigns()]);
    if(leads) state.leads = leads;
    if(camps) state.campaigns = camps;
    renderView();
    toast('Datos actualizados');
  }catch(e){ console.error(e); }
  btn.textContent = '↻ Actualizar datos';
}

document.getElementById('refreshBtn').onclick = manualRefresh;
document.getElementById('logoutBtn').onclick = ()=> signOut();
document.getElementById('exportBtn').onclick = ()=> exportBackup();
document.getElementById('importBtn').onclick = ()=> document.getElementById('importInput').click();
document.getElementById('importInput').onchange = async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  try{
    await importBackup(file);
    const [leads, camps] = await Promise.all([loadLeads(), loadCampaigns()]);
    if(leads) state.leads = leads;
    if(camps) state.campaigns = camps;
    renderView();
    toast('Datos importados');
  }catch(err){ console.error(err); toast('Error al importar el archivo'); }
  e.target.value = '';
};

document.getElementById('loginForm').onsubmit = async (e)=>{
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginSubmit');
  btn.disabled = true; btn.textContent = 'Entrando...';
  try{
    await signIn(email, password);
  }catch(err){
    showLogin('Correo o contraseña incorrectos');
  }
  btn.disabled = false; btn.textContent = 'Entrar';
};

wireClientModal();
wirePaymentModal();
wireCampaignModal();

onAuthChange((session)=>{
  if(session) startApp(); else showLogin();
});
