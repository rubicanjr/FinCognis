import { parseUserAuth, type UserAuth } from "@/lib/contracts/core-schemas";

export const AUTH_STORAGE_KEY = "fincognis_user_auth";

export function createGuestAuth(): UserAuth {
  // 1) Return strict guest auth for unauthenticated state.
  return {
    isAuthenticated: false,
    userId: null,
    email: null,
    role: "guest",
    sessionToken: null,
    issuedAt: null,
    expiresAt: null,
  };
}

export function createAuthenticatedUser(email: string): UserAuth {
  // 1) Build deterministic issued/expiry timestamps.
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 1000 * 60 * 60 * 12);
  // 2) Return strict member contract.
  return {
    isAuthenticated: true,
    userId: "fincognis-demo-user",
    email,
    role: "member",
    sessionToken: crypto.randomUUID().replace(/-/g, ""),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function isAuthActive(auth: UserAuth): boolean {
  // 1) Require authenticated flag and expiry field.
  if (!auth.isAuthenticated || !auth.expiresAt) {
    return false;
  }
  // 2) Validate expiry against current timestamp.
  return new Date(auth.expiresAt).getTime() > Date.now();
}

export function readAuthFromStorage(): UserAuth {
  // 1) Guard against non-browser context and return guest.
  if (typeof window === "undefined") {
    return createGuestAuth();
  }
  // 2) Read storage and parse strict auth schema.
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return createGuestAuth();
  }
  // 3) Parse serialized auth and fallback on failure.
  try {
    const parsed = parseUserAuth(JSON.parse(raw));
    return parsed && isAuthActive(parsed) ? parsed : createGuestAuth();
  } catch {
    return createGuestAuth();
  }
}

export function saveAuthToStorage(auth: UserAuth): void {
  // 1) Guard against non-browser context.
  if (typeof window === "undefined") {
    return;
  }
  // 2) Persist strict auth contract.
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuthFromStorage(): void {
  // 1) Guard against non-browser context.
  if (typeof window === "undefined") {
    return;
  }
  // 2) Remove auth key.
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

