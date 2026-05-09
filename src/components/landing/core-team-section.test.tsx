import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CoreTeamSection from "@/components/landing/CoreTeamSection";

describe("CoreTeamSection", () => {
  it("renders CoreTeam heading", () => {
    render(<CoreTeamSection />);

    expect(screen.getByRole("heading", { name: "CoreTeam" })).toBeInTheDocument();
  });

  it("renders exactly three cards under Decision Architects", () => {
    render(<CoreTeamSection />);

    const decisionArchitectsHeading = screen.getAllByText("Decision Architects")[0];
    const decisionArchitectsSection = decisionArchitectsHeading.closest("section");

    expect(decisionArchitectsSection).not.toBeNull();

    const cards = within(decisionArchitectsSection as HTMLElement).getAllByTestId("core-team-member-card");
    expect(cards).toHaveLength(3);
  });
});
