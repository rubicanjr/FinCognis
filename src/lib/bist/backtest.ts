import { computeMaxDrawdownPercent, computeRiskLayer, type LiquidityThresholds } from "@/lib/bist/risk";

export type BacktestSignal = "LONG" | "HOLD" | "EXIT";
export type BacktestStrategy = "sma_momentum" | "rsi_reversion" | "buy_hold";

export interface RiskThresholds {
  maxRiskScore?: number;
  blockHighVolatilityRegime?: boolean;
  maxDrawdownGatePercent?: number;
  warmupBars?: number;
}

export interface BacktestCostConfig {
  commissionBps?: number;
  slippageBps?: number;
  taxBps?: number;
  tailRiskHedgePercent?: number;
}

export type RejectionTimelineCategory =
  | "LIQUIDITY_CASCADE"
  | "MARGIN_DYNAMICS"
  | "ADVERSARIAL_RISK"
  | "REGIME_SHIFT";

export type AdversarialRiskLabel = "NONE" | "INSTITUTIONAL_INERTIA" | "AGENCY_PROBLEM";

export interface RejectionTimelineEvent {
  index: number;
  timestamp: number;
  reason:
    | RiskGateDecision["reason"]
    | "REGIME_SHIFT_HIGH"
    | "REGIME_SHIFT_NORMAL"
    | "REGIME_SHIFT_LOW"
    | "EXIT_RESPONSE";
  category: RejectionTimelineCategory;
  label: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  stressScore: number;
  liquidityCascade: boolean;
  marginDynamics: boolean;
  adversarialRisk: AdversarialRiskLabel;
  decisionSource: "RISK_GATE" | "DEBATE_PROXY" | "REGIME_MONITOR";
  responseBars?: number | null;
}

export interface DoctrineBreakdown {
  liquidityCascade: number;
  marginDynamics: number;
  adversarialRisk: number;
  institutionalInertia: number;
  agencyProblem: number;
}

export interface RegimeShiftAnalysis {
  highRiskShiftCount: number;
  respondedShiftCount: number;
  avgResponseBars: number | null;
  maxResponseBars: number | null;
}

export interface BlackSwanHedgeReport {
  tailRiskHedgePercent: number;
  hedgeCostAmount: number;
  hedgeCostPercent: number;
  hedgePayoffAmount: number;
  hedgePayoffPercent: number;
  netCostAmount: number;
  netCostPercent: number;
}

export interface TrackingErrorDecomposition {
  skillComponentPercent: number;
  noiseComponentPercent: number;
}

export interface RiskGateDecision {
  index: number;
  timestamp: number;
  signal: BacktestSignal;
  accepted: boolean;
  reason:
    | "ACCEPTED"
    | "WARMUP"
    | "INVALID_PRICE"
    | "NO_SIGNAL"
    | "ALREADY_IN_POSITION"
    | "LIQUIDITY_REJECTED"
    | "RISK_SCORE_REJECTED"
    | "VOLATILITY_REGIME_REJECTED"
    | "DRAWDOWN_REJECTED";
  liquidityPass: boolean;
  riskScore: number | null;
  volatilityRegime: "LOW" | "NORMAL" | "HIGH" | null;
  maxDrawdownPercent?: number | null;
  avgVolume20?: number | null;
  avgNotional20?: number | null;
}

export interface BacktestTrade {
  entryTimestamp: number;
  exitTimestamp: number;
  entryPrice: number;
  exitPrice: number;
  barsHeld: number;
  returnPercent: number;
}

export interface BacktestSurvival {
  liquidityRejectedEntries: number;
  riskRejectedEntries: number;
  tailRiskDays: number;
  worstDayPercent: number;
  survivalScore: number;
  survivalProbabilityPercent: number;
}

export interface RejectionBreakdown {
  liquidity: number;
  riskScore: number;
  volatilityRegime: number;
  drawdown: number;
  invalidPrice: number;
  total: number;
}

export interface RiskAwareBacktestInput {
  ticker: string;
  timestamps: number[];
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: (number | null)[];
  signals: BacktestSignal[];
  initialCapital?: number;
  liquidityThresholds?: LiquidityThresholds;
  riskThresholds?: RiskThresholds;
  costConfig?: BacktestCostConfig;
}

