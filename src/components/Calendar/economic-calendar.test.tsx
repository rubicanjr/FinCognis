import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EconomicCalendar from "@/components/Calendar/EconomicCalendar";

describe("EconomicCalendar", () => {
  it("renders exactly N rows and does not show gecikme message for healthy payload", () => {
    const rows = [
      { symbol: "AAPL", price: 182.11, change: 1.42, changePercentage: "+0.79%", volume: "78.2M" },
      { symbol: "MSFT", price: 413.37, change: -2.13, changePercentage: "-0.51%", volume: "31.5M" },
      { symbol: "NVDA", price: 924.61, change: 7.32, changePercentage: "+0.80%", volume: "55.7M" },
    ];

    render(
      <EconomicCalendar
        state="IDLE"
        rows={rows}
        lastUpdated="2026-05-05T12:00:00.000Z"
        message="Canlı veri akışı hazır."
      />,
    );

    expect(screen.getAllByTestId("calendar-row")).toHaveLength(rows.length);
    expect(screen.queryByText(/gecikme/i)).not.toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });
});
