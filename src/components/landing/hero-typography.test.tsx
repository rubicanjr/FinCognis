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

  it("renders redesigned headline phrases", () => {
    render(<HeroSection />);

    const headings = screen.getAllByRole("heading", {
      level: 1,
      name: /FİNANSAL\s*KARARLAR\s*VERİYLE\s*ŞEKİLLENİYOR\s*FINCOGNIS\s*İLE\s*NETLEŞİYOR/,
    });

    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders single CTA and left-bottom metrics", () => {
    render(<HeroSection />);

    const ctaLinks = screen.getAllByRole("link", { name: /ARACI AÇ/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    expect(ctaLinks[0]).toHaveAttribute("href", "https://fincognis.onrender.com/tools");

    expect(screen.getAllByText("60 Milyon TL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bireysel Finansal Hacim").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+30").length).toBeGreaterThan(0);
    expect(screen.getAllByText("yıllık tecrübe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Decısıon Intellıgence").length).toBeGreaterThan(0);
    expect(screen.getAllByText("yaklaşımı").length).toBeGreaterThan(0);
  });
});