export interface RiskAwareBacktestResult {
  ticker: string;
  initialCapital: number;
  finalEquity: number;
  totalReturnPercent: number;
  buyHoldReturnPercent: number;
  maxDrawdownPercent: number;
  tradeCount: number;
  executedEntryCount: number;
  rejectedEntryCount: number;
  winRatePercent: number | null;
  profitFactor: number | null;
  sharpeRatio: number | null;
  informationRatio: number | null;
  annualizedActiveReturnPercent: number;
  trackingErrorPercent: number;
  trackingErrorDecomposition: TrackingErrorDecomposition;
  equityCurve: number[];
  dailyReturns: number[];
  trades: BacktestTrade[];
  riskGateLog: RiskGateDecision[];
  rejectionBreakdown: RejectionBreakdown;
  doctrineBreakdown: DoctrineBreakdown;
  rejectionTimeline: RejectionTimelineEvent[];
  regimeShiftAnalysis: RegimeShiftAnalysis;
  blackSwan: BlackSwanHedgeReport;
  survival: BacktestSurvival;
  isCertified: boolean;
  killSwitchTriggered: boolean;
  disclaimer: string;
}

const DEFAULT_INITIAL_CAPITAL = 100_000;
const DEFAULT_RISK: Required<RiskThresholds> = {
  maxRiskScore: 70,
  blockHighVolatilityRegime: true,
  maxDrawdownGatePercent: 25,
  warmupBars: 30,
};
const DEFAULT_COSTS: Required<BacktestCostConfig> = {
  commissionBps: 10,
  slippageBps: 8,
  taxBps: 10,
  tailRiskHedgePercent: 1.5,
};
const DISCLAIMER =
  "Bu backtest egitim amaclidir. Gercek islemlerde likidite, kayma ve tail-risk daha sert olabilir. Yatirim tavsiyesi degildir.";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = mean(values);
  if (avg == null) return null;
  const variance = values.reduce((a, v) => a + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(Math.max(variance, 0));
}

function computeSharpeRatio(dailyReturns: number[]): number | null {
  if (dailyReturns.length < 10) return null;
  const avg = mean(dailyReturns);
  const sigma = std(dailyReturns);
  if (avg == null || sigma == null || sigma <= 0) return null;
  return round2((avg / sigma) * Math.sqrt(252));
}

function computeTrackingErrorPercent(strategyDailyReturns: number[], benchmarkDailyReturns: number[]): number {
  const n = Math.min(strategyDailyReturns.length, benchmarkDailyReturns.length);
  if (n < 2) return 0;
  const diff: number[] = [];
  for (let i = 0; i < n; i++) {
    diff.push(strategyDailyReturns[i] - benchmarkDailyReturns[i]);
  }
  const sigma = std(diff);
  if (sigma == null || !Number.isFinite(sigma)) return 0;
  return round2(sigma * Math.sqrt(252) * 100);
}

function computeAnnualizedActiveReturnPercent(
  strategyDailyReturns: number[],
  benchmarkDailyReturns: number[]
): number {
  const n = Math.min(strategyDailyReturns.length, benchmarkDailyReturns.length);
  if (n < 2) return 0;
  const diff: number[] = [];
  for (let i = 0; i < n; i++) {
    diff.push(strategyDailyReturns[i] - benchmarkDailyReturns[i]);
  }
  const avg = mean(diff);
  if (avg == null || !Number.isFinite(avg)) return 0;
  return round2(avg * 252 * 100);
}

function computeInformationRatio(strategyDailyReturns: number[], benchmarkDailyReturns: number[]): number | null {
  const n = Math.min(strategyDailyReturns.length, benchmarkDailyReturns.length);
  if (n < 2) return null;
  const diff: number[] = [];
  for (let i = 0; i < n; i++) {
    diff.push(strategyDailyReturns[i] - benchmarkDailyReturns[i]);
  }
  const avg = mean(diff);
  const sigma = std(diff);
  if (avg == null || sigma == null || sigma <= 0) return null;
  return round2((avg / sigma) * Math.sqrt(252));
}

function severityFromStress(stressScore: number): RejectionTimelineEvent["severity"] {
  if (stressScore >= 90) return "CRITICAL";
  if (stressScore >= 70) return "HIGH";
  if (stressScore >= 45) return "MEDIUM";
  return "LOW";
}

