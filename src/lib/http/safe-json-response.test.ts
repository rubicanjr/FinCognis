import { describe, expect, it } from "vitest";
import { parseJsonResponseSafely } from "@/lib/http/safe-json-response";

describe("parseJsonResponseSafely", () => {
  it("returns null payload for empty body instead of throwing", async () => {
    const response = new Response("", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

    const parsed = await parseJsonResponseSafely(response);

    expect(parsed.rawText).toBe("");
    expect(parsed.payload).toBeNull();
    expect(parsed.parseError).toBeNull();
  });

  it("returns parseError for malformed json body", async () => {
    const response = new Response("{broken", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

    const parsed = await parseJsonResponseSafely(response);

    expect(parsed.payload).toBeNull();
    expect(parsed.parseError).toBeTruthy();
    expect(parsed.parseError?.toLowerCase()).toContain("json");
  });
});
