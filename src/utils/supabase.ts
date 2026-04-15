import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

interface SupabasePublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function readSupabasePublicEnv(): SupabasePublicEnv | null {
  // 1) Read required public Supabase environment variables.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // 2) Return null when at least one variable is missing.
  if (!supabaseUrl || !supabaseAnonKey) return null;
  // 3) Return normalized env payload.
  return { supabaseUrl, supabaseAnonKey };
}

export function hasSupabasePublicEnv(): boolean {
  // 1) Resolve env payload from strict reader.
  const env = readSupabasePublicEnv();
  // 2) Return boolean availability state.
  return Boolean(env);
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  // 1) Return memoized client when already initialized.
  if (browserClient) return browserClient;
  // 2) Resolve public env payload.
  const env = readSupabasePublicEnv();
  // 3) Return null when env values are missing.
  if (!env) return null;
  // 4) Initialize and memoize browser client.
  browserClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  // 5) Return initialized client.
  return browserClient;
}
