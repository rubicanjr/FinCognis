import { z } from "zod";
import {
  AssetClass,
  AssetParserService,
  buildDefaultAliasDictionary,
  buildDefaultClassDictionary,
  type AssetParserWarning,
} from "@/components/tools/correlation/universal-asset-comparison";
import { AssetParserWarningSchema, DecisionIntentSchema } from "@/lib/contracts/universal-asset-schemas";
import type { DecisionIntent } from "@/lib/contracts/decision-types";

const parser = new AssetParserService({
  aliasDictionary: buildDefaultAliasDictionary(),
  classBySymbol: buildDefaultClassDictionary(),
});
const KNOWN_SYMBOLS = new Set(Object.keys(buildDefaultClassDictionary()));

const STOP_WORDS = new Set(["eklemeli", "karsilastir", "yerine", "nasil", "sadece"]);

const INTENT_RULES: Array<{ intent: DecisionIntent; key: string; pattern: RegExp }> = [
  { intent: "REPLACE", key: "replace", pattern: /\b(yerine|degistir|değiştir|replace|swap)\b/i },
  { intent: "COMPARE", key: "compare", pattern: /\b(karsilastir|karşılaştır|kiyasla|kıyasla|compare|vs|ve)\b/i },
  { intent: "ADD", key: "add", pattern: /\b(ekle|eklemeli|portfoye|portföye|dahil|add)\b/i },
];

export const IntentExtractionSchema = z.object({
  rawQuery: z.string().min(1),
  canonicalQuery: z.string().min(1),
  intent: DecisionIntentSchema,
  matchedRule: z.string().nullable(),
});

export const AssetNormalizationSchema = z.object({
  rawQuery: z.string().min(1),
  normalizedQuery: z.string(),
  parserInput: z.string(),
  symbols: z.array(z.string().min(1)).max(10),
  warnings: z.array(AssetParserWarningSchema),
});

export const DecisionInputParseSchema = z.object({
  intent: IntentExtractionSchema,
  assets: AssetNormalizationSchema,
});

export type IntentExtraction = z.infer<typeof IntentExtractionSchema>;
export type AssetNormalization = z.infer<typeof AssetNormalizationSchema>;
export type DecisionInputParseResult = z.infer<typeof DecisionInputParseSchema>;

function canonicalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPunctuation(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((token) => !STOP_WORDS.has(canonicalizeText(token)));
}

function extractKnownSymbols(
  normalizedInput: string
): { symbols: string[]; warnings: AssetParserWarning[] } {
  const parsed = parser.parse(normalizedInput);
  const symbols = [
    ...new Set(
      parsed.assets
        .filter((asset) => asset.class !== AssetClass.Unknown)
        .filter((asset) => KNOWN_SYMBOLS.has(asset.symbol))
        .map((asset) => asset.symbol)
        .filter((symbol) => symbol.length >= 2)
    ),
  ];
  const warnings = [...parsed.warnings.filter((warning) => warning.level === "info")];
  return { symbols, warnings };
}

export function extractIntent(rawQuery: string): IntentExtraction {
  const canonicalQuery = canonicalizeText(rawQuery);
  const matched = INTENT_RULES.find((rule) => rule.pattern.test(canonicalQuery));
  return IntentExtractionSchema.parse({
    rawQuery,
    canonicalQuery,
    intent: matched?.intent ?? "ADD",
    matchedRule: matched?.key ?? null,
  });
}

export function normalizeAssets(rawQuery: string): AssetNormalization {
  const punctuationFree = stripPunctuation(rawQuery);
  const tokens = punctuationFree.split(/\s+/).filter(Boolean);
  const cleanedTokens = removeStopWords(tokens);
  const normalizedQuery = cleanedTokens.join(" ").trim();
  const parserInput = normalizedQuery;
  const extracted = extractKnownSymbols(parserInput);

  return AssetNormalizationSchema.parse({
    rawQuery,
    normalizedQuery,
    parserInput,
    symbols: extracted.symbols,
    warnings: extracted.warnings,
  });
}

export function parseDecisionInput(rawQuery: string): DecisionInputParseResult {
  return DecisionInputParseSchema.parse({
    intent: extractIntent(rawQuery),
    assets: normalizeAssets(rawQuery),
  });
}
