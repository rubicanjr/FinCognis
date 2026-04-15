import { describe, expect, it } from "vitest";
import { resolveToolsAccess } from "@/lib/auth/tools-gateway";
import type { AuthSession } from "@/lib/contracts/core-schemas";

describe("resolveToolsAccess", () => {
  it("redirects unauthorized users trying to reach /tools", () => {
    const guestAuth: AuthSession = {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
    };

    const result = resolveToolsAccess("/tools", guestAuth);

    expect(result.action).toBe("redirect");
    expect(result.redirectTo).toBe("/tools/login?next=%2Ftools");
  });
});
