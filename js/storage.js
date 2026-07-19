import { state, LEADS_KEY, CAMPAIGNS_KEY } from './state.js';
import { supabase } from './supabaseClient.js';

// --- Mapeo camelCase (app) <-> snake_case (tablas de Supabase) ---
function toDbLead(l){
  return {
    id: l.id,
    name: l.name || '',
    dni: l.dni || '',
    phone: l.phone || '',
    campaign: l.campaign || null,
    status: l.status || 'nuevo',
    value: Number(l.value) || 0,
    paid: Number(l.paid) || 0,
    attendees: l.attendees || [],
    session_date: l.sessionDate || '',
    session_time: l.sessionTime || '',
    notes: l.notes || '',
    lead_date: l.date || '',
    sale_date: l.saleDate || '',
    seller: l.seller || null,
  };
}
function fromDbLead(r){
  return {
    id: r.id,
    name: r.name || '',
    dni: r.dni || '',
    phone: r.phone || '',
    campaign: r.campaign || '',
    status: r.status || 'nuevo',
    value: Number(r.value) || 0,
    paid: Number(r.paid) || 0,
    attendees: r.attendees || [],
    sessionDate: r.session_date || '',
    sessionTime: r.session_time || '',
    notes: r.notes || '',
    date: r.lead_date || '',
    saleDate: r.sale_date || '',
    seller: r.seller || '',
  };
}
function toDbCampaign(key, c){
  return { key, name: c.name, color: c.color || '#999999', objective: c.objective || '', image: c.image || null };
}
function fromDbCampaign(r){
  return { name: r.name, color: r.color, objective: r.objective || '', image: r.image || null };
}

export async function loadLeads(){
  const { data, error } = await supabase.from('leads').select('*').order('id', { ascending: true });
  if(error){ console.error('loadLeads', error); return null; }
  if(!data || !data.length) return null;
  return data.map(fromDbLead);
}

export async function saveLeads(){
  if(!state.leads.length) return;
  const rows = state.leads.map(toDbLead);
  const { error } = await supabase.from('leads').upsert(rows, { onConflict: 'id' });
  if(error) console.error('saveLeads', error);
}

export async function loadCampaigns(){
  const { data, error } = await supabase.from('campaigns').select('*');
  if(error){ console.error('loadCampaigns', error); return null; }
  if(!data || !data.length) return null;
  const obj = {};
  data.forEach(r => { obj[r.key] = fromDbCampaign(r); });
  return obj;
}

export async function saveCampaigns(){
  const keys = Object.keys(state.campaigns);
  if(!keys.length) return;
  const rows = keys.map(k => toDbCampaign(k, state.campaigns[k]));
  const { error } = await supabase.from('campaigns').upsert(rows, { onConflict: 'key' });
  if(error) console.error('saveCampaigns', error);
}

export async function deleteCampaignRemote(key){
  const { error } = await supabase.from('campaigns').delete().eq('key', key);
  if(error) console.error('deleteCampaignRemote', error);
}

// Migración única: si Supabase está vacío (primera vez que se conecta) pero este navegador
// tiene datos guardados de la versión anterior (localStorage), los sube como punto de partida.
export async function migrateLocalIfEmpty(){
  try{
    const { count: leadCount } = await supabase.from('leads').select('id', { count: 'exact', head: true });
    const { count: campCount } = await supabase.from('campaigns').select('key', { count: 'exact', head: true });
    if((leadCount||0) > 0 || (campCount||0) > 0) return false;

    const rawCamps = localStorage.getItem(CAMPAIGNS_KEY);
    const rawLeads = localStorage.getItem(LEADS_KEY);
    if(!rawCamps && !rawLeads) return false;

    if(rawCamps){
      const camps = JSON.parse(rawCamps);
      const rows = Object.keys(camps).map(k => toDbCampaign(k, camps[k]));
      if(rows.length){
        const { error } = await supabase.from('campaigns').upsert(rows, { onConflict: 'key' });
        if(error) console.error('migrate campaigns', error);
      }
    }
    if(rawLeads){
      const leads = JSON.parse(rawLeads);
      const rows = leads.map(toDbLead);
      if(rows.length){
        const { error } = await supabase.from('leads').upsert(rows, { onConflict: 'id' });
        if(error) console.error('migrate leads', error);
      }
    }
    return true;
  }catch(e){ console.error('migrateLocalIfEmpty', e); return false; }
}

// Sincronización en vivo: cualquier cambio hecho por otro usuario/dispositivo llega aquí.
export function subscribeRealtime(onChange){
  const channel = supabase.channel('aura-crm-changes');
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, onChange);
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, onChange);
  channel.subscribe();
  return channel;
}

// Respaldo manual (exportar/importar JSON) como red de seguridad adicional a Supabase.
export function exportBackup(){
  const payload = { leads: state.leads, campaigns: state.campaigns, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aura-crm-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file){
  const text = await file.text();
  const payload = JSON.parse(text);
  if(payload.campaigns){
    const rows = Object.keys(payload.campaigns).map(k => toDbCampaign(k, payload.campaigns[k]));
    if(rows.length) await supabase.from('campaigns').upsert(rows, { onConflict: 'key' });
  }
  if(payload.leads && payload.leads.length){
    const rows = payload.leads.map(toDbLead);
    await supabase.from('leads').upsert(rows, { onConflict: 'id' });
  }
}
