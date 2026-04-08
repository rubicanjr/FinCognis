import {
  cholesky,
  clamp,
  correlation,
  createSeededRng,
  erf,
  mean,
  quantile,
  rollingCorrelation,
  stdDev,
  studentT,
  toRanks,
  variance,
} from "@/components/tools/correlation/math";
import {
  ASSET_UNIVERSE,
  CATEGORY_OPTIONS,
  LIQUIDITY_TABLE,
  WINDOW_OPTIONS,
} from "@/components/tools/correlation/universe";
import type {
  AssetDefinition,
  CategoryId,
  CorrelationAnalysisResult,
  CrisisReplayResult,
  HeatmapCell,
  HistoryDataset,
  LiquidityProfile,
  TailDependenceResult,
  WindowKey,
} from "@/components/tools/correlation/types";

const START_YEAR = 2000;
const YEARS = 26;
const TRADING_DAYS_PER_YEAR = 252;
const CORRELATION_CEILING = 0.75;

let cachedDataset: HistoryDataset | null = null;

function createTradingDates(startYear: number, years: number): string[] {
  const dates: string[] = [];
  const current = new Date(Date.UTC(startYear, 0, 3));
  const limit = years * TRADING_DAYS_PER_YEAR;

  while (dates.length < limit) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function getRegime(dateIso: string) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;

  if (year === 2008 || year === 2009) {
    return { driftShift: -0.00055, volMultiplier: 2.0, jumpProb: 0.022, gapProb: 0.03 };
  }
  if (year === 2020 && month >= 2 && month <= 5) {
    return { driftShift: -0.00085, volMultiplier: 2.6, jumpProb: 0.04, gapProb: 0.05 };
  }
  if ((year === 2022 && month >= 5) || (year === 2023 && month <= 2)) {
    return { driftShift: -0.00045, volMultiplier: 2.1, jumpProb: 0.032, gapProb: 0.036 };
  }
  if (year >= 2024) {
    return { driftShift: 0.0002, volMultiplier: 1.1, jumpProb: 0.008, gapProb: 0.012 };
  }
  return { driftShift: 0.00008, volMultiplier: 1.0, jumpProb: 0.006, gapProb: 0.01 };
}

function initializeCategoryRecord<T>(initialValue: T): Record<CategoryId, T> {
  return {
    emtialar: initialValue,
    kripto: initialValue,
    turk_hisse: initialValue,
    abd_hisse: initialValue,
  };
}

function generateSyntheticHistory(): HistoryDataset {
  const dates = createTradingDates(START_YEAR, YEARS);
  const rng = createSeededRng(42_424_242);
  const returnsByAsset: Record<string, number[]> = {};
  const gapByAsset: Record<string, number[]> = {};
  const marketReturns: number[] = [];
  const categoryReturns = initializeCategoryRecord<number[]>([]);
  const categoryVol = initializeCategoryRecord<number>(0.00008);
  const idioVolByAsset: Record<string, number> = {};

  ASSET_UNIVERSE.forEach((asset) => {
    returnsByAsset[asset.id] = [];
    gapByAsset[asset.id] = [];
    idioVolByAsset[asset.id] = asset.baseVol * asset.baseVol;
  });

  let globalVol = 0.00006;

  dates.forEach((dateIso) => {
    const regime = getRegime(dateIso);
    const globalShock = studentT(rng, 8) * Math.sqrt(globalVol) * regime.volMultiplier;
    globalVol = 0.000002 + 0.09 * (globalShock ** 2) + 0.89 * globalVol;

    const categoryShock = initializeCategoryRecord<number>(0);
    (Object.keys(categoryShock) as CategoryId[]).forEach((categoryId) => {
      const idio = studentT(rng, 7) * Math.sqrt(categoryVol[categoryId]) * regime.volMultiplier;
      categoryShock[categoryId] = 0.45 * globalShock + idio;
      categoryVol[categoryId] =
        0.000003 + 0.08 * (categoryShock[categoryId] ** 2) + 0.9 * categoryVol[categoryId];
    });

    const dayAggregate = initializeCategoryRecord<{ total: number; count: number }>({
      total: 0,
      count: 0,
    });

    ASSET_UNIVERSE.forEach((asset) => {
      const idioShock =
        studentT(rng, 6) * Math.sqrt(idioVolByAsset[asset.id]) * regime.volMultiplier;
      idioVolByAsset[asset.id] =
        0.000004 + 0.11 * (idioShock ** 2) + 0.86 * idioVolByAsset[asset.id];

      const jump =
        rng() < regime.jumpProb * asset.jumpSensitivity
          ? (rng() < 0.62 ? -1 : 1) * (0.02 + rng() * 0.11) * asset.jumpSensitivity
          : 0;
      const gap =
        rng() < regime.gapProb * asset.gapSensitivity
          ? (rng() < 0.58 ? -1 : 1) * (0.01 + rng() * 0.08) * asset.gapSensitivity
          : 0;

      const assetReturn = clamp(
        asset.baseDrift +
          regime.driftShift * 0.35 +
          asset.betaGlobal * globalShock +
          asset.betaCategory * categoryShock[asset.category] +
          idioShock +
          jump +
          gap,
        -0.45,
        0.35
      );

      returnsByAsset[asset.id].push(assetReturn);
      gapByAsset[asset.id].push(gap);
      dayAggregate[asset.category].total += assetReturn;
      dayAggregate[asset.category].count += 1;
    });

    marketReturns.push(globalShock + regime.driftShift);
    (Object.keys(dayAggregate) as CategoryId[]).forEach((categoryId) => {
      const denominator = Math.max(dayAggregate[categoryId].count, 1);
      categoryReturns[categoryId].push(dayAggregate[categoryId].total / denominator);
    });
  });

  return { dates, returnsByAsset, gapByAsset, marketReturns, categoryReturns };
}

