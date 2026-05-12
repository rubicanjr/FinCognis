export function computeCriteriaTotal(values: ReadonlyArray<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numeric.length === 0) return null;
  return Number(numeric.reduce((sum, value) => sum + value, 0).toFixed(1));
}
