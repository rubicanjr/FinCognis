export type PreferenceLevel = "low" | "medium" | "high";

export interface MetricWeights {
  risk: number;
  return: number;
  liquidity: number;
  diversification: number;
}

export interface ProfileCriteriaDefaults {
  riskSensitivity: PreferenceLevel;
  returnExpectation: PreferenceLevel;
  liquidityNeed: PreferenceLevel;
  diversificationGoal: PreferenceLevel;
}

export type ProfilePresetKey =
  | "low_risk_high_liquidity"
  | "high_liquidity"
  | "strong_diversification"
  | "high_return_potential"
  | "balanced"
  | "short_term_low_volatility"
  | "portfolio_diversification_focused";

export interface ProfilePresetDefinition {
  key: ProfilePresetKey;
  label: string;
  summary: string;
  weights: MetricWeights;
  defaults: ProfileCriteriaDefaults;
}

export const PROFILE_DISCOVERY_PRESET_ORDER: ProfilePresetKey[] = [
  "low_risk_high_liquidity",
  "high_liquidity",
  "strong_diversification",
  "high_return_potential",
  "balanced",
  "short_term_low_volatility",
  "portfolio_diversification_focused",
];

export const PROFILE_DISCOVERY_PRESETS: Record<ProfilePresetKey, ProfilePresetDefinition> = {
  low_risk_high_liquidity: {
    key: "low_risk_high_liquidity",
    label: "Daha düşük risk düzeyi + yüksek nakde çevirme kolaylığı",
    summary: "Risk hassasiyeti ve nakde çevirme ihtiyacı yüksek profiller için genel eşleştirme.",
    weights: { risk: 45, liquidity: 35, return: 10, diversification: 10 },
    defaults: {
      riskSensitivity: "high",
      returnExpectation: "medium",
      liquidityNeed: "high",
      diversificationGoal: "medium",
    },
  },
  high_liquidity: {
    key: "high_liquidity",
    label: "Daha yüksek nakde çevirme kolaylığı",
    summary: "Nakde çevirme kolaylığı odaklı karar öncesi tarama görünümü.",
    weights: { risk: 20, liquidity: 45, return: 20, diversification: 15 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "high",
      diversificationGoal: "medium",
    },
  },
  strong_diversification: {
    key: "strong_diversification",
    label: "Daha güçlü portföy dengeleme katkısı",
    summary: "Portföy dengeleme gücü yüksek olabilecek profiller için karşılaştırmalı sınıflandırma.",
    weights: { risk: 20, liquidity: 15, return: 15, diversification: 50 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "medium",
      diversificationGoal: "high",
    },
  },
  high_return_potential: {
    key: "high_return_potential",
    label: "Daha yüksek kazanç potansiyeli",
    summary: "Kazanç potansiyeli odaklı profiller için genel eşleştirme.",
    weights: { risk: 20, liquidity: 15, return: 50, diversification: 15 },
    defaults: {
      riskSensitivity: "low",
      returnExpectation: "high",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  balanced: {
    key: "balanced",
    label: "Dengeli profil",
    summary: "Risk düzeyi, kazanç potansiyeli, nakde çevirme kolaylığı ve portföy dengeleme gücü arasında dengeli görünüm.",
    weights: { risk: 25, liquidity: 25, return: 25, diversification: 25 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "medium",
      diversificationGoal: "medium",
    },
  },
  short_term_low_volatility: {
    key: "short_term_low_volatility",
    label: "Kısa vadeli oynaklık hassasiyeti düşük",
    summary: "Kısa vadede daha düşük oynaklık arayan profiller için eşleştirme.",
    weights: { risk: 50, liquidity: 30, return: 10, diversification: 10 },
    defaults: {
      riskSensitivity: "high",
      returnExpectation: "low",
      liquidityNeed: "high",
      diversificationGoal: "medium",
    },
  },
  portfolio_diversification_focused: {
    key: "portfolio_diversification_focused",
    label: "Portföy dengeleme odaklı",
    summary: "Portföy dağılım etkisi odaklı genel profil eşleştirmesi.",
    weights: { risk: 20, liquidity: 15, return: 15, diversification: 50 },
    defaults: {
      riskSensitivity: "medium",
      returnExpectation: "medium",
      liquidityNeed: "medium",
      diversificationGoal: "high",
    },
  },
};

export const DEFAULT_PROFILE_PRESET_KEY: ProfilePresetKey = "balanced";
