import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EconomicCalendarPanel from "@/components/landing/EconomicCalendarPanel";

const originalFetch = global.fetch;

describe("EconomicCalendarPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("renders loading skeleton while request is pending", () => {
    global.fetch = vi.fn(() => new Promise<Response>(() => {})) as typeof fetch;

    render(<EconomicCalendarPanel />);

    expect(screen.getByTestId("calendar-loading-skeleton")).toBeInTheDocument();
  });

  it("shows toast notification when proxy returns 5xx", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "SOURCE_UNAVAILABLE",
          tab: "economic",
          range: "today",
          updatedAt: null,
          events: [],
          message: "Veri sunucusu senkronizasyonunda geçici bir gecikme yaşanıyor.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    render(<EconomicCalendarPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-toast")).toBeInTheDocument();
    });
  });

  it("renders rows when service returns READY payload", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "READY",
          tab: "economic",
          range: "today",
          updatedAt: "2026-05-05T11:00:00.000Z",
          events: [
            {
              id: "evt-1",
              time: "2026-05-05T13:00:00+03:00",
              currency: "USD",
              importance: 3,
              eventTitle: "ABD PMI",
              actual: "53.1",
              forecast: "52.8",
              previous: "52.2",
              impactLevel: "High",
            },
          ],
          message: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    render(<EconomicCalendarPanel />);

    await waitFor(() => {
      expect(screen.getByText("ABD PMI")).toBeInTheDocument();
    });
  });

  it("renders technical fallback when no events are available", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "READY",
          tab: "economic",
          range: "today",
          updatedAt: new Date().toISOString(),
          events: [],
          message: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    render(<EconomicCalendarPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-empty-state")).toBeInTheDocument();
    });

    expect(screen.getAllByTestId("calendar-empty-state").length).toBeGreaterThan(0);
  });
});

