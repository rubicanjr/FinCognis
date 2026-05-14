import { describe, expect, it } from "vitest";
import {
  atrToScore,
  calcAtr,
  calcMacdWithVolume,
  calcRsi,
  calcShortTermTechnicalScore,
  calcSmaPosition,
  macdVolumeToScore,
  rsiToScore,
  smaToScore,
} from "@/lib/analysis/technical-indicators";

describe("technical indicators", () => {
  it("computes Wilder RSI only when at least period + 1 closes exist", () => {
    expect(calcRsi(Array.from({ length: 14 }, (_, index) => 100 + index))).toBeNull();

    const rsi = calcRsi(Array.from({ length: 15 }, (_, index) => 100 + index));

    expect(rsi).toBe(100);
    expect(rsiToScore(rsi)).toBe(0.1);
    expect(rsiToScore(50)).toBe(1.0);
    expect(rsiToScore(null)).toBeNull();
  });

  it("computes MACD with volume confirmation and no fallback when data is insufficient", () => {
    expect(calcMacdWithVolume(Array.from({ length: 34 }, (_, index) => 100 + index), [])).toBeNull();

    const closes = Array.from({ length: 40 }, (_, index) => 100 + index * index * 0.05);
    const volumes = Array.from({ length: 40 }, (_, index) => (index >= 35 ? 250 : 100));
    const macd = calcMacdWithVolume(closes, volumes);

    expect(macd).not.toBeNull();
    expect(macd?.volumeConfirmed).toBe(true);
    expect(macd?.macdAboveSignal).toBe(true);
    expect(macdVolumeToScore(macd)).toBeGreaterThanOrEqual(0.55);
  });

  it("computes SMA trend position only when 205 closes exist", () => {
    expect(calcSmaPosition(Array.from({ length: 204 }, (_, index) => 100 + index))).toBeNull();

    const closes = [
      ...Array.from({ length: 150 }, () => 100),
      ...Array.from({ length: 55 }, (_, index) => 101 + index),
    ];
    const position = calcSmaPosition(closes);

    expect(position).not.toBeNull();
    expect(position?.priceAbove50).toBe(true);
    expect(position?.sma50Above200).toBe(true);
    expect(smaToScore(position)).toBeGreaterThan(0.5);
  });

  it("computes ATR percentage and scores only against a provided universe", () => {
    const close = Array.from({ length: 15 }, (_, index) => 100 + index * 0.2);
    const high = close.map((value) => value + 2);
    const low = close.map((value) => value - 2);
    const atr = calcAtr(high, low, close);

    expect(calcAtr(high.slice(0, 14), low.slice(0, 14), close.slice(0, 14))).toBeNull();
    expect(atr).not.toBeNull();
    expect(atr?.atrPct).toBeGreaterThan(0);
    expect(atrToScore(atr, [])).toBeNull();
    expect(atrToScore(atr, [0.005, 0.015, 0.025, 0.035, 0.045])).not.toBeNull();
  });

  it("returns null aggregate score instead of fabricated fallback when all inputs are missing", () => {
    const score = calcShortTermTechnicalScore({
      close: [],
      high: [],
      low: [],
      volume: [],
      universeAtrPcts: [],
    });

    expect(score.technicalMomentumScore).toBeNull();
    expect(score.achievedMax).toBe(0);
    expect(score.maxPossible).toBe(70);
    expect(score.missing).toEqual(["rsi", "macd", "sma", "atr", "earnings", "kap"]);
    expect(score.components).toEqual({});
  });
});
