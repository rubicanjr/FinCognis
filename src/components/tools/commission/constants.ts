export const FEE_INFO = {
  commission: "Araci kurumun uyguladigi islem ucreti. Kademeli oran ile otomatik hesaplanir.",
  bsmv: "Banka ve Sigorta Muameleleri Vergisi. Genelde komisyon uzerinden %5 uygulanir.",
  bistPayi: "Borsa payi. Pay piyasasinda yuzbinde 2,5 seviyesinde olabilir.",
  takasbank: "Takas ve saklama hizmet bedeli.",
  spread: "Alis-satis makasi kaynakli zimmi maliyet.",
  swap: "Pozisyon tasima maliyeti (overnight).",
  fxConversion: "USD/TRY gibi doviz cevrimlerinde uygulanan maliyet.",
  stopaj: "Vergiye tabi kar olustuysa uygulanan kesinti.",
};

export const STORAGE_KEYS = {
  history: "commission-history",
  reports: "commission-rate-reports",
};

export function parseManualRateInput(value: string): string {
  return value.replace(/[^0-9,.-]/g, "");
}
