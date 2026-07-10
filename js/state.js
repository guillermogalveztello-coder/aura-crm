export const CAMPAIGN_COLORS = ["#D9695C","#C97A3C","#6E8F5E","#3B82F6","#9333EA","#DB2777"];

export const DEFAULT_CAMPAIGNS = {"leads": {"name": "LEADS TUS PRIMEROS AÑOS", "color": "#D9695C", "objective": "Convertir contactos de anuncios de Facebook/Instagram en sesiones reservadas del paquete Primer Añito."}, "aurakids": {"name": "AuraKids", "color": "#C97A3C", "objective": "Calificar y agendar sesiones infantiles / familiares y Smash Cake."}};

// Los datos reales de clientes ahora viven en Supabase (ver storage.js). Este arreglo se deja vacío
// a propósito: solo se usa como último recurso si Supabase estuviera completamente vacío y sin datos
// locales que migrar (por ejemplo, la primerísima vez que corre la app en un dispositivo nuevo).
// No debe contener datos personales reales, porque este archivo es público (repo/GitHub Pages).
export const SEED_LEADS = [];

export const STATUS_COLUMNS = [
  {key:"nuevo", label:"Nuevo", color:"#94A3B8"},
  {key:"contactado", label:"Contactado", color:"#3B82F6"},
  {key:"propuesta", label:"Propuesta", color:"#D9695C"},
  {key:"ganado", label:"Ganado", color:"#16A34A"},
  {key:"perdido", label:"Perdido", color:"#DC2626"},
];

export const LEADS_KEY = "aura_html_crm_leads_v1";
export const CAMPAIGNS_KEY = "aura_html_crm_campaigns_v1";

export const state = { leads: [], campaigns: {} };

export const ui = {
  view: "embudo",
  filterCampaign: "todas",
  searchQuery: "",
  editingId: null,
  payingId: null,
  dragId: null,
};
