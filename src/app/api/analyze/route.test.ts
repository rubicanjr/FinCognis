import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import { AnalyzeResponseSchema, type AnalyzeRequest } from "@/lib/contracts/universal-asset-schemas";
import { DiscoveryJobAcceptedSchema, DiscoveryJobStatusResponseSchema } from "@/lib/contracts/discover-job-schemas";
import {
  __clearDiscoveryEngineStateForTests,
  __seedDiscoveryCacheForTests,
} from "@/lib/services/discovery-engine";

const mockAnalyzeUniversalAssets = vi.fn();

vi.mock("@/lib/services/universal-asset-analysis-service", () => ({
  analyzeUniversalAssets: mockAnalyzeUniversalAssets,
}));

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRequest(assetsCount: number, timeHorizon: AnalyzeRequest["timeHorizon"] = "1y"): AnalyzeRequest {
  return {
    analysisMode: "discover",
    timeHorizon,
    assets: Array.from({ length: assetsCount }).map((_, index) => ({
      symbol: `SYM${index + 1}`,
      originalInput: `SYM${index + 1}`,
      class: AssetClass.Equity,
      category: index % 2 === 0 ? "BIST_STOCK" : "US_STOCK",
    })),
  };
}

function buildResponseFromRequest(requestData: AnalyzeRequest) {
  return AnalyzeResponseSchema.parse({
    assets: requestData.assets.map((asset) => ({
      symbol: asset.symbol,
      originalInput: asset.originalInput,
      class: asset.class,
      metrics: {
        risk: 6,
        return: 6,
        liquidity: 6,
        diversification: 6,
        calmness: 6,
      },
      computation: {
        isFallback: false,
        fallbackReasons: [],
        modelVersion: "analysis_engine_v2_quant",
        timeHorizon: requestData.timeHorizon,
      },
    })),
    warnings: [],
    meta: {
      mode: "realtime_gateway",
      provider: "Yahoo Finance MarketDataGateway",
      fetchedAtIso: new Date().toISOString(),
      note: "test",
    },
  });
}

describe("/api/analyze discover job flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __clearDiscoveryEngineStateForTests();
    process.env.FINCOGNIS_ANALYZE_TIMEOUT_MS = "30000";
  });

  it("Edge Case A: returns partial cached data in failed job when gateway fails", async () => {
    const requestData = buildRequest(3, "1y");
    const cachedResponse = buildResponseFromRequest(requestData);
    __seedDiscoveryCacheForTests(requestData, cachedResponse);

    mockAnalyzeUniversalAssets.mockRejectedValueOnce(new Error("gateway_504_timeout"));

    const { POST } = await import("@/app/api/analyze/route");
    const startResponse = await POST(new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    }));

    expect(startResponse.status).toBe(200);
    const payload = await startResponse.json();
    const parsedPayload = AnalyzeResponseSchema.parse(payload);
    expect(parsedPayload.assets.length).toBeGreaterThan(0);
  });

  it("Edge Case B: accepts 10+ assets and starts discover job without blocking", async () => {
    const requestData = buildRequest(12, "1y");
    const analyzedResponse = buildResponseFromRequest(requestData).assets;

    mockAnalyzeUniversalAssets.mockResolvedValueOnce(analyzedResponse);

    const { POST } = await import("@/app/api/analyze/route");
    const startResponse = await POST(new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    }));

    expect(startResponse.status).toBe(202);
    const acceptedPayload = DiscoveryJobAcceptedSchema.parse(await startResponse.json());

    const { GET } = await import("@/app/api/analyze/status/[jobId]/route");

    await wait(40);
    const statusResponse = await GET(new Request("http://localhost/api/analyze/status/job"), {
      params: { jobId: acceptedPayload.jobId },
    });

    expect(statusResponse.status).toBe(200);
    const parsedStatus = DiscoveryJobStatusResponseSchema.parse(await statusResponse.json());
    expect(["pending", "processing", "completed", "failed"]).toContain(parsedStatus.job.status);
    expect(parsedStatus.job.progress).toBeGreaterThanOrEqual(0);
    expect(parsedStatus.job.progress).toBeLessThanOrEqual(100);
  }, 15_000);
});
