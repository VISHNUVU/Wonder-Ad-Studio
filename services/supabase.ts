
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SETUP_SQL } from './schema';
import { SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY } from './supabaseCredentials';

export { SUPABASE_SETUP_SQL };

const getSupabaseCredentials = () => {
  // 1. Check hardcoded credentials file (Highest Priority)
  if (SUPABASE_PROJECT_URL && SUPABASE_ANON_KEY) {
      return { url: SUPABASE_PROJECT_URL, key: SUPABASE_ANON_KEY, source: 'file' };
  }

  // 2. Check process.env (Build time)
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_ANON_KEY;
  if (envUrl && envKey) {
      return { url: envUrl, key: envKey, source: 'env' };
  }
  
  // 3. Check localStorage (Runtime Config)
  const storedUrl = localStorage.getItem('supabase_url');
  const storedKey = localStorage.getItem('supabase_key');

  return {
    url: storedUrl || '',
    key: storedKey || '',
    source: 'storage'
  };
};

const { url, key, source } = getSupabaseCredentials();

export const supabase = (url && key) 
  ? createClient(url, key) 
  : null;

export const isSupabaseConfigured = () => !!supabase;
export const usingHardcodedCredentials = source === 'file' || source === 'env';
