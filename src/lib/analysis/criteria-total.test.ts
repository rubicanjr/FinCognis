import { describe, expect, it } from "vitest";
import { computeCriteriaTotal } from "@/lib/analysis/criteria-total";

describe("computeCriteriaTotal", () => {
  it("sums only currently visible criterion scores", () => {
    const total = computeCriteriaTotal([10, 4.1, 7.6]);
    expect(total).toBe(21.7);
  });

  it("ignores null criteria and returns null when all are null", () => {
    expect(computeCriteriaTotal([10, null, 5.5])).toBe(15.5);
    expect(computeCriteriaTotal([null, null])).toBeNull();
  });
});
