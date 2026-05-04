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
      new Response(JSON.stringify({ error: "Mirror source returned 502" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    render(<EconomicCalendarPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-toast")).toBeInTheDocument();
    });
  });

  it("renders graceful empty state when no events are available", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          tab: "economic",
          range: "today",
          updatedAt: new Date().toISOString(),
          events: [],
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

    expect(screen.getByText("Günün geri kalanı için veri bulunmamaktadır")).toBeInTheDocument();
  });
});
