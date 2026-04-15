import type { AuthSession } from "@/lib/contracts/core-schemas";
import { isAuthActive } from "@/lib/auth/auth-session";

export interface ToolsAccessDecision {
  action: "allow" | "redirect";
  redirectTo: string | null;
}

export function resolveToolsAccess(pathname: string, auth: AuthSession): ToolsAccessDecision {
  // 1) Determine whether current pathname is part of the protected tools area.
  const isProtectedToolsPath =
    pathname.startsWith("/tools") && !pathname.startsWith("/tools/login");
  // 2) Resolve active auth state including session expiration.
  const hasActiveSession = isAuthActive(auth);
  // 3) Redirect only when path is protected and user session is not active.
  if (isProtectedToolsPath && !hasActiveSession) {
    return { action: "redirect", redirectTo: "/tools/login?next=%2Ftools" };
  }
  // 4) Allow all other route/auth combinations.
  return { action: "allow", redirectTo: null };
}
