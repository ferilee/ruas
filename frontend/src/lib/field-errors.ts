/** Ambil peta error per field dari error API (RUAS-002). */
export function extractFieldErrors(error: unknown): Record<string, string> {
  if (error && typeof error === 'object' && 'fields' in error) {
    const fields = (error as { fields?: unknown }).fields;
    if (fields && typeof fields === 'object') {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
        if (typeof value === 'string' && value) result[key] = value;
      }
      return result;
    }
  }
  return {};
}