export function getSyntheticHistory(): HistoryDataset {
  if (!cachedDataset) {
    cachedDataset = generateSyntheticHistory();
  }
  return cachedDataset;
}

function buildDccGarch(assetA: number[], assetB: number[]) {
  const size = Math.min(assetA.length, assetB.length);
  const left = assetA.slice(assetA.length - size);
  const right = assetB.slice(assetB.length - size);
  const muA = mean(left);
  const muB = mean(right);
  const epsA = left.map((value) => value - muA);
  const epsB = right.map((value) => value - muB);
  const omegaA = 0.0000012;
  const omegaB = 0.0000012;
  const alpha = 0.08;
  const beta = 0.9;
  const dccA = 0.03;
  const dccB = 0.95;
  let hA = Math.max(variance(epsA.slice(0, 30)), 1e-7);
  let hB = Math.max(variance(epsB.slice(0, 30)), 1e-7);
  const qBar = correlation(left, right);
  let q11 = 1;
  let q22 = 1;
  let q12 = qBar;
  const series: number[] = [];
  let ceilingHits = 0;

  for (let index = 1; index < size; index += 1) {
    hA = omegaA + alpha * (epsA[index - 1] ** 2) + beta * hA;
    hB = omegaB + alpha * (epsB[index - 1] ** 2) + beta * hB;
    const zA = epsA[index] / Math.sqrt(Math.max(hA, 1e-9));
    const zB = epsB[index] / Math.sqrt(Math.max(hB, 1e-9));

    q11 = (1 - dccA - dccB) + dccA * (zA ** 2) + dccB * q11;
    q22 = (1 - dccA - dccB) + dccA * (zB ** 2) + dccB * q22;
    q12 = (1 - dccA - dccB) * qBar + dccA * zA * zB + dccB * q12;

    const rho = clamp(q12 / Math.sqrt(Math.max(q11 * q22, 1e-9)), -0.999, 0.999);
    if (rho >= CORRELATION_CEILING) ceilingHits += 1;
    series.push(rho);
  }

  const latest = series.at(-1) ?? 0;
  return {
    latestCorrelation: latest,
    effectiveCorrelation: Math.min(latest, CORRELATION_CEILING),
    averageCorrelation: mean(series),
    ceilingHitRatio: series.length > 0 ? ceilingHits / series.length : 0,
    conditionalVolA: Math.sqrt(Math.max(hA, 1e-9)),
    conditionalVolB: Math.sqrt(Math.max(hB, 1e-9)),
    rollingSeries: series,
  };
}

