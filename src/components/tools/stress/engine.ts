import {
  CLASS_BASE_CORRELATION,
  CRISIS_LIBRARY,
  FACTOR_NAMES,
  SCENARIO_SET,
  STRESS_ASSETS,
} from "@/components/tools/stress/data";
import {
  cholesky,
  clamp,
  correlation,
  createSeededRng,
  mean,
  pcaFirstComponentShare,
  quantile,
  shuffleInBlocks,
  stdDev,
  studentT,
  variance,
} from "@/components/tools/stress/math";
import type {
  CrisisReplayResult,
  PortfolioInput,
  RegulationResult,
  StressAnalysisResult,
  StressAsset,
} from "@/components/tools/stress/types";

interface GeneratedHistory {
  dates: string[];
  factorReturns: Record<"fx" | "rate" | "commodity" | "inflation" | "market", number[]>;
  assetReturns: Record<string, number[]>;
}

const TRADING_DAYS = 26 * 252;
const START_DATE = "2000-01-03";
const MONTE_CARLO_SIMULATIONS = 1800;
const MONTE_CARLO_HORIZON_DAYS = 90;
let cachedHistory: GeneratedHistory | null = null;

function parseDate(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00.000Z`).getTime();
}

function generateDates(startDateIso: string, count: number): string[] {
  const dates: string[] = [];
  const date = new Date(`${startDateIso}T00:00:00.000Z`);

  while (dates.length < count) {
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(date.toISOString().slice(0, 10));
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

function regimeFromDate(dateIso: string) {
  const time = parseDate(dateIso);
  const inRange = (start: string, end: string) => time >= parseDate(start) && time <= parseDate(end);

  if (inRange("2000-03-01", "2002-10-09")) return { vol: 1.9, drift: -0.00025, jump: 0.018 };
  if (inRange("2008-09-01", "2009-03-31")) return { vol: 2.5, drift: -0.0007, jump: 0.038 };
  if (inRange("2018-05-01", "2018-09-30")) return { vol: 2.1, drift: -0.00045, jump: 0.026 };
  if (inRange("2020-02-20", "2020-04-30")) return { vol: 2.8, drift: -0.00085, jump: 0.045 };
  if (inRange("2022-05-01", "2022-12-31")) return { vol: 2.2, drift: -0.0005, jump: 0.032 };
  if (inRange("2024-01-01", "2035-01-01")) return { vol: 1.05, drift: 0.0002, jump: 0.008 };
  return { vol: 1, drift: 0.00012, jump: 0.006 };
}

function generateHistory(): GeneratedHistory {
  const rng = createSeededRng(77_312_024);
  const dates = generateDates(START_DATE, TRADING_DAYS);
  const factorReturns: GeneratedHistory["factorReturns"] = {
    fx: [],
    rate: [],
    commodity: [],
    inflation: [],
    market: [],
  };
  const assetReturns: Record<string, number[]> = {};
  const factorVol = {
    fx: 0.00008,
    rate: 0.00006,
    commodity: 0.00009,
    inflation: 0.00007,
    market: 0.0001,
  };
  const assetVolState: Record<string, number> = {};

  STRESS_ASSETS.forEach((asset) => {
    assetReturns[asset.id] = [];
    assetVolState[asset.id] = asset.dailyVol ** 2;
  });

  dates.forEach((dateIso) => {
    const regime = regimeFromDate(dateIso);
    const marketNoise = studentT(rng, 7) * Math.sqrt(factorVol.market) * regime.vol;
    factorVol.market = 0.000003 + 0.1 * marketNoise ** 2 + 0.89 * factorVol.market;
    const marketRet = marketNoise + regime.drift;
    factorReturns.market.push(marketRet);

    const fxNoise = 0.35 * marketNoise + studentT(rng, 7) * Math.sqrt(factorVol.fx) * regime.vol;
    const rateNoise = -0.3 * marketNoise + studentT(rng, 7) * Math.sqrt(factorVol.rate) * regime.vol;
    const commodityNoise = 0.25 * marketNoise + studentT(rng, 7) * Math.sqrt(factorVol.commodity) * regime.vol;
    const inflationNoise = 0.2 * marketNoise + studentT(rng, 7) * Math.sqrt(factorVol.inflation) * regime.vol;

    factorVol.fx = 0.000002 + 0.09 * fxNoise ** 2 + 0.9 * factorVol.fx;
    factorVol.rate = 0.000002 + 0.09 * rateNoise ** 2 + 0.9 * factorVol.rate;
    factorVol.commodity = 0.000002 + 0.09 * commodityNoise ** 2 + 0.9 * factorVol.commodity;
    factorVol.inflation = 0.000002 + 0.09 * inflationNoise ** 2 + 0.9 * factorVol.inflation;

    factorReturns.fx.push(fxNoise);
    factorReturns.rate.push(rateNoise);
    factorReturns.commodity.push(commodityNoise);
    factorReturns.inflation.push(inflationNoise);

    STRESS_ASSETS.forEach((asset) => {
      const idio = studentT(rng, 6) * Math.sqrt(assetVolState[asset.id]) * regime.vol;
      assetVolState[asset.id] = 0.000003 + 0.1 * idio ** 2 + 0.88 * assetVolState[asset.id];

      const jump =
        rng() < regime.jump * asset.tailScale
          ? (rng() < 0.64 ? -1 : 1) * (0.012 + rng() * 0.08) * asset.tailScale
          : 0;
      const gap =
        rng() < regime.jump * 0.9
          ? (rng() < 0.62 ? -1 : 1) * (0.01 + rng() * 0.05)
          : 0;

      const returnValue = clamp(
        0.00005 +
          asset.betaMarket * marketRet +
          asset.factorLoadings.fx * fxNoise +
          asset.factorLoadings.rate * rateNoise +
          asset.factorLoadings.commodity * commodityNoise +
          asset.factorLoadings.inflation * inflationNoise +
          idio +
          jump +
          gap,
        -0.6,
        0.45
      );

      assetReturns[asset.id].push(returnValue);
    });
  });

  return { dates, factorReturns, assetReturns };
}

function getHistory(): GeneratedHistory {
  if (!cachedHistory) {
    cachedHistory = generateHistory();
  }
  return cachedHistory;
}

function normalizeWeights(weights: Record<string, number>) {
  const filtered = Object.entries(weights)
    .filter((entry) => entry[1] > 0)
    .map(([assetId, value]) => ({ assetId, value }));
  const sum = filtered.reduce((acc, item) => acc + item.value, 0);
  if (sum <= 0) {
    return [{ assetId: "bist100", value: 1 }];
  }
  return filtered.map((item) => ({ assetId: item.assetId, value: item.value / sum }));
}

function portfolioSeries(assetReturns: Record<string, number[]>, normalized: { assetId: string; value: number }[]) {
  const size = normalized
    .map((item) => assetReturns[item.assetId]?.length ?? 0)
    .reduce((min, length) => Math.min(min, length), Number.POSITIVE_INFINITY);
  const safeSize = Number.isFinite(size) ? size : 0;
  const result: number[] = [];

  for (let i = 0; i < safeSize; i += 1) {
    const value = normalized.reduce((acc, item) => {
      const series = assetReturns[item.assetId] ?? [];
      return acc + item.value * (series[i] ?? 0);
    }, 0);
    result.push(value);
  }
  return result;
}

function computeDrawdown(returns: number[]) {
  let value = 1;
  let peak = 1;
  let max = 0;
  returns.forEach((ret) => {
    value *= 1 + ret;
    peak = Math.max(peak, value);
    max = Math.max(max, (peak - value) / peak);
  });
  return max;
}

function computeRecoveryMonths(returns: number[], drawdownStartValue: number) {
  let value = drawdownStartValue;
  const target = 1;
  for (let month = 1; month <= 120; month += 1) {
    const monthSlice = returns.slice((month - 1) * 21, month * 21);
    if (monthSlice.length === 0) break;
    value *= monthSlice.reduce((acc, ret) => acc * (1 + ret), 1);
    if (value >= target) {
      return month;
    }
  }
  return 120;
}

function crisisReplayResults(input: PortfolioInput, history: GeneratedHistory, normalizedWeights: { assetId: string; value: number }[]): CrisisReplayResult[] {
  const portSeries = portfolioSeries(history.assetReturns, normalizedWeights);

  return CRISIS_LIBRARY.map((scenario) => {
    const startIndex = history.dates.findIndex((date) => date >= scenario.startDate);
    const endIndex = history.dates.findIndex((date) => date > scenario.endDate);
    const sliceStart = startIndex >= 0 ? startIndex : 0;
    const sliceEnd = endIndex > sliceStart ? endIndex : Math.min(sliceStart + 126, history.dates.length);
    const slice = portSeries.slice(sliceStart, sliceEnd);

    const classShockImpact = normalizedWeights.reduce((acc, weight) => {
      const asset = STRESS_ASSETS.find((item) => item.id === weight.assetId);
      if (!asset) return acc;
      const shock = scenario.assetClassShock[asset.assetClass] ?? 0;
      return acc + weight.value * shock;
    }, 0);

    const dataImpact = slice.reduce((acc, value) => acc * (1 + value), 1) - 1;
    const cumulativeReturn = 0.6 * classShockImpact + 0.4 * dataImpact;
    const maxDrawdown = computeDrawdown(slice.length > 0 ? slice : [cumulativeReturn]);
    const postSlice = portSeries.slice(sliceEnd, sliceEnd + 21 * 60);
    const recoveryMonths = computeRecoveryMonths(postSlice, 1 + Math.min(cumulativeReturn, -0.01));

    return {
      scenarioId: scenario.id,
      title: scenario.title,
      cumulativeReturn,
      maxDrawdown,
      recoveryMonths,
      benchmarkComparison: {
        bist100: cumulativeReturn - scenario.benchmarkReturns.bist100,
        gold: cumulativeReturn - scenario.benchmarkReturns.gold,
        sp500: cumulativeReturn - scenario.benchmarkReturns.sp500,
      },
    };
  });
}

function dccGarchEstimate(portSeries: number[], marketSeries: number[]) {
  const size = Math.min(portSeries.length, marketSeries.length);
  const left = portSeries.slice(-Math.min(size, 756));
  const right = marketSeries.slice(-Math.min(size, 756));
  let h = Math.max(variance(left.slice(0, 30)), 1e-7);
  const omega = 0.000001;
  const alpha = 0.08;
  const beta = 0.9;
  let q = correlation(left, right);
  let ceilingHits = 0;

  for (let index = 1; index < left.length; index += 1) {
    h = omega + alpha * left[index - 1] ** 2 + beta * h;
    const zP = left[index] / Math.sqrt(Math.max(h, 1e-9));
    const zM = right[index] / Math.sqrt(Math.max(variance(right.slice(Math.max(0, index - 30), index + 1)), 1e-9));
    q = 0.04 * zP * zM + 0.94 * q;
    if (q >= 0.75) ceilingHits += 1;
  }

  const stressedCorrelation = clamp(q + 0.12, -1, 0.98);
  return {
    currentCorrelation: clamp(q, -1, 1),
    stressedCorrelation: Math.min(stressedCorrelation, 0.75),
    correlationCeilingHitRate: ceilingHits / Math.max(left.length, 1),
    condVolPortfolio: Math.sqrt(Math.max(h, 1e-9)),
  };
}

function monteCarloEngine(input: PortfolioInput, normalizedWeights: { assetId: string; value: number }[], history: GeneratedHistory, dccStress: number) {
  const scenarioShock = SCENARIO_SET.find((item) => item.id === input.scenarioSeverity)?.shock ?? -0.3;
  const assets = normalizedWeights.map((item) => STRESS_ASSETS.find((asset) => asset.id === item.assetId)).filter(Boolean) as StressAsset[];
  const recentReturns = assets.map((asset) => history.assetReturns[asset.id].slice(-756));
  const means = recentReturns.map((series) => mean(series));
  const sigmas = recentReturns.map((series) => Math.max(stdDev(series), 1e-6));

  const corrMatrix = assets.map((assetI) =>
    assets.map((assetJ) => {
      if (assetI.id === assetJ.id) return 1;
      const base = CLASS_BASE_CORRELATION[assetI.assetClass][assetJ.assetClass];
      return clamp(base + dccStress * 0.25, -0.95, 0.95);
    })
  );
  const chol = cholesky(corrMatrix);
  const rng = createSeededRng(91_800_331);

  const losses: number[] = [];
  const drawdowns: number[] = [];
  const pathValues: number[][] = Array.from({ length: MONTE_CARLO_HORIZON_DAYS }, () => []);

  for (let sim = 0; sim < MONTE_CARLO_SIMULATIONS; sim += 1) {
    let value = 1;
    let peak = 1;
    let maxDd = 0;

    for (let day = 0; day < MONTE_CARLO_HORIZON_DAYS; day += 1) {
      const tVector = assets.map(() => studentT(rng, 6));
      const correlated = assets.map((_, row) =>
        assets.reduce((acc, __, col) => acc + chol[row][col] * tVector[col], 0)
      );

      const macroAdj =
        input.macroShock.rateShockPct * -0.0002 +
        input.macroShock.inflationShockPct * -0.00015 +
        (input.macroShock.dxyStable ? 0 : -0.0002);

      const portReturn = assets.reduce((acc, asset, index) => {
        const w = normalizedWeights[index].value;
        const jump =
          rng() < asset.jumpDefaultProb * 12
            ? -(0.05 + rng() * 0.25) * asset.tailScale
            : 0;
        const gap =
          rng() < 0.006 * asset.tailScale
            ? -(0.01 + rng() * 0.07)
            : 0;
        const btcShock =
          asset.id === "btc"
            ? input.macroShock.btcShockPct / 100 / MONTE_CARLO_HORIZON_DAYS
            : 0;
        return (
          acc +
          w *
            (means[index] +
              sigmas[index] * correlated[index] +
              macroAdj +
              scenarioShock / MONTE_CARLO_HORIZON_DAYS +
              jump +
              gap +
              btcShock)
        );
      }, 0);

      value *= 1 + portReturn;
      peak = Math.max(peak, value);
      maxDd = Math.max(maxDd, (peak - value) / peak);
      pathValues[day].push(value);
    }

    losses.push(1 - value);
    drawdowns.push(maxDd);
  }

  const var99 = quantile(losses, 0.99);
  const cvarSet = losses.filter((loss) => loss >= var99);
  const cvar99 = cvarSet.length > 0 ? mean(cvarSet) : var99;

  const cone = pathValues.map((dayValues, index) => ({
    day: index + 1,
    p10: quantile(dayValues, 0.1),
    p50: quantile(dayValues, 0.5),
    p90: quantile(dayValues, 0.9),
  }));

  return {
    simulations: MONTE_CARLO_SIMULATIONS,
    horizonDays: MONTE_CARLO_HORIZON_DAYS,
    var99,
    cvar99,
    maxDrawdown99: quantile(drawdowns, 0.99),
    cone,
  };
}

function sequenceRisk(input: PortfolioInput, portfolioReturns: number[]) {
  const rng = createSeededRng(40_444_001);
  const withdrawal = input.withdrawalRatePct / 100;
  const years = 20;
  const annualized = Array.from({ length: 60 }, () => {
    const start = Math.floor(rng() * Math.max(portfolioReturns.length - 252, 1));
    return portfolioReturns.slice(start, start + 252).reduce((acc, ret) => acc * (1 + ret), 1) - 1;
  });

  const simulate = (ordered: number[]) => {
    let wealth = 1;
    for (let year = 0; year < years; year += 1) {
      wealth *= 1 + ordered[year % ordered.length];
      wealth -= withdrawal;
      if (wealth <= 0) return 0;
    }
    return wealth;
  };

  const randomTerminal: number[] = [];
  for (let i = 0; i < 800; i += 1) {
    const shuffled = [...annualized].sort(() => rng() - 0.5);
    randomTerminal.push(simulate(shuffled));
  }

  const worstOrdered = [...annualized].sort((a, b) => a - b);
  const bestOrdered = [...annualized].sort((a, b) => b - a);
  const timingPenalty = Math.max(simulate(bestOrdered) - simulate(worstOrdered), 0);

  return {
    medianTerminalWealth: quantile(randomTerminal, 0.5),
    p10TerminalWealth: quantile(randomTerminal, 0.1),
    depletionProbability: randomTerminal.filter((value) => value <= 0).length / randomTerminal.length,
    timingPenalty,
  };
}

function factorSensitivity(normalized: { assetId: string; value: number }[], history: GeneratedHistory) {
  const exposures = normalized.reduce(
    (acc, item) => {
      const asset = STRESS_ASSETS.find((entry) => entry.id === item.assetId);
      if (!asset) return acc;
      acc.fx += item.value * asset.factorLoadings.fx;
      acc.rate += item.value * asset.factorLoadings.rate;
      acc.commodity += item.value * asset.factorLoadings.commodity;
      acc.inflation += item.value * asset.factorLoadings.inflation;
      return acc;
    },
    { fx: 0, rate: 0, commodity: 0, inflation: 0 }
  );

  const weakestFactor = FACTOR_NAMES.reduce((worst, factor) => {
    return Math.abs(exposures[factor]) > Math.abs(exposures[worst]) ? factor : worst;
  }, "fx" as keyof typeof exposures);

  const factorCov = FACTOR_NAMES.map((left) =>
    FACTOR_NAMES.map((right) => {
      if (left === right) return variance(history.factorReturns[left]);
      return correlation(history.factorReturns[left], history.factorReturns[right]) * stdDev(history.factorReturns[left]) * stdDev(history.factorReturns[right]);
    })
  );

  return {
    exposures,
    weakestFactor,
    pcaVarianceExplained: pcaFirstComponentShare(factorCov),
  };
}

function liquidityStress(input: PortfolioInput, normalized: { assetId: string; value: number }[], portfolioReturns: number[]) {
  const weightedLiquidationDays = normalized.reduce((acc, item) => {
    const asset = STRESS_ASSETS.find((entry) => entry.id === item.assetId);
    if (!asset) return acc;
    return acc + item.value * asset.liquidityDays;
  }, 0);

  const slippageRate = normalized.reduce((acc, item) => {
    const asset = STRESS_ASSETS.find((entry) => entry.id === item.assetId);
    if (!asset) return acc;
    return acc + item.value * (asset.slippageBps / 10000);
  }, 0);

  const slippageLoss = input.portfolioValue * slippageRate * (1 + weightedLiquidationDays / 5);
  const gapLoss = input.portfolioValue * Math.abs(quantile(portfolioReturns, 0.01));
  const jumpToDefaultLoss =
    input.portfolioValue *
    normalized.reduce((acc, item) => {
      const asset = STRESS_ASSETS.find((entry) => entry.id === item.assetId);
      if (!asset) return acc;
      return acc + item.value * asset.jumpDefaultProb * 45;
    }, 0);

  return { weightedLiquidationDays, slippageLoss, gapLoss, jumpToDefaultLoss };
}

function validationMetrics(portfolioReturns: number[]) {
  let h = Math.max(variance(portfolioReturns.slice(0, 60)), 1e-7);
  const omega = 0.000001;
  const alpha = 0.08;
  const beta = 0.9;
  let exceedances = 0;
  const obs = Math.max(portfolioReturns.length - 1, 1);
  for (let i = 1; i < portfolioReturns.length; i += 1) {
    h = omega + alpha * portfolioReturns[i - 1] ** 2 + beta * h;
    const var99 = 2.33 * Math.sqrt(h);
    if (-portfolioReturns[i] > var99) exceedances += 1;
  }
  const rate = exceedances / obs;
  const p0 = 0.01;
  const p1 = clamp(rate, 1e-6, 1 - 1e-6);
  const lr =
    -2 *
    ((obs - exceedances) * Math.log((1 - p0) / (1 - p1)) +
      exceedances * Math.log(p0 / p1));
  const pValue = Math.exp(-0.5 * Math.max(lr, 0));

  const rng = createSeededRng(12_770_101);
  const shuffled = shuffleInBlocks(portfolioReturns, 21, rng);
  const originalSharpe = mean(portfolioReturns) / Math.max(stdDev(portfolioReturns), 1e-9);
  const shuffledSharpe = mean(shuffled) / Math.max(stdDev(shuffled), 1e-9);
  const robustness = clamp(Math.abs(originalSharpe) > 1e-6 ? shuffledSharpe / originalSharpe : 0, -2, 2);
  const risk: "low" | "medium" | "high" =
    robustness < 0.45 ? "high" : robustness < 0.75 ? "medium" : "low";

  return {
    kupiecExceedanceRate: rate,
    kupiecPass: rate <= 0.012,
    kupiecPValue: pValue,
    phaseShuffledRobustness: robustness,
    overfittingRisk: risk,
  };
}

function regulation(monteCarloVar: number, selectedCrisisLoss: number): RegulationResult {
  const baselCapitalNeedPct = clamp(monteCarloVar * 1.15, 0, 1);
  const ccarLossPct = clamp(Math.abs(selectedCrisisLoss) * 1.05, 0, 1);
  const solvencyCapitalNeedPct = clamp(Math.max(baselCapitalNeedPct, ccarLossPct) * 0.9, 0, 1);
  return {
    baselCapitalNeedPct,
    ccarLossPct,
    solvencyCapitalNeedPct,
    compliant: baselCapitalNeedPct < 0.35 && ccarLossPct < 0.4 && solvencyCapitalNeedPct < 0.38,
  };
}

function guidance(
  input: PortfolioInput,
  weakestFactor: string,
  monteCarlo: { var99: number; cvar99: number; maxDrawdown99: number },
  liquidity: { weightedLiquidationDays: number; slippageLoss: number; gapLoss: number; jumpToDefaultLoss: number },
  validation: { kupiecPass: boolean; overfittingRisk: "low" | "medium" | "high" },
  selectedCrisis: CrisisReplayResult
) {
  const liqPenalty = clamp((liquidity.weightedLiquidationDays - 1) * 6, 0, 20);
  const riskPenalty = clamp((monteCarlo.var99 + monteCarlo.cvar99 + monteCarlo.maxDrawdown99) * 80, 0, 45);
  const crisisPenalty = clamp(Math.abs(selectedCrisis.cumulativeReturn) * 30, 0, 20);
  const validationPenalty =
    (validation.kupiecPass ? 0 : 8) + (validation.overfittingRisk === "high" ? 10 : validation.overfittingRisk === "medium" ? 5 : 0);
  const resilienceScore = clamp(100 - liqPenalty - riskPenalty - crisisPenalty - validationPenalty, 0, 100);

  const severityText =
    resilienceScore >= 75
      ? "Portföy dayanıklılığı güçlü."
      : resilienceScore >= 55
      ? "Portföy orta seviyede dayanıklı; stres altında bozulma var."
      : "Portföy kırılgan; kriz anında kayıplar hızla derinleşebilir.";

  const hedgeSuggestions = [
    weakestFactor === "fx"
      ? "Kur duyarlılığı yüksek: USDTRY riskini azaltmak için hedge oranını artır."
      : weakestFactor === "rate"
      ? "Faiz şokuna duyarlılık yüksek: vade riskini kısalt veya faiz hedge ekle."
      : weakestFactor === "commodity"
      ? "Emtia şokuna açık yapı: enerji/metal ağırlığını dengele."
      : "Enflasyon şoku baskın: enflasyona endeksli koruma enstrümanlarını artır.",
    "Riski ~%20 azaltmak için yüksek beta varlıklarda net pozisyonu düşürüp negatif korelasyonlu altın/tahvil payını artır.",
    "Likidite stresi yüksek varlıklarda kademeli çıkış planı ve önceden tanımlı stop-loss bandı kullan.",
  ];

  const ipsDraft = [
    "Yatırım Politikası Taslağı (IPS)",
    `- Hedef dayanıklılık skoru: >=70 (mevcut: ${resilienceScore.toFixed(0)})`,
    `- Maksimum 99% günlük VaR sınırı: ${(monteCarlo.var99 * 100).toFixed(2)}%`,
    `- En zayıf risk faktörü: ${weakestFactor.toUpperCase()}`,
    `- Kriz modu aksiyonu: ${selectedCrisis.title} benzeri rejimde beta düşür ve likidite tamponu artır.`,
  ].join("\n");

  return {
    resilienceScore,
    headline: severityText,
    summary: `Seçili krizde portföy getirisi ${(selectedCrisis.cumulativeReturn * 100).toFixed(2)}%, toparlanma ${selectedCrisis.recoveryMonths} ay.`,
    hedgeSuggestions,
    ipsDraft,
  };
}

export function runStressAnalysis(input: PortfolioInput): StressAnalysisResult {
  const history = getHistory();
  const normalizedWeights = normalizeWeights(input.weights);
  const portReturns = portfolioSeries(history.assetReturns, normalizedWeights);

  const crisisReplayLibrary = crisisReplayResults(input, history, normalizedWeights);
  const selectedCrisis =
    crisisReplayLibrary.find((item) => item.scenarioId === input.selectedCrisisId) ??
    crisisReplayLibrary[0];

  const scenarioSet = SCENARIO_SET.map((scenario) => {
    const macroAdj =
      input.macroShock.rateShockPct * -0.004 +
      input.macroShock.inflationShockPct * -0.003 +
      (input.macroShock.dxyStable ? 0 : -0.02) +
      input.macroShock.btcShockPct * 0.001;
    const stressedLossPct = clamp(scenario.shock + macroAdj, -0.95, 0.5);
    const stressedLoss = input.portfolioValue * Math.abs(Math.min(stressedLossPct, 0));
    return {
      label: scenario.label,
      shock: scenario.shock,
      stressedLoss,
      remainingValue: input.portfolioValue - stressedLoss,
    };
  });

  const dccGarch = dccGarchEstimate(portReturns.slice(-1200), history.factorReturns.market.slice(-1200));
  const monteCarlo = monteCarloEngine(input, normalizedWeights, history, dccGarch.currentCorrelation);
  const sequenceRiskResult = sequenceRisk(input, portReturns.slice(-3000));
  const factor = factorSensitivity(normalizedWeights, history);
  const liquidity = liquidityStress(input, normalizedWeights, portReturns.slice(-1200));
  const validation = validationMetrics(portReturns.slice(-2500));
  const regulationResult = regulation(monteCarlo.var99, selectedCrisis.cumulativeReturn);
  const guidanceResult = guidance(
    input,
    factor.weakestFactor,
    monteCarlo,
    liquidity,
    validation,
    selectedCrisis
  );

  return {
    crisisReplayLibrary,
    selectedCrisis,
    scenarioSet,
    monteCarlo,
    dccGarch,
    sequenceRisk: sequenceRiskResult,
    factorSensitivity: factor,
    liquidityStress: liquidity,
    validation,
    regulation: regulationResult,
    guidance: guidanceResult,
  };
}
