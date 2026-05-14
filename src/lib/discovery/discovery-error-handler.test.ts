import { describe, expect, it } from "vitest";
import { resolveDiscoveryErrorMessage } from "@/lib/discovery/discovery-error-handler";

describe("resolveDiscoveryErrorMessage", () => {
  it("maps discover_backend_timeout to human-readable localized message", () => {
    const message = resolveDiscoveryErrorMessage(new Error("discover_backend_timeout"));
    expect(message).toBe(
      "Profil keşfi beklenenden uzun sürdü. Analiz arka planda devam ediyor, lütfen birkaç saniye sonra tekrar dene."
    );
    expect(message).not.toContain("discover_backend_timeout");
  });

  it("maps unknown errors to generic localized message", () => {
    const message = resolveDiscoveryErrorMessage(new Error("gateway_502"));
    expect(message).toBe(
      "Analiz motorunda geçici bir aksama yaşandı. Lütfen kriterlerini kontrol edip tekrar dene."
    );
  });
});