function buildTimelineFromDecision(decision: RiskGateDecision): RejectionTimelineEvent | null {
  if (decision.accepted) return null;

  if (decision.reason === "LIQUIDITY_REJECTED") {
    const volumeRatio =
      typeof decision.avgVolume20 === "number" && decision.avgVolume20 > 0
        ? clamp(1 - decision.avgVolume20 / 100_000, 0, 1)
        : 0.8;
    const notionalRatio =
      typeof decision.avgNotional20 === "number" && decision.avgNotional20 > 0
        ? clamp(1 - decision.avgNotional20 / 5_000_000, 0, 1)
        : 0.8;
    const stressScore = round2(clamp((volumeRatio * 0.5 + notionalRatio * 0.5) * 100, 0, 100));
    return {
      index: decision.index,
      timestamp: decision.timestamp,
      reason: decision.reason,
      category: "LIQUIDITY_CASCADE",
      label: "Likidite Caglayani",
      severity: severityFromStress(stressScore),
      stressScore,
      liquidityCascade: true,
      marginDynamics: false,
      adversarialRisk: "NONE",
      decisionSource: "RISK_GATE",
    };
  }

  if (decision.reason === "VOLATILITY_REGIME_REJECTED" || decision.reason === "DRAWDOWN_REJECTED") {
    const regimeStress = decision.reason === "VOLATILITY_REGIME_REJECTED" ? 75 : 65;
    const drawdownStress = typeof decision.maxDrawdownPercent === "number" ? clamp(decision.maxDrawdownPercent, 0, 100) : 50;
    const stressScore = round2(clamp((regimeStress + drawdownStress) / 2, 0, 100));
    return {
      index: decision.index,
      timestamp: decision.timestamp,
      reason: decision.reason,
      category: "MARGIN_DYNAMICS",
      label: "Marjin Dinamikleri",
      severity: severityFromStress(stressScore),
      stressScore,
      liquidityCascade: false,
      marginDynamics: true,
      adversarialRisk: decision.reason === "VOLATILITY_REGIME_REJECTED" ? "INSTITUTIONAL_INERTIA" : "AGENCY_PROBLEM",
      decisionSource: "DEBATE_PROXY",
    };
  }

  if (decision.reason === "RISK_SCORE_REJECTED") {
    const stressScore = round2(clamp(decision.riskScore ?? 60, 0, 100));
    return {
      index: decision.index,
      timestamp: decision.timestamp,
      reason: decision.reason,
      category: "ADVERSARIAL_RISK",
      label: "Adversarial Risk",
      severity: severityFromStress(stressScore),
      stressScore,
      liquidityCascade: false,
      marginDynamics: false,
      adversarialRisk: "AGENCY_PROBLEM",
      decisionSource: "DEBATE_PROXY",
    };
  }

  if (decision.reason === "INVALID_PRICE") {
    const stressScore = 55;
    return {
      index: decision.index,
      timestamp: decision.timestamp,
      reason: decision.reason,
      category: "ADVERSARIAL_RISK",
      label: "Adversarial Risk",
      severity: severityFromStress(stressScore),
      stressScore,
      liquidityCascade: false,
      marginDynamics: false,
      adversarialRisk: "INSTITUTIONAL_INERTIA",
      decisionSource: "RISK_GATE",
    };
  }

  return null;
}

function buildRejectedDecision(
  index: number,
  timestamp: number,
  signal: BacktestSignal,
  reason: RiskGateDecision["reason"],
  riskScore: number | null,
  volatilityRegime: RiskGateDecision["volatilityRegime"],
  liquidityPass: boolean,
  extra?: Pick<RiskGateDecision, "maxDrawdownPercent" | "avgVolume20" | "avgNotional20">
): RiskGateDecision {
  return {
    index,
    timestamp,
    signal,
    accepted: false,
    reason,
    riskScore,
    volatilityRegime,
    liquidityPass,
    maxDrawdownPercent: extra?.maxDrawdownPercent ?? null,
    avgVolume20: extra?.avgVolume20 ?? null,
    avgNotional20: extra?.avgNotional20 ?? null,
  };
}

