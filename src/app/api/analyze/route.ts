import { NextResponse } from "next/server";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
} from "@/lib/contracts/universal-asset-schemas";
import { marketDataGateway } from "@/lib/gateways/market-data-gateway";
import { analyzeUniversalAssets } from "@/lib/services/universal-asset-analysis-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid analyze payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const analyzed = await analyzeUniversalAssets(parsed.data.assets, marketDataGateway, {
    timeHorizon: parsed.data.timeHorizon,
  });
  const unknownList = analyzed
    .filter((asset) => asset.class === AssetClass.Unknown)
    .map((asset) => asset.originalInput);

  const responsePayload = AnalyzeResponseSchema.parse({
    assets: analyzed,
    warnings: [
      ...(unknownList.length > 0
        ? [
            {
              level: "warning" as const,
              message: `Tanınmayan varlıklar: ${unknownList.join(", ")}. Geçerli varlıklar analiz edildi.`,
            },
          ]
        : []),
    ],
    meta: {
      mode: "realtime_gateway",
      provider: "Yahoo Finance MarketDataGateway",
      fetchedAtIso: new Date().toISOString(),
      note:
        `Skorlar canlı piyasa akışından üretilir. Model: analysis_engine_v2_quant. Zaman ufku: ${parsed.data.timeHorizon}. Veri yetersizliğinde fallback metadata alanını kontrol edin.`,
    },
  });

  return NextResponse.json(responsePayload, { status: 200 });
}

