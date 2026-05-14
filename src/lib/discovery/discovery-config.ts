const DEFAULT_DISCOVERY_BACKEND_TIMEOUT_MS = 60_000;
const DEFAULT_DISCOVERY_RETRY_COUNT = 1;
const DEFAULT_DISCOVERY_RETRY_BASE_DELAY_MS = 600;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDiscoveryBackendTimeoutMs(): number {
  return parsePositiveInt(process.env.FINCOGNIS_DISCOVERY_BACKEND_TIMEOUT_MS, DEFAULT_DISCOVERY_BACKEND_TIMEOUT_MS);
}

export function getDiscoveryRetryCount(): number {
  return parsePositiveInt(process.env.FINCOGNIS_DISCOVERY_RETRY_COUNT, DEFAULT_DISCOVERY_RETRY_COUNT);
}

export function getDiscoveryRetryBaseDelayMs(): number {
  return parsePositiveInt(process.env.FINCOGNIS_DISCOVERY_RETRY_BASE_DELAY_MS, DEFAULT_DISCOVERY_RETRY_BASE_DELAY_MS);
}
