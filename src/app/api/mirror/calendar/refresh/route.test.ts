import { describe, expect, it } from "vitest";

describe("/api/mirror/calendar/refresh route", () => {
  it("returns 410 because refresh worker is intentionally disabled", async () => {
    const { POST } = await import("@/app/api/mirror/calendar/refresh/route");
    const response = await POST();
    const payload = (await response.json()) as { status?: string; ok?: boolean };

    expect(response.status).toBe(410);
    expect(payload.ok).toBe(false);
    expect(payload.status).toBe("DISABLED");
  });
});