function computeTailDependence(assetA: number[], assetB: number[]): TailDependenceResult {
  const size = Math.min(assetA.length, assetB.length);
  const left = assetA.slice(assetA.length - size);
  const right = assetB.slice(assetB.length - size);
  const leftRanks = toRanks(left);
  const rightRanks = toRanks(right);
  const q = 0.05;
  let lowerJoint = 0;
  let upperJoint = 0;

  for (let index = 0; index < size; index += 1) {
    if (leftRanks[index] < q && rightRanks[index] < q) lowerJoint += 1;
    if (leftRanks[index] > 1 - q && rightRanks[index] > 1 - q) upperJoint += 1;
  }

  const pooled = left.map((value, index) => 0.5 * (value + right[index]));
  const sigma = Math.max(stdDev(pooled), 1e-7);
  const centeredFourth =
    pooled.reduce((acc, value) => acc + ((value - mean(pooled)) / sigma) ** 4, 0) /
    Math.max(pooled.length, 1);
  const excessKurtosis = Math.max(centeredFourth - 3, 0.15);
  const tCopulaDf = clamp(6 / excessKurtosis + 4, 4, 40);
  const threshold = -2.33;
  const rng = createSeededRng(8_100_112);
  const rho = correlation(left, right);
  const ch = cholesky([
    [1, rho],
    [rho, 1],
  ]);
  let jointCrash = 0;
  const iterations = 4000;

  for (let iter = 0; iter < iterations; iter += 1) {
    const z1 = studentT(rng, Math.round(tCopulaDf));
    const z2 = studentT(rng, Math.round(tCopulaDf));
    const x1 = ch[0][0] * z1 + ch[0][1] * z2;
    const x2 = ch[1][0] * z1 + ch[1][1] * z2;
    if (x1 < threshold && x2 < threshold) jointCrash += 1;
  }

  const jointCrashProbability = jointCrash / iterations;
  const lowerTailDependence = clamp(lowerJoint / Math.max(size * q, 1), 0, 2.5);
  const upperTailDependence = clamp(upperJoint / Math.max(size * q, 1), 0, 2.5);

  return {
    lowerTailDependence,
    upperTailDependence,
    tCopulaDf,
    jointCrashProbability,
    coCrashMultiplier: jointCrashProbability / 0.0001,
  };
}

function computeBacktest(assetA: number[], assetB: number[]) {
  const size = Math.min(assetA.length, assetB.length);
  const portfolio = assetA.slice(assetA.length - size).map((value, index) => 0.5 * value + 0.5 * assetB[index]);
  let h = Math.max(variance(portfolio.slice(0, 50)), 1e-7);
  const omega = 0.000001;
  const alpha = 0.09;
  const beta = 0.89;
  const confidenceLevel = 0.99;
  const tailProb = 1 - confidenceLevel;
  let exceedances = 0;

  for (let index = 1; index < portfolio.length; index += 1) {
    h = omega + alpha * (portfolio[index - 1] ** 2) + beta * h;
    const var99 = 2.33 * Math.sqrt(Math.max(h, 1e-9));
    if (-portfolio[index] > var99) exceedances += 1;
  }

  const observations = Math.max(portfolio.length - 1, 1);
  const rate = exceedances / observations;
  const phat = clamp(rate, 1e-6, 1 - 1e-6);
  const logNull = (observations - exceedances) * Math.log(1 - tailProb) + exceedances * Math.log(tailProb);
  const logAlt = (observations - exceedances) * Math.log(1 - phat) + exceedances * Math.log(phat);
  const kupiecLR = Math.max(-2 * (logNull - logAlt), 0);
  const kupiecPValue = 1 - erf(Math.sqrt(kupiecLR / 2));

  return {
    confidenceLevel,
    observations,
    exceedances,
    exceedanceRate: rate,
    kupiecLR,
    kupiecPValue,
    pass: rate <= 0.012 && kupiecPValue > 0.05,
  };
}

function computeDrawdownSeries(returns: number[]) {
  let value = 1;
  let peak = 1;
  let maxDrawdown = 0;
  returns.forEach((ret) => {
    value *= 1 + ret;
    peak = Math.max(peak, value);
    const drawdown = (peak - value) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });
  return maxDrawdown;
}

