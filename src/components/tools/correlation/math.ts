export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mu = mean(values);
  return values.reduce((acc, value) => acc + (value - mu) ** 2, 0) / (values.length - 1);
}

export function stdDev(values: number[]): number {
  return Math.sqrt(Math.max(variance(values), 0));
}

export function covariance(left: number[], right: number[]): number {
  const size = Math.min(left.length, right.length);
  if (size < 2) return 0;
  const l = left.slice(left.length - size);
  const r = right.slice(right.length - size);
  const ml = mean(l);
  const mr = mean(r);

  let sum = 0;
  for (let index = 0; index < size; index += 1) {
    sum += (l[index] - ml) * (r[index] - mr);
  }
  return sum / (size - 1);
}

export function correlation(left: number[], right: number[]): number {
  const cov = covariance(left, right);
  const sigL = stdDev(left);
  const sigR = stdDev(right);
  if (sigL <= 0 || sigR <= 0) return 0;
  return clamp(cov / (sigL * sigR), -0.999, 0.999);
}

export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp((sorted.length - 1) * q, 0, sorted.length - 1);
  const floor = Math.floor(index);
  const ceil = Math.ceil(index);
  if (floor === ceil) return sorted[floor];
  const ratio = index - floor;
  return sorted[floor] * (1 - ratio) + sorted[ceil] * ratio;
}

export function toRanks(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = Array(values.length).fill(0);
  indexed.forEach((item, rankIndex) => {
    ranks[item.index] = (rankIndex + 1) / (values.length + 1);
  });
  return ranks;
}

export function rollingCorrelation(left: number[], right: number[], windowSize: number): number[] {
  const size = Math.min(left.length, right.length);
  if (windowSize <= 1 || size < windowSize) return [];
  const result: number[] = [];
  for (let index = windowSize; index <= size; index += 1) {
    const l = left.slice(index - windowSize, index);
    const r = right.slice(index - windowSize, index);
    result.push(correlation(l, r));
  }
  return result;
}

export function erf(value: number): number {
  const sign = value >= 0 ? 1 : -1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  return sign * y;
}

export function createSeededRng(seed: number): () => number {
  let current = seed >>> 0;
  return function seededRng() {
    current += 0x6d2b79f5;
    let t = current;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function studentT(rng: () => number, df: number): number {
  const normal = gaussian(rng);
  let sum = 0;
  for (let i = 0; i < df; i += 1) {
    const z = gaussian(rng);
    sum += z * z;
  }
  const chi = Math.sqrt(sum / df);
  return normal / Math.max(chi, 1e-8);
}

export function cholesky(matrix: number[][]): number[][] {
  const size = matrix.length;
  const result = Array.from({ length: size }, () => Array(size).fill(0));

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      let sum = 0;
      for (let k = 0; k < col; k += 1) {
        sum += result[row][k] * result[col][k];
      }

      if (row === col) {
        result[row][col] = Math.sqrt(Math.max(matrix[row][row] - sum, 1e-9));
      } else {
        result[row][col] = (matrix[row][col] - sum) / Math.max(result[col][col], 1e-9);
      }
    }
  }

  return result;
}
