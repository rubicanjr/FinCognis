import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAuthSessionFromSupabasePayload,
  createGuestSession,
  type AuthSession,
} from "@/lib/contracts/core-schemas";

export function isAuthActive(session: AuthSession): boolean {
  // 1) Require authenticated flag and expiration timestamp.
  if (!session.isAuthenticated || !session.expiresAt) return false;
  // 2) Compare expiration with current time.
  return new Date(session.expiresAt).getTime() > Date.now();
}

export async function getAuthSessionFromSupabase(
  supabase: SupabaseClient
): Promise<AuthSession> {
  // 1) Request current session from Supabase auth client.
  const { data, error } = await supabase.auth.getSession();
  // 2) Return guest session when request fails or session is empty.
  if (error || !data.session) return createGuestSession();
  // 3) Convert external payload into strict internal contract.
  return createAuthSessionFromSupabasePayload(data.session);
}

export function subscribeAuthSession(
  supabase: SupabaseClient,
  onSession: (session: AuthSession) => void
) {
  // 1) Subscribe to auth state changes.
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // 2) Convert nullable external payload into strict session.
    const nextSession = session
      ? createAuthSessionFromSupabasePayload(session)
      : createGuestSession();
    // 3) Emit normalized session to callback.
    onSession(nextSession);
  });
  // 4) Return unsubscribe function for caller cleanup.
  return () => data.subscription.unsubscribe();
}

export async function signOutFromSupabase(supabase: SupabaseClient): Promise<void> {
  // 1) Trigger Supabase sign-out operation.
  await supabase.auth.signOut();
}

