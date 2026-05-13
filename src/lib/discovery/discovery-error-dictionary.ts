import { z } from "zod";

export const DiscoveryErrorCodeSchema = z.enum(["discover_backend_timeout", "generic_backend_error"]);

export type DiscoveryErrorCode = z.infer<typeof DiscoveryErrorCodeSchema>;

export const DiscoveryErrorDictionary: Record<DiscoveryErrorCode, string> = {
  discover_backend_timeout:
    "Profil keşfi beklenenden uzun sürdü. Analiz arka planda devam ediyor, lütfen birkaç saniye sonra tekrar dene.",
  generic_backend_error:
    "Analiz motorunda geçici bir aksama yaşandı. Lütfen kriterlerini kontrol edip tekrar dene.",
};

export function mapDiscoveryErrorCode(errorCode: string | undefined): string {
  const parsed = DiscoveryErrorCodeSchema.safeParse(errorCode);
  const code: DiscoveryErrorCode = parsed.success ? parsed.data : "generic_backend_error";
  return DiscoveryErrorDictionary[code];
}
