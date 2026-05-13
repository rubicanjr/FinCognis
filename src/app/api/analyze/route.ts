import { NextResponse } from "next/server";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  type AnalyzeRequest,
  type AnalyzeResponse,
} from "@/lib/contracts/universal-asset-schemas";
import { DiscoveryJobAcceptedSchema } from "@/lib/contracts/discover-job-schemas";
import { marketDataGateway } from "@/lib/gateways/market-data-gateway";
import { filterDiscoverableStockAssets } from "@/lib/services/discovery-asset-filter";
import { analyzeUniversalAssets } from "@/lib/services/universal-asset-analysis-service";
import { createOrReuseDiscoverJob } from "@/lib/services/discovery-engine";

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

function toAnalyzeResponse(requestData: AnalyzeRequest, analyzed: Awaited<ReturnType<typeof analyzeUniversalAssets>>): AnalyzeResponse {
  const classSet = new Set(analyzed.map((asset) => asset.class));
  const contextWarnings = buildReturnContextWarnings(classSet);

  return AnalyzeResponseSchema.parse({
    assets: analyzed,
    warnings: [...contextWarnings],
    meta: {
      mode: "realtime_gateway",
      provider: "Yahoo Finance MarketDataGateway",
      fetchedAtIso: new Date().toISOString(),
      note:
        `Skorlar canlı piyasa akışından üretilir. Model: analysis_engine_v2_quant. Mod: ${requestData.analysisMode}. Zaman ufku: ${requestData.timeHorizon}. Veri yetersizliğinde fallback metadata alanını kontrol edin.`,
    },
  });
}

async function analyzeAndBuildResponse(requestData: AnalyzeRequest): Promise<AnalyzeResponse> {
  const analyzed = await analyzeUniversalAssets(requestData.assets, marketDataGateway, {
    timeHorizon: requestData.timeHorizon,
    analysisMode: requestData.analysisMode,
  });
  return toAnalyzeResponse(requestData, analyzed);
}

async function handleDiscover(requestData: AnalyzeRequest): Promise<NextResponse> {
  const filteredAssets = filterDiscoverableStockAssets(requestData.assets);
  if (filteredAssets.length === 0) {
    return NextResponse.json(
      {
        error: "Profil keşfi için yalnızca BIST ve ABD hisse varlıkları kullanılabilir.",
      },
      { status: 422 }
    );
  }

  const filteredRequestData: AnalyzeRequest = {
    ...requestData,
    assets: filteredAssets,
  };

  const jobResult = createOrReuseDiscoverJob(filteredRequestData, () => analyzeAndBuildResponse(filteredRequestData));

  if (jobResult.mode === "cached" && jobResult.cached) {
    return NextResponse.json(jobResult.cached, { status: 200, headers: { "x-fincognis-discover-cache": "hit" } });
  }

  const accepted = DiscoveryJobAcceptedSchema.parse({
    jobId: jobResult.job.id,
    statusEndpoint: `/api/analyze/status/${jobResult.job.id}`,
    status: jobResult.job.status,
    progress: jobResult.job.progress,
    expiresAt: jobResult.job.expiresAt,
  });

  return NextResponse.json(accepted, { status: 202 });
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

  const requestData = parsed.data;
  if (requestData.analysisMode === "discover") {
    return handleDiscover(requestData);
  }

  try {
    const responsePayload = await analyzeAndBuildResponse(requestData);
    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Analyze request failed.",
      },
      { status: 500 }
    );
  }
}

