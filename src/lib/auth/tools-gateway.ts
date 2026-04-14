import type { UserAuth } from "@/lib/contracts/core-schemas";

export interface ToolsAccessDecision {
  action: "allow" | "redirect";
  redirectTo: string | null;
}

export function resolveToolsAccess(pathname: string, auth: UserAuth): ToolsAccessDecision {
  // 1) Determine whether current pathname is part of the protected tools area.
  const isProtectedToolsPath =
    pathname.startsWith("/tools") && !pathname.startsWith("/tools/login");
  // 2) Redirect only when path is protected and user is not authenticated.
  if (isProtectedToolsPath && !auth.isAuthenticated) {
    return { action: "redirect", redirectTo: "/tools/login?next=%2Ftools" };
  }
  // 3) Allow all other route/auth combinations.
  return { action: "allow", redirectTo: null };
}
