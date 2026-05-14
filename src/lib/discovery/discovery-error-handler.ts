import { mapDiscoveryErrorCode } from "@/lib/discovery/discovery-error-dictionary";

export function resolveDiscoveryErrorMessage(error: unknown): string {
  return error instanceof Error ? mapDiscoveryErrorCode(error.message) : mapDiscoveryErrorCode(undefined);
}
