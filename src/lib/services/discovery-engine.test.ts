import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import { AnalyzeResponseSchema, type AnalyzeRequest } from "@/lib/contracts/universal-asset-schemas";
import {
  __clearDiscoveryEngineStateForTests,
  createOrReuseDiscoverJob,
  getDiscoveryJob,
} from "@/lib/services/discovery-engine";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDiscoverRequest(): AnalyzeRequest {
  return {
    analysisMode: "discover",
    timeHorizon: "1y",
    assets: [
      {
        symbol: "TUPRS",
        originalInput: "TUPRS",
        class: AssetClass.Equity,
      },
    ],
  };
}

function buildDiscoverResponse(requestData: AnalyzeRequest) {
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
      fetchedAtIso: new Date("2026-01-01T10:00:00.000Z").toISOString(),
      note: "test",
    },
  });
}

describe("discovery-engine timeout resilience", () => {
  beforeEach(() => {
    __clearDiscoveryEngineStateForTests();
    vi.useFakeTimers();
    process.env.FINCOGNIS_DISCOVERY_BACKEND_TIMEOUT_MS = "60000";
    process.env.FINCOGNIS_DISCOVERY_RETRY_COUNT = "1";
    process.env.FINCOGNIS_DISCOVERY_RETRY_BASE_DELAY_MS = "200";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("completes a 45s discovery analysis within the 60s timeout window", async () => {
    const requestData = buildDiscoverRequest();
    const responsePayload = buildDiscoverResponse(requestData);
    const analyzeFn = vi.fn(async () => {
      await wait(45_000);
      return responsePayload;
    });

    const start = createOrReuseDiscoverJob(requestData, analyzeFn);
    const jobId = start.job.id;

    expect(["pending", "processing"]).toContain(start.job.status);

    await vi.advanceTimersByTimeAsync(45_000);

    const finalJob = getDiscoveryJob(jobId);
    expect(finalJob?.status).toBe("completed");
    expect(finalJob?.error).toBeUndefined();
    expect(finalJob?.data).toBeTruthy();
    expect(analyzeFn).toHaveBeenCalledTimes(1);
  });
});
