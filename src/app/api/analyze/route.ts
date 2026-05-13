import { NextResponse } from "next/server";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  type AnalyzeRequest,
} from "@/lib/contracts/universal-asset-schemas";
import { marketDataGateway } from "@/lib/gateways/market-data-gateway";
import { analyzeUniversalAssets } from "@/lib/services/universal-asset-analysis-service";

export const dynamic = "force-dynamic";

const ANALYZE_TIMEOUT_MS = Number(process.env.FINCOGNIS_ANALYZE_TIMEOUT_MS ?? "30000");

function timeoutFallbackMetrics(assetClass: AssetClass) {
  if (assetClass === AssetClass.Crypto) {
    return { risk: 4.8, return: 7.2, liquidity: 6.6, diversification: 5.5, calmness: 4.7 };
  }
  if (assetClass === AssetClass.Equity) {
    return { risk: 6.0, return: 6.8, liquidity: 6.4, diversification: 6.2, calmness: 5.9 };
  }
  if (assetClass === AssetClass.Commodity) {
    return { risk: 5.7, return: 6.1, liquidity: 6.0, diversification: 6.8, calmness: 5.6 };
  }
  if (assetClass === AssetClass.FX) {
    return { risk: 5.9, return: 5.7, liquidity: 6.5, diversification: 6.6, calmness: 6.0 };
  }
  if (assetClass === AssetClass.Bond) {
    return { risk: 6.9, return: 5.1, liquidity: 5.8, diversification: 7.0, calmness: 6.8 };
  }
  if (assetClass === AssetClass.Fund) {
    return { risk: 6.2, return: 6.0, liquidity: 6.2, diversification: 7.1, calmness: 6.2 };
  }
  if (assetClass === AssetClass.Index) {
    return { risk: 6.1, return: 6.2, liquidity: 6.4, diversification: 6.9, calmness: 6.1 };
  }

  return { risk: 5.8, return: 5.8, liquidity: 5.8, diversification: 5.8, calmness: 5.8 };
}

function createDiscoverTimeoutFallback(requestData: AnalyzeRequest) {
  const fallbackAssets = requestData.assets.slice(0, 20).map((asset) => ({
    symbol: asset.symbol,
    originalInput: asset.originalInput,
    class: asset.class,
    metrics: timeoutFallbackMetrics(asset.class),
    computation: {
      isFallback: true,
      fallbackReasons: ["discover_timeout"],
      modelVersion: "analysis_engine_v2_quant",
      timeHorizon: requestData.timeHorizon,
    },
  }));

  return AnalyzeResponseSchema.parse({
    assets: fallbackAssets,
    warnings: [
      {
        level: "warning",
        message:
          "Profil keşif isteği zaman sınırını aştı. Sonuçlar geçici fallback skorlarıyla üretildi; lütfen daha sonra tekrar deneyin.",
      },
    ],
    meta: {
      mode: "realtime_gateway",
      provider: "Yahoo Finance MarketDataGateway",
      fetchedAtIso: new Date().toISOString(),
      note:
        `Skorlar timeout fallback modunda üretildi. Mod: ${requestData.analysisMode}. Zaman ufku: ${requestData.timeHorizon}.`,
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("analyze_timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

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
        "Enflasyon Sonrası Gerçek Kazanç, nominal getiri ile enflasyon etkisinin Fisher denklemiyle ayrıştırılmasıyla hesaplanır.",
    },
    {
      level: "info",
      message:
        "Resmi enflasyon verisi geçici olarak alınamazsa, metrik kontrollü proxy enflasyon varsayımıyla devam eder ve fallback metadata alanında işaretlenir.",
    },
    {
      level: "info",
      message:
        "Portföy Dengeleme Gücü, seçilen zaman dilimindeki tarihsel korelasyonlara dayanır. Kriz dönemlerinde korelasyonlar yükselebilir ve dengeleme etkisi zayıflayabilir.",
    },
    {
      level: "info",
      message:
        "Piyasayı Geçme Gücü, Jensen's Alpha (CAPM) yaklaşımıyla hesaplanır; alfa istatistiksel olarak anlamlı değilse skor nötr/fallback görünür.",
    },
    {
      level: "info",
      message:
        "Piyasa Sakinlik Durumu, çoklu pencere volatilite (5/21/63/252), EWMA ve sınıf-içi yüzdeklik rejim sınırlarıyla hesaplanır.",
    },
  ];

  if (classes.has(AssetClass.Equity)) {
    warnings.push({
      level: "info",
      message: "BIST hisselerinde reel getiri hesaplamasında resmi TÜFE serisi kullanılır; yayımlanmayan son aylar için tahmini değer devreye girebilir.",
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
      message: "Kripto varlıklarda reel kazanç hesabı USD fiyat getirisi + USDTRY kur etkisi üzerinden TL bazına çevrilerek yapılır.",
    });
    warnings.push({
      level: "info",
      message: "Kripto varlıklarda hisse senedi piyasalarıyla korelasyon rejimi zaman içinde değişebilir.",
    });
  }
  if (classes.has(AssetClass.FX)) {
    warnings.push({
      level: "info",
      message: "Döviz varlıklarında Enflasyon Sonrası Gerçek Kazanç, kur hareketinin TÜFE ile düzeltilmiş etkisini gösterir.",
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
    warnings.push({
      level: "info",
      message: "Yurt dışı varlıklarda vergi beyan yükümlülükleri değişebilir; reel kazanç yorumu kişisel vergi durumundan bağımsızdır.",
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

  let analyzed: Awaited<ReturnType<typeof analyzeUniversalAssets>>;
  try {
    analyzed = await withTimeout(
      analyzeUniversalAssets(parsed.data.assets, marketDataGateway, {
        timeHorizon: parsed.data.timeHorizon,
        analysisMode: parsed.data.analysisMode,
      }),
      ANALYZE_TIMEOUT_MS
    );
  } catch (error) {
    const isTimeout = error instanceof Error && error.message === "analyze_timeout";

    if (isTimeout && parsed.data.analysisMode === "discover") {
      const fallbackPayload = createDiscoverTimeoutFallback(parsed.data);
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: { "x-fincognis-discover-fallback": "timeout" },
      });
    }

    return NextResponse.json(
      {
        error: isTimeout ? "Analyze request timed out." : "Analyze request failed.",
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
  const classSet = new Set(analyzed.map((asset) => asset.class));
  const contextWarnings = buildReturnContextWarnings(classSet);

  const responsePayload = AnalyzeResponseSchema.parse({
    assets: analyzed,
    warnings: [
      ...contextWarnings,
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