function buildCrisisReplay(
  dates: string[],
  pairReturns: number[],
  marketReturns: number[]
): CrisisReplayResult[] {
  const periods = [
    { id: "covid_2020", title: "Mart 2020 COVID Cokusu", description: "Likidite kuruması ve sert volatilite.", start: "2020-02-20", end: "2020-04-30" },
    { id: "crypto_2022", title: "2022 Kripto Kışı", description: "Risk iştahı kırılması ve kaldıraç çözülmesi.", start: "2022-05-01", end: "2022-12-31" },
  ];

  const results = periods.map((period) => {
    const indexes = dates
      .map((date, index) => ({ date, index }))
      .filter((item) => item.date >= period.start && item.date <= period.end)
      .map((item) => item.index);
    const returns = indexes.map((index) => pairReturns[index]).filter((value) => Number.isFinite(value));
    const market = indexes.map((index) => marketReturns[index]).filter((value) => Number.isFinite(value));
    const cumulative = returns.reduce((acc, value) => acc * (1 + value), 1) - 1;
    return {
      id: period.id,
      title: period.title,
      description: period.description,
      startDate: period.start,
      endDate: period.end,
      periodDays: returns.length,
      cumulativeLoss: cumulative,
      maxDrawdown: computeDrawdownSeries(returns),
      regimeCorrelation: correlation(returns, market),
    };
  });

  let value = 1;
  let peak = 1;
  let worstStart = 0;
  let worstEnd = 0;
  let candidateStart = 0;
  let worstDrawdown = 0;
  marketReturns.forEach((ret, index) => {
    value *= 1 + ret;
    if (value >= peak) {
      peak = value;
      candidateStart = index;
    }
    const drawdown = (peak - value) / peak;
    if (drawdown > worstDrawdown) {
      worstDrawdown = drawdown;
      worstStart = candidateStart;
      worstEnd = index;
    }
  });

  if (worstDrawdown >= 0.2 && worstEnd > worstStart) {
    const returns = pairReturns.slice(worstStart, worstEnd + 1);
    results.push({
      id: "drawdown_20",
      title: "Genel %20+ Piyasa Düşüş Rejimi",
      description: "Non-stationary veri içinde tespit edilen en sert drawdown dönemi.",
      startDate: dates[worstStart],
      endDate: dates[worstEnd],
      periodDays: returns.length,
      cumulativeLoss: returns.reduce((acc, value) => acc * (1 + value), 1) - 1,
      maxDrawdown: computeDrawdownSeries(returns),
      regimeCorrelation: correlation(
        returns,
        marketReturns.slice(worstStart, worstEnd + 1)
      ),
    });
  }

  return results;
}

function buildHeatmap(portfolioIds: string[], returnsByAsset: Record<string, number[]>): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  portfolioIds.forEach((rowId) => {
    portfolioIds.forEach((colId) => {
      const corr = rowId === colId ? 1 : correlation(returnsByAsset[rowId], returnsByAsset[colId]);
      cells.push({ rowId, colId, value: corr });
    });
  });
  return cells;
}

function buildLiquidityProfiles(portfolioIds: string[]): Record<string, LiquidityProfile> {
  return portfolioIds.reduce<Record<string, LiquidityProfile>>((acc, assetId) => {
    const asset = ASSET_UNIVERSE.find((item) => item.id === assetId);
    if (!asset) return acc;
    acc[assetId] = LIQUIDITY_TABLE[asset.liquidityTier];
    return acc;
  }, {});
}

function runStressVarMonteCarlo(portfolioIds: string[], returnsByAsset: Record<string, number[]>) {
  const sampleSize = 756;
  const returns = portfolioIds.map((assetId) => returnsByAsset[assetId].slice(-sampleSize));
  const means = returns.map((series) => mean(series));
  const stds = returns.map((series) => Math.max(stdDev(series), 1e-6));
  const corrMatrix = portfolioIds.map((leftId) =>
    portfolioIds.map((rightId) =>
      leftId === rightId ? 1 : correlation(returnsByAsset[leftId].slice(-sampleSize), returnsByAsset[rightId].slice(-sampleSize))
    )
  );
  const chol = cholesky(corrMatrix);
  const rng = createSeededRng(93_441_200);
  const weights = portfolioIds.map(() => 1 / portfolioIds.length);
  const simulations = 1800;
  const horizonDays = 20;
  const losses: number[] = [];
  const drawdowns: number[] = [];

  for (let scenario = 0; scenario < simulations; scenario += 1) {
    let value = 1;
    let peak = 1;
    let maxDd = 0;

    for (let day = 0; day < horizonDays; day += 1) {
      const base = portfolioIds.map(() => studentT(rng, 6));
      const correlated = portfolioIds.map((_, row) => {
        return base.reduce((acc, valueSeed, col) => acc + chol[row][col] * valueSeed, 0);
      });
      const daily = correlated.reduce((acc, noise, index) => {
        const asset = ASSET_UNIVERSE.find((item) => item.id === portfolioIds[index]);
        const liquidity = asset ? LIQUIDITY_TABLE[asset.liquidityTier] : LIQUIDITY_TABLE.high;
        return acc + weights[index] * (means[index] + stds[index] * noise / liquidity.slippageMultiplier);
      }, 0);
      value *= 1 + daily;
      peak = Math.max(peak, value);
      maxDd = Math.max(maxDd, (peak - value) / peak);
    }

    losses.push(1 - value);
    drawdowns.push(maxDd);
  }

  const var99 = quantile(losses, 0.99);
  const tailLosses = losses.filter((loss) => loss >= var99);
  const expectedShortfall99 = tailLosses.length > 0 ? mean(tailLosses) : var99;

  return {
    horizonDays,
    simulations,
    var99,
    expectedShortfall99,
    maxDrawdown99: quantile(drawdowns, 0.99),
  };
}

