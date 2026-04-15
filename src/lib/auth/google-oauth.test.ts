import { describe, expect, it, vi } from "vitest";
import { startGoogleOAuthFlow } from "@/lib/auth/google-oauth";
import type { SupabaseClient } from "@supabase/supabase-js";

interface OAuthCall {
  provider: string;
  options?: { redirectTo?: string; queryParams?: Record<string, string> };
}

function createSupabaseMock() {
  // 1) Create a spy function to capture OAuth payload.
  const signInWithOAuth = vi.fn(async (_payload: OAuthCall) => ({
    data: { url: "https://accounts.google.com/o/oauth2/auth" },
    error: null,
  }));
  // 2) Shape mock into supabase client subset.
  const client = {
    auth: {
      signInWithOAuth,
    },
  } as unknown as SupabaseClient;
  // 3) Return both client and spy for assertions.
  return { client, signInWithOAuth };
}

describe("startGoogleOAuthFlow", () => {
  it("calls Supabase OAuth with google provider and tools redirect", async () => {
    const { client, signInWithOAuth } = createSupabaseMock();

    await startGoogleOAuthFlow(client, "https://fincognis.onrender.com/tools");

    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://fincognis.onrender.com/tools",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  });
});

