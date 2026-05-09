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

  it("renders exactly six cards under Strategic Operators", () => {
    render(<CoreTeamSection />);

    const strategicOperatorsHeading = screen.getAllByText("Strategic Operators")[0];
    const strategicOperatorsSection = strategicOperatorsHeading.closest("section");

    expect(strategicOperatorsSection).not.toBeNull();

    const cards = within(strategicOperatorsSection as HTMLElement).getAllByTestId("core-team-member-card");
    expect(cards).toHaveLength(6);
  });

  it("every member card renders avatar images with valid imageUrl paths", () => {
    render(<CoreTeamSection />);

    const expectedPaths = [
      "/assets/team/rubi.png",
      "/assets/team/adrian.png",
      "/assets/team/mina.png",
      "/assets/team/sahincan.png",
      "/assets/team/batuhan.png",
      "/assets/team/yigit.png",
      "/assets/team/alara.png",
      "/assets/team/buse.png",
      "/assets/team/victor.png",
    ];

    // Verify each expected image path appears in at least one avatar element
    const allAvatars = screen.getAllByTestId("member-avatar");
    expect(allAvatars.length).toBeGreaterThanOrEqual(9);

    for (const path of expectedPaths) {
      const matching = allAvatars.filter((img) => {
        const src = img.getAttribute("src") ?? "";
        return src.includes(encodeURIComponent(path));
      });
      expect(matching.length, `Expected avatar for ${path}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("renders correct avatar for Rubi Can", () => {
    render(<CoreTeamSection />);

    const rubiCard = screen.getAllByTestId("core-team-member-card").find((card) => {
      return card.textContent?.includes("Rubi Can İçliyürek");
    });

    expect(rubiCard).not.toBeUndefined();

    const avatars = within(rubiCard as HTMLElement).getAllByTestId("member-avatar");
    const src = avatars[0].getAttribute("src") ?? "";
    expect(src).toContain(encodeURIComponent("/assets/team/rubi.png"));
  });

  it("does not contain Olivers Mert Uz", () => {
    render(<CoreTeamSection />);

    expect(screen.queryByText(/Olivers Mert Uz/)).not.toBeInTheDocument();
  });
});
