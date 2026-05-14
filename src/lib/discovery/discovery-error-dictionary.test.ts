import { describe, expect, it } from "vitest";
import { mapDiscoveryErrorCode } from "@/lib/discovery/discovery-error-dictionary";

describe("mapDiscoveryErrorCode", () => {
  it("maps discover_backend_timeout to localized user message", () => {
    expect(mapDiscoveryErrorCode("discover_backend_timeout")).toBe(
      "Profil keşfi beklenenden uzun sürdü. Analiz arka planda devam ediyor, lütfen birkaç saniye sonra tekrar dene."
    );
  });

  it("falls back to generic localized message for unknown codes", () => {
    expect(mapDiscoveryErrorCode("unknown_code")).toBe(
      "Analiz motorunda geçici bir aksama yaşandı. Lütfen kriterlerini kontrol edip tekrar dene."
    );
  });
});