function createNarrative(assetA: AssetDefinition, correlations: { plain: number; down: number }, tail: TailDependenceResult, backtestPass: boolean) {
  const flags: string[] = [];
  let severity: "low" | "medium" | "high" | "critical" = "low";
  let headline = "Cesitlendirme yapisi dengeli gorunuyor.";
  let summary = "Pair iliskisi kontrol altinda, kuyruk riski sinirli.";

  if (correlations.down >= 0.8 || tail.coCrashMultiplier >= 7) {
    severity = "critical";
    headline = "Bu iki varlik krizde birbirinin kopyasi gibi davranabilir.";
    summary = "Asagi yonlu baglilik cok yuksek. Kriz aninda birlikte sert kayip riski var.";
    flags.push("Downside korelasyon kirmizi bayrak seviyesinde.");
  } else if (correlations.down >= 0.65 || correlations.plain >= 0.75) {
    severity = "high";
    headline = "Yuksek korelasyon tespit edildi.";
    summary = "Gercek cesitlendirme etkisi zayif. Pozisyonlar ayni risk faktorunu tasiyor.";
    flags.push("Korelasyon tavani (%75) bolgesine yakinlasildi.");
  } else if (correlations.down >= 0.45) {
    severity = "medium";
    headline = "Orta seviyede bagimlilik var.";
    summary = "Portfoy dayanimi var ancak stres rejimlerinde birlikte hareket belirginlesebilir.";
  }

  if (!backtestPass) {
    flags.push("Kupiec backtest modeli %99 guven duzeyinde zayif dogruladi.");
    if (severity === "low") severity = "medium";
  }

  const categoryAlternatives = ASSET_UNIVERSE.filter((asset) => asset.category !== assetA.category)
    .slice(0, 3)
    .map((asset) => `${asset.ticker} (${CATEGORY_OPTIONS.find((c) => c.id === asset.category)?.label})`);

  return {
    severity,
    headline,
    summary,
    alternatives: categoryAlternatives,
    flags,
  };
}

interface AnalysisInput {
  assetAId: string;
  assetBId: string;
  portfolioIds: string[];
  windowKey: WindowKey;
}

