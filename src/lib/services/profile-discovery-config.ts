export type PreferenceLevel = "low" | "medium" | "high";

export type ProfileTimeHorizon = "1mo" | "1y";

export interface MetricWeights {
  risk: number;
  return: number;
  liquidity: number;
  diversification: number;
  calmness: number;
}

export interface ProfileCriteriaDefaults {
  riskSensitivity: PreferenceLevel;
  returnExpectation: PreferenceLevel;
  liquidityNeed: PreferenceLevel;
  diversificationGoal: PreferenceLevel;
}

export interface ProfileFieldOption {
  value: PreferenceLevel;
  label: string;
}

export interface ProfileFieldConfig {
  field: keyof ProfileCriteriaDefaults;
  label: string;
  options: ProfileFieldOption[];
}

export type ProfilePresetKey =
  | "kisa_dengeli"
  | "kisa_hizli_hareket"
  | "kisa_kurumsal_takip"
  | "kisa_katalizor_odak"
  | "kisa_teknik_kurumsal_teyit"
  | "kisa_dusuk_gurultu"
  | "uzun_dengeli"
  | "uzun_kaliteli_sirket"
  | "uzun_ucuz_hisse"
  | "uzun_enflasyona_karsi"
  | "uzun_sermaye_disiplini"
  | "uzun_bist_ozgu_firsat"
  | "uzun_kalite_uygun_fiyat";

export interface ProfilePresetDefinition {
  key: ProfilePresetKey;
  horizon: ProfileTimeHorizon;
  label: string;
  summary: string;
  weightDescription: string;
  weights: MetricWeights;
  defaults: ProfileCriteriaDefaults;
}

const SHORT_DISCOVERY_PRESET_ORDER: ProfilePresetKey[] = [
  "kisa_dengeli",
  "kisa_hizli_hareket",
  "kisa_kurumsal_takip",
  "kisa_katalizor_odak",
  "kisa_teknik_kurumsal_teyit",
  "kisa_dusuk_gurultu",
];

const LONG_DISCOVERY_PRESET_ORDER: ProfilePresetKey[] = [
  "uzun_dengeli",
  "uzun_kaliteli_sirket",
  "uzun_ucuz_hisse",
  "uzun_enflasyona_karsi",
  "uzun_sermaye_disiplini",
  "uzun_bist_ozgu_firsat",
  "uzun_kalite_uygun_fiyat",
];

