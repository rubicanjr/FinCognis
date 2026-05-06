import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HeroSection from "@/components/landing/HeroSection";

describe("HeroSection typography", () => {
  it("applies tabular-nums to primary metric score", () => {
    render(<HeroSection />);

    const score = screen.getByText("4.8 / 10");
    expect(score).toHaveClass("tabular-nums");
  });
});
