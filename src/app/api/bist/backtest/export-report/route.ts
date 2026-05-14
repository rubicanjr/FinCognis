import { NextResponse } from "next/server";
import { GET as runBacktestRoute } from "../route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ExportableBacktestResult {
  ticker: string;
  informationRatio: number | null;
  trackingErrorPercent: number;
  trackingErrorDecomposition: {
    skillComponentPercent: number;
    noiseComponentPercent: number;
  };
  rejectionBreakdown: {
    liquidity: number;
    riskScore: number;
    volatilityRegime: number;
    drawdown: number;
    invalidPrice: number;
    total: number;
  };
  doctrineBreakdown: {
    liquidityCascade: number;
    marginDynamics: number;
    adversarialRisk: number;
    institutionalInertia: number;
    agencyProblem: number;
  };
  rejectionTimeline: Array<{
    reason: string;
    category: "LIQUIDITY_CASCADE" | "MARGIN_DYNAMICS" | "ADVERSARIAL_RISK" | "REGIME_SHIFT";
  }>;
  blackSwan: {
    hedgeCostAmount: number;
    hedgePayoffAmount: number;
    netCostAmount: number;
  };
  regimeShiftAnalysis: {
    highRiskShiftCount: number;
    avgResponseBars: number | null;
  };
  survival: {
    worstDayPercent: number;
    survivalProbabilityPercent: number;
  };
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildExecutiveSummary(rows: ExportableBacktestResult[], fireSaleThreshold: number) {
  const irRows = rows.filter((r) => r.informationRatio != null);
  const avgInformationRatio = mean(irRows.map((r) => r.informationRatio as number));
  const avgTrackingErrorPercent = mean(rows.map((r) => r.trackingErrorPercent));

  let deflationaryNumerator = 0;
  let deflationaryDenominator = 0;
  let inflationaryNumerator = 0;
  let inflationaryDenominator = 0;

  for (const row of rows) {
    const ir = row.informationRatio ?? 0;
    const highShiftCount = row.rejectionTimeline.filter((e) => e.reason === "REGIME_SHIFT_HIGH").length;
    const nonHighShiftCount = row.rejectionTimeline.filter(
      (e) => e.reason === "REGIME_SHIFT_NORMAL" || e.reason === "REGIME_SHIFT_LOW"
    ).length;

    const deflationaryWeight = Math.max(1, highShiftCount);
    const inflationaryWeight = Math.max(1, nonHighShiftCount);

    deflationaryNumerator += ir * deflationaryWeight;
    deflationaryDenominator += deflationaryWeight;

    inflationaryNumerator += ir * inflationaryWeight;
    inflationaryDenominator += inflationaryWeight;
  }

  const deflationaryWeightedIR = deflationaryDenominator > 0 ? deflationaryNumerator / deflationaryDenominator : 0;
  const inflationaryWeightedIR = inflationaryDenominator > 0 ? inflationaryNumerator / inflationaryDenominator : 0;

  const totalHedgeCost = rows.reduce((s, r) => s + r.blackSwan.hedgeCostAmount, 0);
  const totalBlackSwanPayoff = rows.reduce((s, r) => s + r.blackSwan.hedgePayoffAmount, 0);
  const totalBlackSwanNetCost = rows.reduce((s, r) => s + r.blackSwan.netCostAmount, 0);

  const totalTrackingSkillComponent = rows.reduce((s, r) => s + r.trackingErrorDecomposition.skillComponentPercent, 0);
  const totalTrackingNoiseComponent = rows.reduce((s, r) => s + r.trackingErrorDecomposition.noiseComponentPercent, 0);

  const responseRows = rows.filter((r) => r.regimeShiftAnalysis.avgResponseBars != null && r.regimeShiftAnalysis.highRiskShiftCount > 0);
  const avgRegimeResponseBars = mean(responseRows.map((r) => r.regimeShiftAnalysis.avgResponseBars as number));

  const fireSaleCandidates = rows
    .filter((r) => r.survival.worstDayPercent <= -fireSaleThreshold)
    .map((r) => ({ ticker: r.ticker, worstDayPercent: r.survival.worstDayPercent }));

  const worstCase = rows
    .map((r) => ({ ticker: r.ticker, worstDayPercent: r.survival.worstDayPercent }))
    .sort((a, b) => a.worstDayPercent - b.worstDayPercent)[0] ?? null;

  const institutionalInertiaEvents = rows.reduce((s, r) => s + r.doctrineBreakdown.institutionalInertia, 0);
  const agencyProblemEvents = rows.reduce((s, r) => s + r.doctrineBreakdown.agencyProblem, 0);
  const totalAdversarial = rows.reduce((s, r) => s + r.doctrineBreakdown.adversarialRisk, 0);
  const totalRejectedEntries = rows.reduce((s, r) => s + r.rejectionBreakdown.total, 0);

  const behavioralAlphaCaptureRate = totalRejectedEntries > 0 ? totalAdversarial / totalRejectedEntries : 0;

  return {
    tickers: rows.length,
    avgInformationRatio: round(avgInformationRatio),
    deflationaryWeightedIR: round(deflationaryWeightedIR),
    inflationaryWeightedIR: round(inflationaryWeightedIR),
    avgTrackingErrorPercent: round(avgTrackingErrorPercent),
    trackingErrorDecomposition: {
      skillComponentPercent: round(totalTrackingSkillComponent, 2),
      noiseComponentPercent: round(totalTrackingNoiseComponent, 2),
    },
    blackSwan: {
      totalHedgeCost: round(totalHedgeCost, 2),
      totalPayoff: round(totalBlackSwanPayoff, 2),
      totalNetCost: round(totalBlackSwanNetCost, 2),
      selfFinancingConvexity: totalBlackSwanNetCost <= 0 && totalBlackSwanPayoff > 0,
    },
    regimeResponse: {
      avgRegimeResponseBars: responseRows.length ? round(avgRegimeResponseBars, 2) : null,
      sampleSize: responseRows.length,
    },
    fireSale: {
      thresholdPercent: fireSaleThreshold,
      candidates: fireSaleCandidates,
      worstCase,
    },
    behavioralAlpha: {
      institutionalInertiaEvents,
      agencyProblemEvents,
      totalAdversarialEvents: totalAdversarial,
      behavioralAlphaCaptureRate: round(behavioralAlphaCaptureRate, 4),
    },
  };
}

