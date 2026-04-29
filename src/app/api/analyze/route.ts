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
    {
      level: "info",
      message:
        "Likidite skoru normal piyasa koşullarında geçerlidir. Kriz dönemlerinde tüm varlık sınıflarında likidite belirgin biçimde düşebilir.",
    },
    {
      level: "info",
      message:
        "Portföy Dengeleme Gücü, seçilen zaman dilimindeki tarihsel korelasyonlara dayanır. Kriz dönemlerinde korelasyonlar yükselebilir ve dengeleme etkisi zayıflayabilir.",
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
    warnings.push({
      level: "info",
      message: "Kripto likiditesi spot borsa verileriyle ölçülür; büyük tutarlı işlemlerde OTC fiyatlaması farklılaşabilir.",
    });
    warnings.push({
      level: "info",
      message: "Kripto varlıklarda hisse senedi piyasalarıyla korelasyon rejimi zaman içinde değişebilir.",
    });
  }
  if (classes.has(AssetClass.FX)) {
    warnings.push({
      level: "info",
      message: "Döviz varlıklarında metrik yalnızca kur hareketini ölçer; faiz (carry) etkisi dahil değildir.",
    });
    warnings.push({
      level: "info",
      message: "TRY bazlı döviz işlemlerinde düzenleyici limitler dönemsel likidite kısıtı oluşturabilir.",
    });
    warnings.push({
      level: "info",
      message: "Döviz varlıklarında merkez bankası müdahaleleri dönemsel korelasyon rejimini etkileyebilir.",
    });
  }
  if (classes.has(AssetClass.Commodity)) {
    warnings.push({
      level: "info",
      message: "Emtia varlıklarında mümkün olduğunda spot fiyat serileri kullanılır; vadeli kontratlarda dönemsel geçiş etkisi olabilir.",
    });
    warnings.push({
      level: "info",
      message: "Altın gibi emtialarda likidite krizlerinde kısa vadeli korelasyon artabilir; dengeleme skoru rejime göre değişebilir.",
    });
  }
  if (classes.has(AssetClass.Equity)) {
    warnings.push({
      level: "info",
      message: "BIST varlıklarında seans dışı ve hafta sonu nakde çevrim mümkün değildir.",
    });
    warnings.push({
      level: "info",
      message: "BIST içi korelasyonlar stres dönemlerinde yükselme eğilimindedir; dengeleme skoru dönemsel olarak düşebilir.",
    });
  }
  if (classes.has(AssetClass.Fund)) {
    warnings.push({
      level: "info",
      message: "Fon ürünlerinde valör (T+2/T+3) nedeniyle nakde çevrim anlık gerçekleşmeyebilir.",
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
    analysisMode: parsed.data.analysisMode,
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
        `Skorlar canlı piyasa akışından üretilir. Model: analysis_engine_v2_quant. Mod: ${parsed.data.analysisMode}. Zaman ufku: ${parsed.data.timeHorizon}. Veri yetersizliğinde fallback metadata alanını kontrol edin.`,
    },
  });

  return NextResponse.json(responsePayload, { status: 200 });
}