export function runRiskAwareBacktest(input: RiskAwareBacktestInput): RiskAwareBacktestResult {
  const initialCapital = input.initialCapital ?? DEFAULT_INITIAL_CAPITAL;
  const riskCfg = { ...DEFAULT_RISK, ...(input.riskThresholds ?? {}) };
  const costCfg = { ...DEFAULT_COSTS, ...(input.costConfig ?? {}) };
  const tradeCostRate = (costCfg.commissionBps + costCfg.slippageBps + costCfg.taxBps) / 10_000;

  const len = Math.min(
    input.timestamps.length,
    input.closes.length,
    input.highs.length,
    input.lows.length,
    input.volumes.length,
    input.signals.length
  );

  if (len < 2) {
    return {
      ticker: input.ticker,
      initialCapital,
      finalEquity: initialCapital,
      totalReturnPercent: 0,
      buyHoldReturnPercent: 0,
      maxDrawdownPercent: 0,
      tradeCount: 0,
      executedEntryCount: 0,
      rejectedEntryCount: 0,
      winRatePercent: null,
      profitFactor: null,
      sharpeRatio: null,
      informationRatio: null,
      annualizedActiveReturnPercent: 0,
      trackingErrorPercent: 0,
      trackingErrorDecomposition: {
        skillComponentPercent: 0,
        noiseComponentPercent: 0,
      },
      equityCurve: [initialCapital],
      dailyReturns: [],
      trades: [],
      riskGateLog: [],
      rejectionBreakdown: {
        liquidity: 0,
        riskScore: 0,
        volatilityRegime: 0,
        drawdown: 0,
        invalidPrice: 0,
        total: 0,
      },
      doctrineBreakdown: {
        liquidityCascade: 0,
        marginDynamics: 0,
        adversarialRisk: 0,
        institutionalInertia: 0,
        agencyProblem: 0,
      },
      rejectionTimeline: [],
      regimeShiftAnalysis: {
        highRiskShiftCount: 0,
        respondedShiftCount: 0,
        avgResponseBars: null,
        maxResponseBars: null,
      },
      blackSwan: {
        tailRiskHedgePercent: round2(costCfg.tailRiskHedgePercent),
        hedgeCostAmount: 0,
        hedgeCostPercent: 0,
        hedgePayoffAmount: 0,
        hedgePayoffPercent: 0,
        netCostAmount: 0,
        netCostPercent: 0,
      },
      survival: {
        liquidityRejectedEntries: 0,
        riskRejectedEntries: 0,
        tailRiskDays: 0,
        worstDayPercent: 0,
        survivalScore: 100,
        survivalProbabilityPercent: 100,
      },
      isCertified: true,
      killSwitchTriggered: false,
      disclaimer: DISCLAIMER,
    };
  }

  const timestamps = input.timestamps.slice(0, len);
  const closes = input.closes.slice(0, len);
  const highs = input.highs.slice(0, len);
  const lows = input.lows.slice(0, len);
  const volumes = input.volumes.slice(0, len);
  const signals = input.signals.slice(0, len);

  let equity = initialCapital;
  let inPosition = false;
  let entryPrice = 0;
  let entryTimestamp = 0;
  let entryIndex = 0;

  let executedEntryCount = 0;
  let rejectedEntryCount = 0;
  let liquidityRejectedEntries = 0;
  let riskRejectedEntries = 0;
  let riskScoreRejectedEntries = 0;
  let volatilityRegimeRejectedEntries = 0;
  let drawdownRejectedEntries = 0;
  let invalidPriceRejectedEntries = 0;
  let tailRiskDays = 0;
  let worstDayPercent = 0;
  let hedgeCostAmount = 0;
  let hedgePayoffAmount = 0;
  let killSwitchTriggered = false;

  const equityCurve: number[] = [equity];
  const dailyReturns: number[] = [];
  const benchmarkDailyReturns: number[] = [];
  const trades: BacktestTrade[] = [];
  const riskGateLog: RiskGateDecision[] = [];
  const rejectionTimeline: RejectionTimelineEvent[] = [];
  const highRegimeShiftEvents: RejectionTimelineEvent[] = [];
  let previousRegime: "LOW" | "NORMAL" | "HIGH" | null = null;

  const tailRiskHedgePercent = clamp(costCfg.tailRiskHedgePercent, 0, 5);
  const tailRiskHedgeRate = tailRiskHedgePercent / 100;

  for (let i = 1; i < len; i++) {
    const signal = signals[i - 1] ?? "HOLD";
    const ts = timestamps[i - 1];
    const dayStartEquity = equity;
    const pricePrev = closes[i - 1];
    const priceCurr = closes[i];
    const benchmarkDailyReturn =
      Number.isFinite(pricePrev) && Number.isFinite(priceCurr) && pricePrev > 0 ? priceCurr / pricePrev - 1 : 0;

    const riskSnapshotForBar =
      i >= riskCfg.warmupBars
        ? computeRiskLayer(
            highs.slice(0, i),
            lows.slice(0, i),
            closes.slice(0, i),
            volumes.slice(0, i),
            input.liquidityThresholds
          )
        : null;
    const currentRegime = riskSnapshotForBar?.risk.volatilityRegime ?? null;

    if (previousRegime && currentRegime && previousRegime !== currentRegime) {
      const reason =
        currentRegime === "HIGH"
          ? "REGIME_SHIFT_HIGH"
          : currentRegime === "LOW"
            ? "REGIME_SHIFT_LOW"
            : "REGIME_SHIFT_NORMAL";
      const stressScore = currentRegime === "HIGH" ? 88 : currentRegime === "LOW" ? 35 : 55;
      const regimeEvent: RejectionTimelineEvent = {
        index: i - 1,
        timestamp: ts,
        reason,
        category: "REGIME_SHIFT",
        label: `Regime Shift -> ${currentRegime}`,
        severity: severityFromStress(stressScore),
        stressScore,
        liquidityCascade: false,
        marginDynamics: false,
        adversarialRisk: "NONE",
        decisionSource: "REGIME_MONITOR",
        responseBars: null,
      };
      rejectionTimeline.push(regimeEvent);
      if (currentRegime === "HIGH") {
        highRegimeShiftEvents.push(regimeEvent);
      }
    }

    const regimeAwareBenchmarkReturn =
      currentRegime === "HIGH"
        ? benchmarkDailyReturn * 0.6
        : currentRegime === "LOW"
          ? benchmarkDailyReturn * 1.05
          : benchmarkDailyReturn;
    benchmarkDailyReturns.push(regimeAwareBenchmarkReturn);
    previousRegime = currentRegime;

    if (signal === "LONG") {
      if (inPosition) {
        riskGateLog.push(buildRejectedDecision(i - 1, ts, signal, "ALREADY_IN_POSITION", null, null, true));
      } else if (i < riskCfg.warmupBars) {
        riskGateLog.push(buildRejectedDecision(i - 1, ts, signal, "WARMUP", null, null, true));
      } else {
        const candidateEntryPrice = closes[i - 1];
        if (!Number.isFinite(candidateEntryPrice) || candidateEntryPrice <= 0) {
          rejectedEntryCount++;
          riskRejectedEntries++;
          invalidPriceRejectedEntries++;
          const decision = buildRejectedDecision(i - 1, ts, signal, "INVALID_PRICE", null, null, true);
          riskGateLog.push(decision);
          const timelineEvent = buildTimelineFromDecision(decision);
          if (timelineEvent) rejectionTimeline.push(timelineEvent);
        } else {
          const riskSnapshot =
            riskSnapshotForBar ??
            computeRiskLayer(highs.slice(0, i), lows.slice(0, i), closes.slice(0, i), volumes.slice(0, i), input.liquidityThresholds);

          const { liquidity, risk } = riskSnapshot;

          if (!liquidity.liquidityPass) {
            rejectedEntryCount++;
            liquidityRejectedEntries++;
            const decision = buildRejectedDecision(
              i - 1,
              ts,
              signal,
              "LIQUIDITY_REJECTED",
              risk.riskScore,
              risk.volatilityRegime,
              false,
              {
                maxDrawdownPercent: risk.maxDrawdownPercent,
                avgVolume20: liquidity.avgVolume20,
                avgNotional20: liquidity.avgNotional20,
              }
            );
            riskGateLog.push(decision);
            const timelineEvent = buildTimelineFromDecision(decision);
            if (timelineEvent) rejectionTimeline.push(timelineEvent);
          } else if (risk.riskScore > riskCfg.maxRiskScore) {
            rejectedEntryCount++;
            riskRejectedEntries++;
            riskScoreRejectedEntries++;
            const decision = buildRejectedDecision(
              i - 1,
              ts,
              signal,
              "RISK_SCORE_REJECTED",
              risk.riskScore,
              risk.volatilityRegime,
              true,
              {
                maxDrawdownPercent: risk.maxDrawdownPercent,
                avgVolume20: liquidity.avgVolume20,
                avgNotional20: liquidity.avgNotional20,
              }
            );
            riskGateLog.push(decision);
            const timelineEvent = buildTimelineFromDecision(decision);
            if (timelineEvent) rejectionTimeline.push(timelineEvent);
          } else if (riskCfg.blockHighVolatilityRegime && risk.volatilityRegime === "HIGH") {
            rejectedEntryCount++;
            riskRejectedEntries++;
            volatilityRegimeRejectedEntries++;
            const decision = buildRejectedDecision(
              i - 1,
              ts,
              signal,
              "VOLATILITY_REGIME_REJECTED",
              risk.riskScore,
              risk.volatilityRegime,
              true,
              {
                maxDrawdownPercent: risk.maxDrawdownPercent,
                avgVolume20: liquidity.avgVolume20,
                avgNotional20: liquidity.avgNotional20,
              }
            );
            riskGateLog.push(decision);
            const timelineEvent = buildTimelineFromDecision(decision);
            if (timelineEvent) rejectionTimeline.push(timelineEvent);
          } else if (risk.maxDrawdownPercent > riskCfg.maxDrawdownGatePercent) {
            rejectedEntryCount++;
            riskRejectedEntries++;
            drawdownRejectedEntries++;
            killSwitchTriggered = true;
            const decision = buildRejectedDecision(
              i - 1,
              ts,
              signal,
              "DRAWDOWN_REJECTED",
              risk.riskScore,
              risk.volatilityRegime,
              true,
              {
                maxDrawdownPercent: risk.maxDrawdownPercent,
                avgVolume20: liquidity.avgVolume20,
                avgNotional20: liquidity.avgNotional20,
              }
            );
            riskGateLog.push(decision);
            const timelineEvent = buildTimelineFromDecision(decision);
            if (timelineEvent) rejectionTimeline.push(timelineEvent);
          } else {
            inPosition = true;
            entryPrice = candidateEntryPrice;
            entryTimestamp = ts;
            entryIndex = i - 1;
            executedEntryCount++;
            equity *= 1 - tradeCostRate;
            riskGateLog.push({
              index: i - 1,
              timestamp: ts,
              signal,
              accepted: true,
              reason: "ACCEPTED",
              liquidityPass: true,
              riskScore: risk.riskScore,
              volatilityRegime: risk.volatilityRegime,
              maxDrawdownPercent: risk.maxDrawdownPercent,
              avgVolume20: liquidity.avgVolume20,
              avgNotional20: liquidity.avgNotional20,
            });
          }
        }
      }
    } else if (signal === "EXIT" && inPosition) {
      const exitPrice = closes[i - 1];
      const safeEntry = Number.isFinite(entryPrice) && entryPrice > 0 ? entryPrice : 1;
      const safeExit = Number.isFinite(exitPrice) && exitPrice > 0 ? exitPrice : safeEntry;
      const gross = safeExit / safeEntry;
      const netTrade = gross * (1 - tradeCostRate) * (1 - tradeCostRate);
      trades.push({
        entryTimestamp,
        exitTimestamp: ts,
        entryPrice: safeEntry,
        exitPrice: safeExit,
        barsHeld: Math.max(1, i - 1 - entryIndex),
        returnPercent: round2((netTrade - 1) * 100),
      });
      equity *= 1 - tradeCostRate;
      inPosition = false;
      entryPrice = 0;
      entryTimestamp = 0;
      entryIndex = 0;

      const exitStress = currentRegime === "HIGH" ? 78 : 52;
      rejectionTimeline.push({
        index: i - 1,
        timestamp: ts,
        reason: "EXIT_RESPONSE",
        category: "REGIME_SHIFT",
        label: "Regime Shift Response Exit",
        severity: severityFromStress(exitStress),
        stressScore: exitStress,
        liquidityCascade: false,
        marginDynamics: false,
        adversarialRisk: "NONE",
        decisionSource: "REGIME_MONITOR",
      });
    }

    const strategyMarketReturn = inPosition ? benchmarkDailyReturn : 0;
    equity *= 1 + strategyMarketReturn;

    if (tailRiskHedgeRate > 0 && dayStartEquity > 0) {
      const dailyPremium = dayStartEquity * tailRiskHedgeRate / 252;
      hedgeCostAmount += dailyPremium;
      equity -= dailyPremium;

      if (benchmarkDailyReturn <= -0.04) {
        const shock = Math.abs(benchmarkDailyReturn);
        const convexityMultiplier = 0.12 + Math.max(0, shock - 0.04) * 8;
        const hedgeNotional = dayStartEquity * tailRiskHedgeRate;
        const grossPayoff = hedgeNotional * convexityMultiplier;
        const cappedPayoff = Math.min(grossPayoff, dayStartEquity * 0.25);
        hedgePayoffAmount += cappedPayoff;
        equity += cappedPayoff;
      }
    }

    if (benchmarkDailyReturn < -0.08) tailRiskDays++;
    worstDayPercent = Math.min(worstDayPercent, benchmarkDailyReturn * 100);

    equity = Math.max(0, equity);
    const netDailyReturn = dayStartEquity > 0 ? equity / dayStartEquity - 1 : 0;
    dailyReturns.push(Number.isFinite(netDailyReturn) ? netDailyReturn : 0);
    equityCurve.push(equity);
  }

  if (inPosition) {
    const exitPrice = closes[len - 1];
    const safeEntry = Number.isFinite(entryPrice) && entryPrice > 0 ? entryPrice : 1;
    const safeExit = Number.isFinite(exitPrice) && exitPrice > 0 ? exitPrice : safeEntry;
    const gross = safeExit / safeEntry;
    const netTrade = gross * (1 - tradeCostRate) * (1 - tradeCostRate);
    trades.push({
      entryTimestamp,
      exitTimestamp: timestamps[len - 1],
      entryPrice: safeEntry,
      exitPrice: safeExit,
      barsHeld: Math.max(1, len - 1 - entryIndex),
      returnPercent: round2((netTrade - 1) * 100),
    });
    equity *= 1 - tradeCostRate;
    rejectionTimeline.push({
      index: len - 1,
      timestamp: timestamps[len - 1],
      reason: "EXIT_RESPONSE",
      category: "REGIME_SHIFT",
      label: "Forced End-of-Range Exit",
      severity: "MEDIUM",
      stressScore: 50,
      liquidityCascade: false,
      marginDynamics: false,
      adversarialRisk: "NONE",
      decisionSource: "REGIME_MONITOR",
    });
    if (equityCurve.length > 0) {
      equityCurve[equityCurve.length - 1] = equity;
    }
    if (dailyReturns.length > 0 && equityCurve.length >= 2) {
      const prevEq = equityCurve[equityCurve.length - 2];
      dailyReturns[dailyReturns.length - 1] = prevEq > 0 ? equity / prevEq - 1 : 0;
    }
  }

  const totalReturnPercent = round2(((equity / initialCapital) - 1) * 100);
  const buyHoldReturnPercent = closes[0] > 0 ? round2(((closes[len - 1] / closes[0]) - 1) * 100) : 0;
  const trackingErrorPercent = computeTrackingErrorPercent(dailyReturns, benchmarkDailyReturns);
  const informationRatio = computeInformationRatio(dailyReturns, benchmarkDailyReturns);
  const annualizedActiveReturnPercent = computeAnnualizedActiveReturnPercent(dailyReturns, benchmarkDailyReturns);
  const skillWeight = clamp(Math.abs(informationRatio ?? 0) / 2, 0, 1);
  const skillComponentPercent = round2(trackingErrorPercent * skillWeight);
  const trackingErrorDecomposition: TrackingErrorDecomposition = {
    skillComponentPercent,
    noiseComponentPercent: round2(Math.max(0, trackingErrorPercent - skillComponentPercent)),
  };
  const maxDrawdownPercent = computeMaxDrawdownPercent(equityCurve);

  const winners = trades.filter((t) => t.returnPercent > 0);
  const losers = trades.filter((t) => t.returnPercent < 0);
  const winRatePercent = trades.length ? round2((winners.length / trades.length) * 100) : null;

  const grossProfit = winners.reduce((s, t) => s + t.returnPercent, 0);
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.returnPercent, 0));
  const profitFactor = grossLoss > 0 ? round2(grossProfit / grossLoss) : null;

  const sharpeRatio = computeSharpeRatio(dailyReturns);

  const survivalScore = clamp(
    round2(
      100 -
        maxDrawdownPercent * 0.9 -
        Math.abs(Math.min(0, worstDayPercent)) * 1.2 -
        tailRiskDays * 2 +
        liquidityRejectedEntries * 0.6
    ),
    0,
    100
  );
  const survivalProbabilityPercent = clamp(round2(survivalScore), 0, 100);

  const rejectionBreakdown: RejectionBreakdown = {
    liquidity: liquidityRejectedEntries,
    riskScore: riskScoreRejectedEntries,
    volatilityRegime: volatilityRegimeRejectedEntries,
    drawdown: drawdownRejectedEntries,
    invalidPrice: invalidPriceRejectedEntries,
    total:
      liquidityRejectedEntries +
      riskScoreRejectedEntries +
      volatilityRegimeRejectedEntries +
      drawdownRejectedEntries +
      invalidPriceRejectedEntries,
  };

  const doctrineBreakdown: DoctrineBreakdown = {
    liquidityCascade: 0,
    marginDynamics: 0,
    adversarialRisk: 0,
    institutionalInertia: 0,
    agencyProblem: 0,
  };

  const adversarialKeys = new Set<string>();
  const institutionalKeys = new Set<string>();
  const agencyKeys = new Set<string>();

  for (const event of rejectionTimeline) {
    if (event.category === "LIQUIDITY_CASCADE") doctrineBreakdown.liquidityCascade += 1;
    if (event.category === "MARGIN_DYNAMICS") doctrineBreakdown.marginDynamics += 1;

    const isAdversarial = event.category === "ADVERSARIAL_RISK" || event.adversarialRisk !== "NONE";
    if (isAdversarial) {
      const key = `${event.index}:${event.reason}:${event.adversarialRisk}`;
      if (!adversarialKeys.has(key)) {
        adversarialKeys.add(key);
        doctrineBreakdown.adversarialRisk += 1;
      }
    }

    if (event.adversarialRisk === "INSTITUTIONAL_INERTIA") {
      const key = `${event.index}:${event.reason}`;
      if (!institutionalKeys.has(key)) {
        institutionalKeys.add(key);
        doctrineBreakdown.institutionalInertia += 1;
      }
    }

    if (event.adversarialRisk === "AGENCY_PROBLEM") {
      const key = `${event.index}:${event.reason}`;
      if (!agencyKeys.has(key)) {
        agencyKeys.add(key);
        doctrineBreakdown.agencyProblem += 1;
      }
    }
  }

  const responseBarsList: number[] = [];
  for (const shiftEvent of highRegimeShiftEvents) {
    const response = rejectionTimeline.find(
      (event) =>
        event.index > shiftEvent.index &&
        (event.reason === "EXIT_RESPONSE" ||
          event.category === "LIQUIDITY_CASCADE" ||
          event.category === "MARGIN_DYNAMICS" ||
          event.category === "ADVERSARIAL_RISK")
    );

    if (response) {
      const bars = Math.max(0, response.index - shiftEvent.index);
      shiftEvent.responseBars = bars;
      responseBarsList.push(bars);
    } else {
      shiftEvent.responseBars = null;
    }
  }

  const regimeShiftAnalysis: RegimeShiftAnalysis = {
    highRiskShiftCount: highRegimeShiftEvents.length,
    respondedShiftCount: responseBarsList.length,
    avgResponseBars: responseBarsList.length
      ? round2(responseBarsList.reduce((s, v) => s + v, 0) / responseBarsList.length)
      : null,
    maxResponseBars: responseBarsList.length ? Math.max(...responseBarsList) : null,
  };

  const netCostAmount = hedgeCostAmount - hedgePayoffAmount;
  const blackSwan: BlackSwanHedgeReport = {
    tailRiskHedgePercent: round2(tailRiskHedgePercent),
    hedgeCostAmount: round2(hedgeCostAmount),
    hedgeCostPercent: round2((hedgeCostAmount / initialCapital) * 100),
    hedgePayoffAmount: round2(hedgePayoffAmount),
    hedgePayoffPercent: round2((hedgePayoffAmount / initialCapital) * 100),
    netCostAmount: round2(netCostAmount),
    netCostPercent: round2((netCostAmount / initialCapital) * 100),
  };

  return {
    ticker: input.ticker,
    initialCapital,
    finalEquity: round2(equity),
    totalReturnPercent,
    buyHoldReturnPercent,
    maxDrawdownPercent,
    tradeCount: trades.length,
    executedEntryCount,
    rejectedEntryCount,
    winRatePercent,
    profitFactor,
    sharpeRatio,
    informationRatio,
    annualizedActiveReturnPercent,
    trackingErrorPercent,
    trackingErrorDecomposition,
    equityCurve: equityCurve.map((v) => round2(v)),
    dailyReturns,
    trades,
    riskGateLog,
    rejectionBreakdown,
    doctrineBreakdown,
    rejectionTimeline,
    regimeShiftAnalysis,
    blackSwan,
    survival: {
      liquidityRejectedEntries,
      riskRejectedEntries,
      tailRiskDays,
      worstDayPercent,
      survivalScore,
      survivalProbabilityPercent,
    },
    isCertified: !killSwitchTriggered,
    killSwitchTriggered,
    disclaimer: DISCLAIMER,
  };
}