function toMarkdownReport(summary: ReturnType<typeof buildExecutiveSummary>, strategy: string, config: Record<string, unknown>) {
  const fireSaleLines = summary.fireSale.candidates.length
    ? summary.fireSale.candidates.map((c) => `- ${c.ticker}: ${round(c.worstDayPercent, 4)}%`).join("\n")
    : "- Yok";

  return [
    "# BIST Executive Behavioral Alpha Report",
    "",
    `- Strategy: ${strategy}`,
    `- Tickers: ${summary.tickers}`,
    `- Fire Sale Threshold: ${summary.fireSale.thresholdPercent}%`,
    "",
    "## IR & Tracking Error",
    `- Avg Information Ratio: ${summary.avgInformationRatio}`,
    `- Deflationary Weighted IR: ${summary.deflationaryWeightedIR}`,
    `- Inflationary Weighted IR: ${summary.inflationaryWeightedIR}`,
    `- Avg Tracking Error %: ${summary.avgTrackingErrorPercent}`,
    `- Tracking Skill Component: ${summary.trackingErrorDecomposition.skillComponentPercent}`,
    `- Tracking Noise Component: ${summary.trackingErrorDecomposition.noiseComponentPercent}`,
    "",
    "## Convexity / Black Swan",
    `- Total Hedge Cost: ${summary.blackSwan.totalHedgeCost}`,
    `- Total Hedge Payoff: ${summary.blackSwan.totalPayoff}`,
    `- Total Net Cost: ${summary.blackSwan.totalNetCost}`,
    `- Self-Financing Convexity: ${summary.blackSwan.selfFinancingConvexity ? "YES" : "NO"}`,
    "",
    "## Regime Response",
    `- Avg Regime Response Bars: ${summary.regimeResponse.avgRegimeResponseBars ?? "N/A"}`,
    `- Response Sample Size: ${summary.regimeResponse.sampleSize}`,
    "",
    "## Fire Sale / Liquidity Drought",
    `- Worst-case Day: ${summary.fireSale.worstCase ? `${summary.fireSale.worstCase.ticker} (${round(summary.fireSale.worstCase.worstDayPercent, 4)}%)` : "N/A"}`,
    "- Fire Sale Candidates:",
    fireSaleLines,
    "",
    "## Behavioral Alpha",
    `- Institutional Inertia Events: ${summary.behavioralAlpha.institutionalInertiaEvents}`,
    `- Agency Problem Events: ${summary.behavioralAlpha.agencyProblemEvents}`,
    `- Total Adversarial Events: ${summary.behavioralAlpha.totalAdversarialEvents}`,
    `- Behavioral Alpha Capture Rate: ${summary.behavioralAlpha.behavioralAlphaCaptureRate}`,
    "",
    "## Config Snapshot",
    "```json",
    JSON.stringify(config, null, 2),
    "```",
    "",
    "_Bu rapor egitim amaclidir, yatirim tavsiyesi degildir._",
  ].join("\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  const fireSaleThresholdRaw = Number(url.searchParams.get("fireSaleThreshold") ?? "12");
  const fireSaleThreshold = Number.isFinite(fireSaleThresholdRaw)
    ? Math.max(1, Math.min(50, fireSaleThresholdRaw))
    : 12;

  const backtestParams = new URLSearchParams(url.searchParams);
  backtestParams.delete("format");
  backtestParams.delete("fireSaleThreshold");

  try {
    const backtestUrl = new URL(request.url);
    backtestUrl.pathname = "/api/bist/backtest";
    backtestUrl.search = backtestParams.toString();

    const backtestResponse = await runBacktestRoute(new Request(backtestUrl.toString(), { method: "GET" }));
    const payload = await backtestResponse.json();
    if (!backtestResponse.ok) {
      return NextResponse.json(payload, { status: backtestResponse.status });
    }

    const rows = Array.isArray(payload.results) ? payload.results : [];
    const summary = buildExecutiveSummary(rows, fireSaleThreshold);

    if (format === "md" || format === "markdown") {
      const report = toMarkdownReport(summary, payload.strategy, payload.config);
      return new Response(report, {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "content-disposition": "attachment; filename=bist-executive-report.md",
        },
      });
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      source: {
        endpoint: "/api/bist/backtest",
        strategy: payload.strategy,
      },
      summary,
      errors: payload.errors,
      rowCount: rows.length,
      disclaimer: "Bu rapor egitim amaclidir, yatirim tavsiyesi degildir.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown export error";
    console.error("/api/bist/backtest/export-report error", { message });
    return NextResponse.json({ error: "Export report generation failed" }, { status: 500 });
  }
}
