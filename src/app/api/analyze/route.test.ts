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
});
