import { expect, test } from "@playwright/test";

test.describe("Economic calendar reliability", () => {
  test("renders without hydration errors and keeps UI stable", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/ekonomik-takvim");
    await expect(page.getByRole("heading", { name: "Piyasa Etkinliklerini Anlık İzleyin" })).toBeVisible();

    await expect
      .poll(
        async () => {
          const rowCount = await page.getByTestId("calendar-row").count();
          const emptyVisible = await page.getByTestId("calendar-empty-state").isVisible().catch(() => false);
          return rowCount > 0 || emptyVisible;
        },
        { timeout: 20_000 },
      )
      .toBeTruthy();

    const hydrationErrors = consoleErrors.filter((value) => value.includes("React error #418") || value.includes("React error #423"));
    expect(hydrationErrors).toHaveLength(0);
  });

  test("returns deterministic 200 payload from most-active proxy", async ({ page }) => {
    const response = await page.request.get("/api/market/most-active");
    expect(response.status()).toBe(200);

    const payload = (await response.json()) as {
      state?: string;
      rows?: unknown[];
      lastUpdated?: string | null;
      message?: string | null;
    };

    expect(["IDLE", "SYNCING", "ERROR", "LOADING"]).toContain(payload.state);
    expect(Array.isArray(payload.rows)).toBeTruthy();
    expect(payload).toHaveProperty("lastUpdated");
    expect(payload).toHaveProperty("message");
  });
});