export const PROFILE_DISCOVERY_PRESETS: Record<ProfilePresetKey, ProfilePresetDefinition> = {
  kisa_dengeli: {
    key: "kisa_dengeli",
    horizon: "1mo",
    label: "Dengeli",
    summary: "Teknik Momentum, Kurumsal Akış ve Katalizör Takvimi dengeli okunur.",
    weightDescription: "Teknik Momentum %34 + Kurumsal Akış %33 + Katalizör Takvimi %33",
    weights: { risk: 0, return: 34, liquidity: 33, diversification: 0, calmness: 33 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  kisa_hizli_hareket: {
    key: "kisa_hizli_hareket",
    horizon: "1mo",
    label: "Hızlı Hareket Yakalıyorum",
    summary: "Güçlü momentum ve yakın katalizör fırsatlarına odaklanır.",
    weightDescription: "Teknik Momentum %65 + Katalizör Takvimi %25 + Kurumsal Akış %10",
    weights: { risk: 0, return: 65, liquidity: 10, diversification: 0, calmness: 25 },
    defaults: {
      riskSensitivity: "high",
      returnExpectation: "low",
      liquidityNeed: "medium",
      diversificationGoal: "high",
    },
  },
  kisa_kurumsal_takip: {
    key: "kisa_kurumsal_takip",
    horizon: "1mo",
    label: "Kurumsal Takip Ediyorum",
    summary: "Kurumsal para akışı teyidini ana karar sinyali olarak kullanır.",
    weightDescription: "Kurumsal Akış %65 + Teknik Momentum %20 + Katalizör Takvimi %15",
    weights: { risk: 0, return: 20, liquidity: 65, diversification: 0, calmness: 15 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "medium",
      diversificationGoal: "low",
    },
  },
  kisa_katalizor_odak: {
    key: "kisa_katalizor_odak",
    horizon: "1mo",
    label: "Katalizör Odaklıyım",
    summary: "Yakın tarihli katalizör olaylarını önceliklendiren kısa vade yaklaşımıdır.",
    weightDescription: "Katalizör Takvimi %65 + Kurumsal Akış %25 + Teknik Momentum %10",
    weights: { risk: 0, return: 10, liquidity: 25, diversification: 0, calmness: 65 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "low",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  kisa_teknik_kurumsal_teyit: {
    key: "kisa_teknik_kurumsal_teyit",
    horizon: "1mo",
    label: "Teknik + Kurumsal Teyit",
    summary: "Teknik kırılım ve kurumsal akış sinyallerinin ortak teyidini arar.",
    weightDescription: "Teknik Momentum %50 + Kurumsal Akış %40 + Katalizör Takvimi %10",
    weights: { risk: 0, return: 50, liquidity: 40, diversification: 0, calmness: 10 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  kisa_dusuk_gurultu: {
    key: "kisa_dusuk_gurultu",
    horizon: "1mo",
    label: "Düşük Gürültü",
    summary: "Aşırı dalgalanmayı filtreleyip kurumsal teyitli kısa vade fırsatları arar.",
    weightDescription: "Kurumsal Akış %50 + Katalizör Takvimi %35 + Teknik Momentum %15",
    weights: { risk: 0, return: 15, liquidity: 50, diversification: 0, calmness: 35 },
    defaults: {
      riskSensitivity: "low",
      returnExpectation: "medium",
      liquidityNeed: "medium",
      diversificationGoal: "low",
    },
  },
  uzun_dengeli: {
    key: "uzun_dengeli",
    horizon: "1y",
    label: "Dengeli",
    summary: "Uzun vadede dört ana metrik birlikte okunur; tek bir metrik baskın değildir.",
    weightDescription: "Dört metrik eşit ağırlık (%25'er)",
    weights: { risk: 25, return: 25, liquidity: 25, diversification: 25, calmness: 0 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  uzun_kaliteli_sirket: {
    key: "uzun_kaliteli_sirket",
    horizon: "1y",
    label: "Kaliteli Şirket Arıyorum",
    summary: "Sürdürülebilir kârlılık ve sermaye disiplini odağında uzun vade seçim yapar.",
    weightDescription: "Kazanç Kalitesi %50 + Sermaye Tahsisi %30 + Değerleme %10 + BIST Özgü %10",
    weights: { risk: 10, return: 50, liquidity: 10, diversification: 30, calmness: 0 },
    defaults: {
      riskSensitivity: "low",
      returnExpectation: "high",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  uzun_ucuz_hisse: {
    key: "uzun_ucuz_hisse",
    horizon: "1y",
    label: "Ucuz Hisse Arıyorum",
    summary: "Değerleme iskontosu yüksek varlıkları uzun vade filtresinden geçirir.",
    weightDescription: "Değerleme %55 + Kazanç Kalitesi %25 + BIST Özgü %15 + Sermaye Tahsisi %5",
    weights: { risk: 55, return: 25, liquidity: 15, diversification: 5, calmness: 0 },
    defaults: {
      riskSensitivity: "high",
      returnExpectation: "low",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  uzun_enflasyona_karsi: {
    key: "uzun_enflasyona_karsi",
    horizon: "1y",
    label: "Enflasyona Karşı Kazanayım",
    summary: "BIST'e özgü döngü avantajlarını ve kaliteyi birlikte değerlendirir.",
    weightDescription: "BIST Özgü %50 + Kazanç Kalitesi %25 + Değerleme %15 + Sermaye Tahsisi %10",
    weights: { risk: 15, return: 25, liquidity: 50, diversification: 10, calmness: 0 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "high",
      diversificationGoal: "high",
    },
  },
  uzun_sermaye_disiplini: {
    key: "uzun_sermaye_disiplini",
    horizon: "1y",
    label: "Sermaye Disiplini Önceliğim",
    summary: "Sermaye tahsisi kalitesi güçlü şirketleri ön plana alır.",
    weightDescription: "Sermaye Tahsisi %55 + Kazanç Kalitesi %30 + Değerleme %10 + BIST Özgü %5",
    weights: { risk: 10, return: 30, liquidity: 5, diversification: 55, calmness: 0 },
    defaults: {
      riskSensitivity: "low",
      returnExpectation: "high",
      liquidityNeed: "low",
      diversificationGoal: "medium",
    },
  },
  uzun_bist_ozgu_firsat: {
    key: "uzun_bist_ozgu_firsat",
    horizon: "1y",
    label: "BIST'e Özgü Fırsat",
    summary: "Piyasa koşullarına duyarlı BIST özgü fırsatları uzun vadede filtreler.",
    weightDescription: "BIST Özgü %60 + Değerleme %20 + Kazanç Kalitesi %15 + Sermaye Tahsisi %5",
    weights: { risk: 20, return: 15, liquidity: 60, diversification: 5, calmness: 0 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "low",
      liquidityNeed: "high",
      diversificationGoal: "high",
    },
  },
  uzun_kalite_uygun_fiyat: {
    key: "uzun_kalite_uygun_fiyat",
    horizon: "1y",
    label: "Kalite + Uygun Fiyat",
    summary: "Kalite kriterleri ile değerleme dengesini birlikte arar.",
    weightDescription: "Kazanç Kalitesi %40 + Değerleme %35 + Sermaye Tahsisi %15 + BIST Özgü %10",
    weights: { risk: 35, return: 40, liquidity: 10, diversification: 15, calmness: 0 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "high",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
};

export const DEFAULT_PROFILE_PRESET_KEY: ProfilePresetKey = "uzun_dengeli";

function normalizeProfileHorizon(timeHorizon: string): ProfileTimeHorizon {
  return timeHorizon === "1mo" ? "1mo" : "1y";
}

export function getProfilePresetOrderByHorizon(timeHorizon: string): ProfilePresetKey[] {
  const normalized = normalizeProfileHorizon(timeHorizon);
  return normalized === "1mo" ? SHORT_DISCOVERY_PRESET_ORDER : LONG_DISCOVERY_PRESET_ORDER;
}

export function getDefaultProfilePresetKeyByHorizon(timeHorizon: string): ProfilePresetKey {
  const normalized = normalizeProfileHorizon(timeHorizon);
  return normalized === "1mo" ? "kisa_dengeli" : "uzun_dengeli";
}

const SHORT_TERM_FIELD_CONFIG: ProfileFieldConfig[] = [
  {
    field: "riskSensitivity",
    label: "Momentum Toleransı",
    options: [
      { value: "low", label: "Düşük: Sadece RSI 40-60 bandı + kurumsal teyitli" },
      { value: "medium", label: "Orta: Geniş momentum bandı kabul edilir" },
      { value: "high", label: "Yüksek: Güçlü momentum yeterli, kurumsal teyit şart değil" },
    ],
  },
  {
    field: "returnExpectation",
    label: "Katalizör Beklentisi",
    options: [
      { value: "low", label: "Yakın (7 gün içinde)" },
      { value: "medium", label: "Orta (7-30 gün)" },
      { value: "high", label: "Önemsiz" },
    ],
  },
  {
    field: "diversificationGoal",
    label: "Kurumsal Teyit Zorunluluğu",
    options: [
      { value: "low", label: "Zorunlu" },
      { value: "medium", label: "Tercih edilir" },
      { value: "high", label: "Önemsiz" },
    ],
  },
  {
    field: "liquidityNeed",
    label: "Nakde Çevirme Kolaylığı",
    options: [
      { value: "low", label: "Düşük" },
      { value: "medium", label: "Orta" },
      { value: "high", label: "Yüksek" },
    ],
  },
];

const LONG_TERM_FIELD_CONFIG: ProfileFieldConfig[] = [
  {
    field: "riskSensitivity",
    label: "Risk Hassasiyeti",
    options: [
      { value: "low", label: "Düşük: Yüksek kazanç kalitesi skoru zorunlu (min 7)" },
      { value: "medium", label: "Orta: Dengeli kriter seti" },
      { value: "high", label: "Yüksek: Değerleme iskontosuna odaklan, kalite ikincil" },
    ],
  },
  {
    field: "returnExpectation",
    label: "Büyüme Beklentisi",
    options: [
      { value: "low", label: "Değer odaklı (düşük F/K, tarihsel band dibi)" },
      { value: "medium", label: "Dengeli büyüme-değer" },
      { value: "high", label: "Büyüme odaklı (Kazanç Kalitesi + Sermaye Tahsisi ağırlıklı)" },
    ],
  },
  {
    field: "diversificationGoal",
    label: "Döviz Hassasiyeti",
    options: [
      { value: "low", label: "TL güçlenme senaryosu (ithalatçı/finansal ağırlıklı)" },
      { value: "medium", label: "Nötr" },
      { value: "high", label: "TL zayıflama senaryosu (ihracatçı/BIST özgü ağırlıklı)" },
    ],
  },
  {
    field: "liquidityNeed",
    label: "Minimum Piyasa Değeri",
    options: [
      { value: "low", label: "Büyük ölçekli (BIST 30)" },
      { value: "medium", label: "Orta ölçekli" },
      { value: "high", label: "Tüm ölçekler" },
    ],
  },
];

export function getProfileFieldConfigByHorizon(timeHorizon: string): ProfileFieldConfig[] {
  const normalized = normalizeProfileHorizon(timeHorizon);
  return normalized === "1mo" ? SHORT_TERM_FIELD_CONFIG : LONG_TERM_FIELD_CONFIG;
}
