import { state, ui } from '../state.js';
import { toast } from '../utils.js';
import { saveLeads } from '../storage.js';
import { renderView } from '../nav.js';

export function wirePaymentModal(){
  document.getElementById('pCancel').onclick = ()=> document.getElementById('payOverlay').classList.remove('show');
  document.getElementById('pSave').onclick = ()=>{
    const amount = Number(document.getElementById('pAmount').value) || 0;
    if(amount>0){
      const lead = state.leads.find(l=>l.id===ui.payingId);
      lead.paid = (Number(lead.paid)||0) + amount;
      saveLeads(); renderView();
    }
    document.getElementById('payOverlay').classList.remove('show');
    toast('Abono registrado');
  };
  document.getElementById('payOverlay').addEventListener('click', e=>{ if(e.target.id==='payOverlay') e.currentTarget.classList.remove('show'); });
}
