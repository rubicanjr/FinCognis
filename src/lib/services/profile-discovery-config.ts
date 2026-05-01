export type PreferenceLevel = "low" | "medium" | "high";

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

export type ProfilePresetKey =
  | "dengeli"
  | "sermayemi_koruyayim"
  | "enflasyona_karsi_kazanayim"
  | "piyasayi_yenmek_istiyorum"
  | "verimli_kazanc"
  | "sakin_piyasa_ariyorum"
  | "uzun_vadeli_buyume";

export interface ProfilePresetDefinition {
  key: ProfilePresetKey;
  label: string;
  summary: string;
  weightDescription: string;
  weights: MetricWeights;
  defaults: ProfileCriteriaDefaults;
}

export const PROFILE_DISCOVERY_PRESET_ORDER: ProfilePresetKey[] = [
  "dengeli",
  "sermayemi_koruyayim",
  "enflasyona_karsi_kazanayim",
  "piyasayi_yenmek_istiyorum",
  "verimli_kazanc",
  "sakin_piyasa_ariyorum",
  "uzun_vadeli_buyume",
];

export const PROFILE_DISCOVERY_PRESETS: Record<ProfilePresetKey, ProfilePresetDefinition> = {
  dengeli: {
    key: "dengeli",
    label: "Dengeli",
    summary: "Beş metrik dengeli ağırlıkla okunur; tek bir metrik baskın değildir.",
    weightDescription: "Beş metrik eşit ağırlık",
    weights: { risk: 20, return: 20, liquidity: 20, diversification: 20, calmness: 20 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  sermayemi_koruyayim: {
    key: "sermayemi_koruyayim",
    label: "Sermayemi Koruyayım",
    summary: "Düşüş ve sakinlik önceliklidir; diğer metrikler destekleyici olarak değerlendirilir.",
    weightDescription: "En Kötü Düşüş %50 + Piyasa Sakinlik %30 + diğerleri %20",
    weights: { risk: 50, return: 8, liquidity: 6, diversification: 6, calmness: 30 },
    defaults: {
      riskSensitivity: "high",
      returnExpectation: "low",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  enflasyona_karsi_kazanayim: {
    key: "enflasyona_karsi_kazanayim",
    label: "Enflasyona Karşı Kazanayım",
    summary: "Reel kazanç önceliklidir; ikinci odak piyasaya göre görece güçtür.",
    weightDescription: "Enflasyon Sonrası Gerçek Kazanç %60 + Piyasayı Geçme %20 + diğerleri %20",
    weights: { risk: 8, return: 6, liquidity: 60, diversification: 20, calmness: 6 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "high",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  piyasayi_yenmek_istiyorum: {
    key: "piyasayi_yenmek_istiyorum",
    label: "Piyasayı Yenmek İstiyorum",
    summary: "Piyasa üstü performans ve riske göre verim önceliklendirilir.",
    weightDescription: "Piyasayı Geçme Gücü %50 + Riske Göre Kazanç %30 + diğerleri %20",
    weights: { risk: 8, return: 30, liquidity: 6, diversification: 50, calmness: 6 },
    defaults: {
      riskSensitivity: "low",
      returnExpectation: "high",
      liquidityNeed: "medium",
      diversificationGoal: "high",
    },
  },
  verimli_kazanc: {
    key: "verimli_kazanc",
    label: "Verimli Kazanç",
    summary: "Riske göre kazanç odaklıdır; büyük düşüş riski ikinci seviyede izlenir.",
    weightDescription: "Riske Göre Kazanç %60 + En Kötü Düşüş %20 + diğerleri %20",
    weights: { risk: 20, return: 60, liquidity: 7, diversification: 7, calmness: 6 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "high",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  sakin_piyasa_ariyorum: {
    key: "sakin_piyasa_ariyorum",
    label: "Sakin Piyasa Arıyorum",
    summary: "Piyasa sakinliği ve düşüş hassasiyetini önceleyen profildir.",
    weightDescription: "Piyasa Sakinlik Durumu %50 + En Kötü Düşüş %30 + diğerleri %20",
    weights: { risk: 30, return: 6, liquidity: 7, diversification: 7, calmness: 50 },
    defaults: {
      riskSensitivity: "high",
      returnExpectation: "low",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  uzun_vadeli_buyume: {
    key: "uzun_vadeli_buyume",
    label: "Uzun Vadeli Büyüme",
    summary: "Reel büyüme ve piyasaya göre görece güç odaklı uzun dönem yaklaşımıdır.",
    weightDescription: "Enflasyon Sonrası Gerçek Kazanç %40 + Piyasayı Geçme %40 + diğerleri %20",
    weights: { risk: 8, return: 8, liquidity: 40, diversification: 40, calmness: 4 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "high",
      liquidityNeed: "low",
      diversificationGoal: "high",
    },
  },
};

export const DEFAULT_PROFILE_PRESET_KEY: ProfilePresetKey = "dengeli";