function computeSMAAt(closes: number[], endIndex: number, period: number): number | null {
  if (endIndex + 1 < period) return null;
  const start = endIndex + 1 - period;
  let sum = 0;
  for (let i = start; i <= endIndex; i++) sum += closes[i];
  return sum / period;
}

function computeRSIAt(closes: number[], endIndex: number, period = 14): number | null {
  if (endIndex < period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d;
    else losses += -d;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period || 0.0001;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function generateStrategySignals(closes: number[], strategy: BacktestStrategy): BacktestSignal[] {
  const signals: BacktestSignal[] = Array.from({ length: closes.length }, () => "HOLD");
  let inPosition = false;

  if (!closes.length) return signals;

  if (strategy === "buy_hold") {
    signals[0] = "LONG";
    return signals;
  }

  for (let i = 0; i < closes.length; i++) {
    if (strategy === "sma_momentum") {
      const sma20 = computeSMAAt(closes, i, 20);
      const sma50 = computeSMAAt(closes, i, 50);
      if (!sma20 || !sma50) continue;

      if (!inPosition && closes[i] > sma20 && sma20 > sma50) {
        signals[i] = "LONG";
        inPosition = true;
      } else if (inPosition && closes[i] < sma20) {
        signals[i] = "EXIT";
        inPosition = false;
      }
    } else if (strategy === "rsi_reversion") {
      const rsi = computeRSIAt(closes, i, 14);
      if (rsi == null) continue;

      if (!inPosition && rsi < 35) {
        signals[i] = "LONG";
        inPosition = true;
      } else if (inPosition && rsi > 55) {
        signals[i] = "EXIT";
        inPosition = false;
      }
    }
  }

  return signals;
}
