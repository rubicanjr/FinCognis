import { describe, expect, it } from "vitest";

import { detectMislocatedHook } from "@/lib/repo-hygiene/rules";

describe("repo hygiene mislocation rule", () => {
  it("detects hook placed under src/components/ui and suggests src/hooks", () => {
    const filePath = "/project/src/components/ui/use-market-state.ts";
    const content = `
      import { useState } from "react";
      export function useMarketState() {
        const [value] = useState("ok");
        return value;
      }
    `;

    const issue = detectMislocatedHook(filePath, content);

    expect(issue).not.toBeNull();
    expect(issue?.reason).toContain("Hook export");
    expect(issue?.recommendedPath).toBe("/src/hooks/useMarketState.ts");
  });
});
