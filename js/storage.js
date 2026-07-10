import { state, LEADS_KEY, CAMPAIGNS_KEY } from './state.js';

let writeQueue = Promise.resolve();
function queueWrite(fn){
  const run = async ()=>{
    for(let i=0;i<3;i++){
      try{ await fn(); return; }
      catch(e){ if(i===2) console.error('write failed', e); else await new Promise(r=>setTimeout(r, 350*(i+1))); }
    }
  };
  writeQueue = writeQueue.then(run, run);
  return writeQueue;
}

export async function loadLeads(){
  try{
    if(window.storage){
      const res = await window.storage.get(LEADS_KEY, false);
      if(res && res.value){ const arr = JSON.parse(res.value); if(Array.isArray(arr) && arr.length) return arr; }
    }
  }catch(e){}
  try{
    const raw = localStorage.getItem(LEADS_KEY);
    if(raw){ const arr = JSON.parse(raw); if(Array.isArray(arr) && arr.length) return arr; }
  }catch(e){}
  return null;
}
export async function saveLeads(){
  const json = JSON.stringify(state.leads);
  try{ if(window.storage) await queueWrite(()=>window.storage.set(LEADS_KEY, json, false)); }catch(e){ console.error(e); }
  try{ localStorage.setItem(LEADS_KEY, json); }catch(e){}
}
export async function loadCampaigns(){
  try{
    if(window.storage){
      const res = await window.storage.get(CAMPAIGNS_KEY, false);
      if(res && res.value) return JSON.parse(res.value);
    }
  }catch(e){}
  try{
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return null;
}
export async function saveCampaigns(){
  const json = JSON.stringify(state.campaigns);
  try{ if(window.storage) await queueWrite(()=>window.storage.set(CAMPAIGNS_KEY, json, false)); }catch(e){ console.error(e); }
  try{ localStorage.setItem(CAMPAIGNS_KEY, json); }catch(e){}
}
