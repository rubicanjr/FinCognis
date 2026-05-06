export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / (values.length - 1);
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
  let total = 0;
  for (let i = 0; i < size; i += 1) {
    total += (l[i] - ml) * (r[i] - mr);
  }
  return total / (size - 1);
}

export function correlation(left: number[], right: number[]): number {
  const cov = covariance(left, right);
  const sigmaLeft = stdDev(left);
  const sigmaRight = stdDev(right);
  if (sigmaLeft <= 0 || sigmaRight <= 0) return 0;
  return clamp(cov / (sigmaLeft * sigmaRight), -0.999, 0.999);
}

export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp((sorted.length - 1) * q, 0, sorted.length - 1);
  const floor = Math.floor(index);
  const ceil = Math.ceil(index);
  if (floor === ceil) return sorted[floor];
  const alpha = index - floor;
  return sorted[floor] * (1 - alpha) + sorted[ceil] * alpha;
}

export function createSeededRng(seed: number): () => number {
  let current = seed >>> 0;
  return function seeded() {
    current += 0x6d2b79f5;
    let temp = current;
    temp = Math.imul(temp ^ (temp >>> 15), temp | 1);
    temp ^= temp + Math.imul(temp ^ (temp >>> 7), temp | 61);
    return ((temp ^ (temp >>> 14)) >>> 0) / 4294967296;
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
  const chi = Math.sqrt(sum / Math.max(df, 1));
  return normal / Math.max(chi, 1e-9);
}

export function cholesky(matrix: number[][]): number[][] {
  const size = matrix.length;
  const lower = Array.from({ length: size }, () => Array(size).fill(0));

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = 0;
      for (let k = 0; k < j; k += 1) {
        sum += lower[i][k] * lower[j][k];
      }

      if (i === j) {
        lower[i][j] = Math.sqrt(Math.max(matrix[i][i] - sum, 1e-9));
      } else {
        lower[i][j] = (matrix[i][j] - sum) / Math.max(lower[j][j], 1e-9);
      }
    }
  }

  return lower;
}

export function shuffleInBlocks(values: number[], blockSize: number, rng: () => number): number[] {
  if (values.length <= blockSize) return [...values];
  const blocks: number[][] = [];
  for (let i = 0; i < values.length; i += blockSize) {
    blocks.push(values.slice(i, i + blockSize));
  }
  for (let i = blocks.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  }
  return blocks.flat();
}

export function pcaFirstComponentShare(matrix: number[][]): number {
  const size = matrix.length;
  if (size === 0) return 0;
  let vector = Array(size).fill(1 / Math.sqrt(size));

  for (let iter = 0; iter < 16; iter += 1) {
    const next = matrix.map((row) =>
      row.reduce((acc, value, index) => acc + value * vector[index], 0)
    );
    const norm = Math.sqrt(next.reduce((acc, value) => acc + value ** 2, 0));
    vector = norm > 0 ? next.map((value) => value / norm) : vector;
  }

  const lambda = vector.reduce((accRow, valueI, i) => {
    return (
      accRow +
      valueI *
        matrix[i].reduce((accCol, valueIJ, j) => accCol + valueIJ * vector[j], 0)
    );
  }, 0);

  const trace = matrix.reduce((acc, row, index) => acc + Math.max(row[index], 0), 0);
  if (trace <= 0) return 0;
  return clamp(lambda / trace, 0, 1);
}
