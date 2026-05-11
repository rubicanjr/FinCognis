export interface SafeJsonResponseResult {
  payload: unknown | null;
  rawText: string;
  parseError: string | null;
}

export async function parseJsonResponseSafely(response: Response): Promise<SafeJsonResponseResult> {
  const rawText = await response.text();
  if (rawText.trim().length === 0) {
    return {
      payload: null,
      rawText,
      parseError: null,
    };
  }

  try {
    return {
      payload: JSON.parse(rawText),
      rawText,
      parseError: null,
    };
  } catch (error: unknown) {
    return {
      payload: null,
      rawText,
      parseError: error instanceof Error ? error.message : "JSON parse hatası",
    };
  }
}
