import { state, ui } from '../state.js';
import { escapeHtml, toast, campaignInfo, campaignImageSrc, buildWhatsAppGreeting, whatsappUrl } from '../utils.js';
import { saveLeads } from '../storage.js';
import { renderView } from '../nav.js';

export function renderAttendeeRows(attendees){
  const wrap = document.getElementById('attendeesWrap');
  wrap.innerHTML = '';
  const list = attendees && attendees.length ? attendees.slice() : [];
  while(list.length < 5) list.push({name:'', age:''});
  list.slice(0,5).forEach((a,idx)=>{
    const row = document.createElement('div');
    row.className = 'attendee-row';
    row.innerHTML = `<input placeholder="Asistente ${idx+1}" data-idx="${idx}" data-f="name" value="${escapeHtml(a.name)}">
      <input placeholder="Edad" type="number" min="0" data-idx="${idx}" data-f="age" value="${escapeHtml(a.age)}">`;
    wrap.appendChild(row);
  });
}
function collectAttendees(){
  const wrap = document.getElementById('attendeesWrap');
  const names = wrap.querySelectorAll('[data-f="name"]');
  const ages = wrap.querySelectorAll('[data-f="age"]');
  const out = [];
  names.forEach((inp,i)=>{
    const name = inp.value.trim();
    if(name) out.push({name, age: ages[i].value.trim()});
  });
  return out;
}
function populateCampaignSelect(selected){
  const sel = document.getElementById('cCampaign');
  sel.innerHTML = Object.keys(state.campaigns).map(k=>`<option value="${k}" ${k===selected?'selected':''}>${escapeHtml(state.campaigns[k].name)}</option>`).join('');
  updateCampaignPreview();
}

function updateCampaignPreview(){
  const key = document.getElementById('cCampaign').value;
  const wrap = document.getElementById('campaignPreview');
  const src = key ? campaignImageSrc(key) : null;
  if(src){
    document.getElementById('campaignPreviewImg').src = src;
    document.getElementById('campaignPreviewLink').href = src;
    wrap.style.display = '';
  } else {
    wrap.style.display = 'none';
  }
}

export function openClientModal(id){
  ui.editingId = id;
  const lead = id ? state.leads.find(l=>l.id===id) : null;
  document.getElementById('clientModalTitle').textContent = lead ? 'Editar cliente' : 'Agregar cliente';
  document.getElementById('cName').value = lead ? lead.name||'' : '';
  document.getElementById('cDni').value = lead ? lead.dni||'' : '';
  document.getElementById('cPhone').value = lead ? lead.phone||'' : '';
  populateCampaignSelect(lead ? lead.campaign : (ui.filterCampaign!=='todas'?ui.filterCampaign:Object.keys(state.campaigns)[0]));
  document.getElementById('cSeller').value = lead ? lead.seller||'' : '';
  renderAttendeeRows(lead ? lead.attendees : []);
  document.getElementById('cTotal').value = lead && lead.value ? lead.value : '';
  document.getElementById('cPaid').value = lead && lead.paid ? lead.paid : '';
  document.getElementById('cSessionDate').value = lead ? lead.sessionDate||'' : '';
  document.getElementById('cSessionTime').value = lead ? lead.sessionTime||'' : '';
  document.getElementById('cNotes').value = lead ? lead.notes||'' : '';
  document.getElementById('clientOverlay').classList.add('show');
}

export function wireClientModal(){
  document.getElementById('cCampaign').onchange = updateCampaignPreview;
  document.getElementById('cWhatsapp').onclick = ()=>{
    const phone = document.getElementById('cPhone').value.trim();
    if(!phone){ toast('Ingresa un número de teléfono primero'); return; }
    const name = document.getElementById('cName').value.trim();
    const campKey = document.getElementById('cCampaign').value;
    const campaign = campKey ? campaignInfo(campKey) : null;
    const message = buildWhatsAppGreeting({ name }, campaign);
    window.open(whatsappUrl(phone, message), '_blank', 'noopener');
  };
  document.getElementById('cCancel').onclick = ()=> document.getElementById('clientOverlay').classList.remove('show');
  document.getElementById('cSave').onclick = ()=>{
    const name = document.getElementById('cName').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    if(!name && !phone){ toast('Ingresa al menos nombre o número'); return; }
    const payload = {
      name: name || phone,
      dni: document.getElementById('cDni').value.trim(),
      phone,
      campaign: document.getElementById('cCampaign').value,
      seller: document.getElementById('cSeller').value,
      attendees: collectAttendees(),
      value: Number(document.getElementById('cTotal').value) || 0,
      paid: Number(document.getElementById('cPaid').value) || 0,
      sessionDate: document.getElementById('cSessionDate').value,
      sessionTime: document.getElementById('cSessionTime').value,
      notes: document.getElementById('cNotes').value.trim(),
    };
    if(ui.editingId){
      const lead = state.leads.find(l=>l.id===ui.editingId);
      Object.assign(lead, payload);
      if(lead.status==='nuevo' && (payload.value>0 || payload.sessionDate)) lead.status='propuesta';
    } else {
      const nextId = state.leads.length ? Math.max(...state.leads.map(l=>l.id))+1 : 1;
      state.leads.push({ id: nextId, status:'nuevo', date: new Date().toISOString().slice(0,10), saleDate:'', ...payload });
    }
    saveLeads(); renderView();
    document.getElementById('clientOverlay').classList.remove('show');
    toast('Guardado');
  };
  document.getElementById('clientOverlay').addEventListener('click', e=>{ if(e.target.id==='clientOverlay') e.currentTarget.classList.remove('show'); });
}
