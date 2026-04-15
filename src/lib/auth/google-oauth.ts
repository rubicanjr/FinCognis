import type { SupabaseClient } from "@supabase/supabase-js";

export interface GoogleOAuthResult {
  ok: boolean;
  error: string | null;
}

export async function startGoogleOAuthFlow(
  supabase: SupabaseClient,
  redirectTo: string
): Promise<GoogleOAuthResult> {
  // 1) Trigger Supabase OAuth with Google provider and redirect target.
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  // 2) Return failure result when provider call returns error.
  if (error) {
    return { ok: false, error: error.message };
  }
  // 3) Return success result.
  return { ok: true, error: null };
}