export function runCorrelationAnalysis({ assetAId, assetBId, portfolioIds, windowKey }: AnalysisInput): CorrelationAnalysisResult {
  const dataset = getSyntheticHistory();
  const assetA = ASSET_UNIVERSE.find((asset) => asset.id === assetAId) ?? ASSET_UNIVERSE[0];
  const assetB = ASSET_UNIVERSE.find((asset) => asset.id === assetBId) ?? ASSET_UNIVERSE[1];
  const windowSize = WINDOW_OPTIONS.find((option) => option.key === windowKey)?.size ?? 250;
  const seriesA = dataset.returnsByAsset[assetA.id];
  const seriesB = dataset.returnsByAsset[assetB.id];
  const gapA = dataset.gapByAsset[assetA.id];
  const gapB = dataset.gapByAsset[assetB.id];
  const market = dataset.marketReturns;

  const windowA = seriesA.slice(-windowSize);
  const windowB = seriesB.slice(-windowSize);
  const windowMarket = market.slice(-windowSize);
  const pearson = correlation(windowA, windowB);

  const downsideIndices = windowMarket.map((value, index) => ({ value, index })).filter((item) => item.value < 0).map((item) => item.index);
  const upsideIndices = windowMarket.map((value, index) => ({ value, index })).filter((item) => item.value >= 0).map((item) => item.index);
  const downsideCorrelation = correlation(
    downsideIndices.map((index) => windowA[index]),
    downsideIndices.map((index) => windowB[index])
  );
  const upsideCorrelation = correlation(
    upsideIndices.map((index) => windowA[index]),
    upsideIndices.map((index) => windowB[index])
  );

  const rolling = WINDOW_OPTIONS.map((option) => ({
    key: option.key,
    label: option.label,
    size: option.size,
    correlation: correlation(seriesA.slice(-option.size), seriesB.slice(-option.size)),
  }));

  const dccGarch = buildDccGarch(seriesA.slice(-Math.max(windowSize, 756)), seriesB.slice(-Math.max(windowSize, 756)));
  const tail = computeTailDependence(windowA, windowB);
  const pairStd = Math.max(stdDev(windowA.concat(windowB)), 1e-6);
  const jumpEventCount =
    windowA.filter((value) => Math.abs(value) > 3 * pairStd).length +
    windowB.filter((value) => Math.abs(value) > 3 * pairStd).length;
  const jumpToDefaultProbability =
    windowA.filter((value, index) => Math.min(value, windowB[index]) < -0.2).length /
    Math.max(windowA.length, 1);
  const gapEvents =
    gapA.slice(-windowSize).filter((value) => Math.abs(value) > 0.03).length +
    gapB.slice(-windowSize).filter((value) => Math.abs(value) > 0.03).length;
  const backtest = computeBacktest(seriesA.slice(-1500), seriesB.slice(-1500));
  const pairReturns = seriesA.map((value, index) => 0.5 * value + 0.5 * seriesB[index]);
  const crisisReplay = buildCrisisReplay(dataset.dates, pairReturns, dataset.marketReturns);

  const uniquePortfolioIds = [...new Set([assetA.id, assetB.id, ...portfolioIds])].slice(0, 10);
  const heatmap = buildHeatmap(uniquePortfolioIds, dataset.returnsByAsset);
  const liquidityProfiles = buildLiquidityProfiles(uniquePortfolioIds);
  const stressVar = runStressVarMonteCarlo(uniquePortfolioIds, dataset.returnsByAsset);

  const sourceIndex = uniquePortfolioIds.indexOf(assetA.id);
  const matrix = uniquePortfolioIds.map((rowId) =>
    uniquePortfolioIds.map((colId) =>
      rowId === colId
        ? 1
        : correlation(dataset.returnsByAsset[rowId].slice(-windowSize), dataset.returnsByAsset[colId].slice(-windowSize))
    )
  );
  const direct = uniquePortfolioIds.map((targetId, targetIndex) => {
    if (targetId === assetA.id) return -0.2;
    const liquidity = liquidityProfiles[targetId] ?? LIQUIDITY_TABLE.high;
    return -0.2 * Math.max(0, matrix[sourceIndex][targetIndex]) * (1 + liquidity.marginAddOn);
  });
  const nodeImpacts = uniquePortfolioIds.map((assetId, rowIndex) => {
    const propagatedImpact = direct.reduce((acc, impact, columnIndex) => {
      if (columnIndex === rowIndex) return acc;
      return acc + impact * Math.max(0, matrix[columnIndex][rowIndex]) * 0.35;
    }, 0);
    return {
      assetId,
      directImpact: direct[rowIndex],
      propagatedImpact,
      totalImpact: direct[rowIndex] + propagatedImpact,
    };
  });
  const edges = uniquePortfolioIds.flatMap((sourceId, rowIndex) =>
    uniquePortfolioIds
      .map((targetId, colIndex) => ({ sourceId, targetId, value: matrix[rowIndex][colIndex] }))
      .filter((edge) => edge.sourceId !== edge.targetId && Math.abs(edge.value) >= 0.35)
      .map((edge) => ({ sourceId: edge.sourceId, targetId: edge.targetId, weight: Math.max(0, edge.value) }))
  );

  return {
    pearsonCorrelation: pearson,
    downsideCorrelation,
    upsideCorrelation,
    downsideFlag: downsideCorrelation >= 0.75,
    rolling,
    dccGarch,
    tail,
    jumpGap: {
      jumpEventCount,
      jumpToDefaultProbability,
      gapEventCount: gapEvents,
      worstGap: Math.min(quantile(gapA.slice(-windowSize), 0.01), quantile(gapB.slice(-windowSize), 0.01)),
    },
    backtest,
    crisisReplay,
    heatmap,
    contagion: {
      sourceAssetId: assetA.id,
      assumedShock: -0.2,
      nodeImpacts: nodeImpacts.sort((left, right) => Math.abs(right.totalImpact) - Math.abs(left.totalImpact)),
      edges,
    },
    stressVar,
    narrative: createNarrative(assetA, { plain: pearson, down: downsideCorrelation }, tail, backtest.pass),
    liquidityProfiles,
  };
}
