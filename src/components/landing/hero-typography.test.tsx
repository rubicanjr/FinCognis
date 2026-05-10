import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HeroSection from "@/components/landing/HeroSection";

afterEach(() => {
  cleanup();
});

describe("HeroSection typography and layout", () => {
  it("applies tabular-nums to primary metric score", () => {
    render(<HeroSection />);
    const score = screen.getByText("4.8 / 10");
    expect(score).toHaveClass("tabular-nums");
  });

  it("renders h1 with font-tight class for premium typography", () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("font-tight");
  });

  it("h1 uses font-black weight", () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("font-black");
  });

  it("h1 has tight tracking for authoritarian look", () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.className).toContain("tracking-[-0.04em]");
  });

  it("renders hero header with full viewport height", () => {
    render(<HeroSection />);
    const header = document.getElementById("karsilastir");
    expect(header).not.toBeNull();
    expect(header!.className).toContain("min-h-[100dvh]");
  });

  it("hero header uses flex centering for vertical alignment", () => {
    render(<HeroSection />);
    const header = document.getElementById("karsilastir");
    expect(header).toHaveClass("justify-center");
  });

  it("renders both CTA buttons via link href", () => {
    render(<HeroSection />);
    const toolsLinks = screen.getAllByRole("link", { name: /Karşılaştırmayı Aç/ });
    expect(toolsLinks.length).toBeGreaterThanOrEqual(1);

    const profileLinks = screen.getAllByRole("link", { name: /Profil Keşfi İncele/ });
    expect(profileLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("CTA buttons use font-tight", () => {
    render(<HeroSection />);
    const toolsLinks = screen.getAllByRole("link", { name: /Karşılaştırmayı Aç/ });
    const primaryBtn = toolsLinks[0];
    expect(primaryBtn).toHaveClass("font-tight");
  });

  it("renders candlestick background layer", () => {
    render(<HeroSection />);
    const bgLayer = document.querySelector(".hero-candlestick-bg");
    expect(bgLayer).not.toBeNull();
  });

  it("renders depth gradient layer", () => {
    render(<HeroSection />);
    const depthLayer = document.querySelector(".hero-depth-gradient");
    expect(depthLayer).not.toBeNull();
  });
});
