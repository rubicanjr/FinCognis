import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EconomicCalendarWidget from "@/components/landing/EconomicCalendarWidget";

describe("EconomicCalendarWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("renders loading skeleton while external widget is pending", () => {
    render(<EconomicCalendarWidget theme="dark" defaultCurrency={5} importance="1,2,3" />);

    expect(screen.getByTestId("calendar-widget-loading")).toBeInTheDocument();
  });

  it("shows error state when widget does not load within 5000ms", () => {
    render(<EconomicCalendarWidget theme="dark" defaultCurrency={5} importance="1,2,3" />);

    act(() => {
      vi.advanceTimersByTime(5001);
    });

    expect(screen.getByText("Takvim yüklenemedi. Lütfen tekrar deneyin.")).toBeInTheDocument();
  });
});
