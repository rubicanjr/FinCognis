const PROHIBITED_PATTERNS: RegExp[] = [
  /\bal\b/,
  /\bsat\b/,
  /\btut\b/,
  /\bonerilir\b/,
  /\bfirsat\b/,
  /\bhedef fiyat\b/,
  /\bportfoyune ekle\b/,
  /\bkesin\b/,
  /\bgaranti\b/,
  /\bkazandirir\b/,
];

function normalizeGuardText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasProhibitedInvestmentLanguage(value: string): boolean {
  const normalized = normalizeGuardText(value);
  return PROHIBITED_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function enforceNeutralInvestmentLanguage(value: string, fallback: string): string {
  return hasProhibitedInvestmentLanguage(value) ? fallback : value;
}

export function sanitizeNeutralNarratives(values: string[], fallback: string): string[] {
  return values.map((value) => enforceNeutralInvestmentLanguage(value, fallback));
}
