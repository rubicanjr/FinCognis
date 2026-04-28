import { NextResponse } from "next/server";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
} from "@/lib/contracts/universal-asset-schemas";
import { marketDataGateway } from "@/lib/gateways/market-data-gateway";
import { analyzeUniversalAssets } from "@/lib/services/universal-asset-analysis-service";

export const dynamic = "force-dynamic";

function buildReturnContextWarnings(classes: Set<AssetClass>) {
  const warnings: Array<{ level: "info" | "warning"; message: string }> = [
    {
      level: "info",
      message:
        "Geçmiş Getiri Gücü, seçilen zaman dilimindeki risk ayarlı performansı yansıtır. Geçmiş performans gelecek performansı garanti etmez.",
    },
  ];

  if (classes.has(AssetClass.Equity)) {
    warnings.push({
      level: "info",
      message: "BIST hisseleri için getiri TL bazlı nominaldir; enflasyon ve kur etkisi ayrıca değerlendirilmelidir.",
    });
    warnings.push({
      level: "info",
      message: "Hisse getirisi hesaplarında temettü etkisi veri sağlayıcısına bağlıdır; metrik fiyat serisi odaklı yorumlanmalıdır.",
    });
  }
  if (classes.has(AssetClass.Crypto)) {
    warnings.push({
      level: "info",
      message: "Kripto varlıklarda yüksek oynaklık nedeniyle kısa vadeli Sharpe skoru hızlı değişebilir.",
    });
  }
  if (classes.has(AssetClass.FX)) {
    warnings.push({
      level: "info",
      message: "Döviz varlıklarında metrik yalnızca kur hareketini ölçer; faiz (carry) etkisi dahil değildir.",
    });
  }
  if (classes.has(AssetClass.Commodity)) {
    warnings.push({
      level: "info",
      message: "Emtia varlıklarında mümkün olduğunda spot fiyat serileri kullanılır; vadeli kontratlarda dönemsel geçiş etkisi olabilir.",
    });
  }

  return warnings;
}

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
  const classSet = new Set(analyzed.map((asset) => asset.class));
  const contextWarnings = buildReturnContextWarnings(classSet);

  const responsePayload = AnalyzeResponseSchema.parse({
    assets: analyzed,
    warnings: [
      ...contextWarnings,
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

