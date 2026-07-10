import { supabase } from './supabaseClient.js';

export async function getSession(){
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Se dispara al iniciar (con la sesión guardada, si existe) y en cada login/logout.
export function onAuthChange(cb){
  supabase.auth.onAuthStateChange((_event, session) => cb(session));
}

export async function signIn(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) throw error;
  return data.session;
}

export async function signOut(){
  await supabase.auth.signOut();
}
