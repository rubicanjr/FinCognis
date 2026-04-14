import { describe, expect, it } from "vitest";
import { resolveToolsAccess } from "@/lib/auth/tools-gateway";
import type { UserAuth } from "@/lib/contracts/core-schemas";

describe("resolveToolsAccess", () => {
  it("redirects unauthorized users trying to reach /tools", () => {
    const guestAuth: UserAuth = {
      isAuthenticated: false,
      userId: null,
      email: null,
      role: "guest",
      sessionToken: null,
      issuedAt: null,
      expiresAt: null,
    };

    const result = resolveToolsAccess("/tools", guestAuth);

    expect(result.action).toBe("redirect");
    expect(result.redirectTo).toBe("/tools/login?next=%2Ftools");
  });
});

