import {
  DiscoverRequestSchema,
  DiscoverResponseSchema,
  type DiscoverRequest,
} from "@/lib/contracts/universal-asset-schemas";
import { runDiscover } from "@/lib/services/discover-service";

export const dynamic = "force-dynamic";

function buildRequestFromQuery(url: URL): DiscoverRequest {
  const horizon = url.searchParams.get("horizon");
  const minMarketCap = url.searchParams.get("minMarketCap");
  const weightsRaw = url.searchParams.get("weights");
  const profileWeights = (() => {
    if (!weightsRaw) return {};
    try {
      const parsed = JSON.parse(weightsRaw) as Record<string, unknown>;
      return parsed;
    } catch {
      return {};
    }
  })();

  const parsed = DiscoverRequestSchema.safeParse({
    horizon,
    profileWeights,
    macroFilter: true,
    minMarketCap,
  });

  if (!parsed.success) {
    throw new Error("INVALID_STREAM_QUERY");
  }

  return parsed.data;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const url = new URL(request.url);

  let discoverRequest: DiscoverRequest;
  try {
    discoverRequest = buildRequestFromQuery(url);
  } catch {
    return new Response(
      JSON.stringify({
        error: "Invalid discover stream query.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }

  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: string, payload: unknown) => {
        if (closed || cancelled) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };

      void runDiscover(
        discoverRequest,
        (progress) => {
          send("progress", progress);
        },
        () => closed || cancelled
      )
        .then((response) => {
          if (closed || cancelled) return;
          send("result", DiscoverResponseSchema.parse(response));
          closed = true;
          controller.close();
        })
        .catch((error: unknown) => {
          if (closed || cancelled) return;
          send("error", {
            message: error instanceof Error ? error.message : "Discover stream failed",
          });
          closed = true;
          controller.close();
        });
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
