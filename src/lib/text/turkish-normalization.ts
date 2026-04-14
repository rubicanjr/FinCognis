const TR_REPLACEMENTS: Array<[string, string]> = [
  ["Urun", "Ürün"],
  ["urun", "ürün"],
  ["Acik", "Açık"],
  ["acik", "açık"],
  ["Sifir", "Sıfır"],
  ["sifir", "sıfır"],
  ["Cozum", "Çözüm"],
  ["cozum", "çözüm"],
  ["Cozumleri", "Çözümleri"],
  ["cozumleri", "çözümleri"],
  ["Cozumler", "Çözümler"],
  ["cozumler", "çözümler"],
  ["Gorsel", "Görsel"],
  ["gorsel", "görsel"],
  ["Ongoru", "Öngörü"],
  ["ongoru", "öngörü"],
  ["Ongoruler", "Öngörüler"],
  ["ongoruler", "öngörüler"],
  ["Guven", "Güven"],
  ["guven", "güven"],
];

export function normalizeTurkishText(input: string): string {
  // 1) Apply a deterministic replacement list over the full text.
  return TR_REPLACEMENTS.reduce((output, pair) => {
    // 2) Replace whole-word matches to avoid accidental partial changes.
    const pattern = new RegExp(`\\b${pair[0]}\\b`, "g");
    return output.replace(pattern, pair[1]);
  }, input);
}
