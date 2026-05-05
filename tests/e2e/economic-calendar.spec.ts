import { expect, test } from "@playwright/test";

test.describe("Economic calendar reliability", () => {
  test("renders without hydration errors and avoids 5xx loop", async ({ page }) => {
    const consoleErrors: string[] = [];
    const calendarResponses: number[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    page.on("response", (response) => {
      if (response.url().includes("/api/mirror/calendar")) {
        calendarResponses.push(response.status());
      }
    });

    await page.goto("/ekonomik-takvim");
    await expect(page.getByRole("heading", { name: "Piyasa Etkinliklerini Anlık İzleyin" })).toBeVisible();

    await expect
      .poll(
        async () => {
          const count = await page.getByTestId("calendar-row").count();
          const emptyVisible = await page.getByTestId("calendar-empty-state").isVisible().catch(() => false);
          const toastVisible = await page.getByTestId("calendar-toast").isVisible().catch(() => false);
          return count > 0 || emptyVisible || toastVisible;
        },
        { timeout: 20_000 },
      )
      .toBeTruthy();

    const hydrationErrors = consoleErrors.filter((value) => value.includes("React error #418") || value.includes("React error #423"));
    expect(hydrationErrors).toHaveLength(0);
    expect(calendarResponses.some((status) => status >= 500)).toBeFalsy();
  });

  test("sends request on tomorrow click and returns stable status", async ({ page }) => {
    await page.goto("/ekonomik-takvim");
    await expect(page.getByRole("button", { name: "Yarın" })).toBeVisible();

    const tomorrowResponse = page.waitForResponse(
      (response) => response.url().includes("/api/mirror/calendar") && response.url().includes("range=tomorrow") && response.request().method() === "GET",
      { timeout: 30_000 },
    );

    await page.getByRole("button", { name: "Yarın" }).click();
    const response = await tomorrowResponse;
    expect(response.status()).toBe(200);

    const payload = (await response.json()) as { status?: string };
    expect(["READY", "SOURCE_UNAVAILABLE", "LOADING"]).toContain(payload.status);
  });
});
