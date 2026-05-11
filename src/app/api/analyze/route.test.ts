import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAnalyzeUniversalAssets = vi.fn();

vi.mock("@/lib/services/universal-asset-analysis-service", () => ({
  analyzeUniversalAssets: mockAnalyzeUniversalAssets,
}));

describe("/api/analyze route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns JSON error payload when analyze service throws", async () => {
    mockAnalyzeUniversalAssets.mockRejectedValueOnce(new Error("provider crash"));

    const { POST } = await import("@/app/api/analyze/route");
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assets: [{ symbol: "TUPRS", originalInput: "TUPRS", class: "EQUITY" }],
        timeHorizon: "1mo",
        analysisMode: "compare",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(500);
    expect(payload.error).toBeTypeOf("string");
    expect(payload.code).toBe("ANALYZE_INTERNAL_ERROR");
  });

  it("returns 200 when criteriaScores include only horizon-relevant subset keys", async () => {
    mockAnalyzeUniversalAssets.mockResolvedValueOnce([
      {
        symbol: "TUPRS",
        originalInput: "TUPRS",
        class: "EQUITY",
        metrics: {
          risk: 6,
          return: 7,
          liquidity: 6,
          diversification: 6,
          calmness: 5,
        },
        criteriaScores: {
          teknik_momentum: {
            id: "teknik_momentum",
            score: 6.5,
            rawScore: 42,
            available: true,
            source: "market_history",
            maxPossible: 70,
            achievedMax: 50,
            missing: ["kap"],
          },
          kurumsal_akis: {
            id: "kurumsal_akis",
            score: null,
            rawScore: null,
            available: false,
            source: "unavailable",
            maxPossible: 1,
            achievedMax: 0,
            missing: ["mkk_takas_proxy", "short_interest"],
          },
        },
      },
    ]);

    const { POST } = await import("@/app/api/analyze/route");
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assets: [{ symbol: "TUPRS", originalInput: "TUPRS", class: "EQUITY" }],
        timeHorizon: "1mo",
        analysisMode: "compare",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      assets: Array<{ criteriaScores?: Record<string, unknown> }>;
    };

    expect(response.status).toBe(200);
    expect(payload.assets[0]?.criteriaScores?.teknik_momentum).toBeDefined();
    expect(payload.assets[0]?.criteriaScores?.kurumsal_akis).toBeDefined();
  });
});
