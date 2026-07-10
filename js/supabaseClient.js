import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Publishable key: segura para exponer en el navegador (protegida por RLS en la base de datos).
const SUPABASE_URL = 'https://prkrlmsyfyycvyelcctz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0vnIn7sgvTW8kwBu5meJtw_twQGsxWu';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
