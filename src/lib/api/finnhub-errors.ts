export type FinnhubErrorCode =
  | "FINNHUB_MISSING_API_KEY"
  | "FINNHUB_RATE_LIMIT"
  | "FINNHUB_UNAUTHORIZED"
  | "FINNHUB_FORBIDDEN"
  | "FINNHUB_BAD_REQUEST"
  | "FINNHUB_TIMEOUT"
  | "FINNHUB_UPSTREAM_ERROR"
  | "FINNHUB_PARSE_ERROR"
  | "FINNHUB_SYMBOL_REQUIRED";

export class FinnhubError extends Error {
  public readonly code: FinnhubErrorCode;
  public readonly httpStatus: number | null;
  public readonly endpoint: string;
  public readonly details: Record<string, unknown>;

  constructor(args: {
    code: FinnhubErrorCode;
    message: string;
    endpoint: string;
    httpStatus?: number | null;
    details?: Record<string, unknown>;
  }) {
    super(args.message);
    this.name = "FinnhubError";
    this.code = args.code;
    this.httpStatus = args.httpStatus ?? null;
    this.endpoint = args.endpoint;
    this.details = args.details ?? {};
  }
}

export function mapHttpToFinnhubError(args: {
  endpoint: string;
  status: number;
  bodyPreview?: string;
}): FinnhubError {
  const { endpoint, status, bodyPreview } = args;

  if (status === 429) {
    return new FinnhubError({
      code: "FINNHUB_RATE_LIMIT",
      message: "Finnhub rate limit exceeded.",
      endpoint,
      httpStatus: status,
      details: { bodyPreview },
    });
  }

  if (status === 401) {
    return new FinnhubError({
      code: "FINNHUB_UNAUTHORIZED",
      message: "Finnhub API key is unauthorized.",
      endpoint,
      httpStatus: status,
      details: { bodyPreview },
    });
  }

  if (status === 403) {
    return new FinnhubError({
      code: "FINNHUB_FORBIDDEN",
      message: "Finnhub request is forbidden for this plan/endpoint.",
      endpoint,
      httpStatus: status,
      details: { bodyPreview },
    });
  }

  if (status >= 400 && status < 500) {
    return new FinnhubError({
      code: "FINNHUB_BAD_REQUEST",
      message: "Finnhub request was rejected as invalid.",
      endpoint,
      httpStatus: status,
      details: { bodyPreview },
    });
  }

  return new FinnhubError({
    code: "FINNHUB_UPSTREAM_ERROR",
    message: "Finnhub upstream returned a server error.",
    endpoint,
    httpStatus: status,
    details: { bodyPreview },
  });
}

export function logFinnhubError(error: unknown, context: Record<string, unknown>): void {
  if (error instanceof FinnhubError) {
    console.error("[FINNHUB_ERROR]", {
      code: error.code,
      message: error.message,
      endpoint: error.endpoint,
      httpStatus: error.httpStatus,
      details: error.details,
      context,
    });
    return;
  }

  console.error("[FINNHUB_UNKNOWN_ERROR]", {
    message: error instanceof Error ? error.message : String(error),
    context,
  });
}
