import { createClient } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabaseUrl, supabaseAnonKey } from './config';

export const supabase = hasSupabaseConfig()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function signInWithEmail(email) {
  if (!supabase) return { user: { email }, session: { user: { email } } };
  const { data, error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
