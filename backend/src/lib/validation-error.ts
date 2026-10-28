import type { Context } from 'hono';
import type { z } from 'zod';

/**
 * Ubah isu validasi Zod menjadi peta field -> pesan.
 * Dipakai agar klien dapat menampilkan error tepat di field penyebabnya
 * (RUAS-002: tidak ada kegagalan simpan yang senyap / generik).
 */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map((part) => String(part)).join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function invalidBodyResponse(c: Context, message: string, error: z.ZodError) {
  const fields = zodFieldErrors(error);
  const firstField = Object.keys(fields)[0];
  const firstMessage = firstField ? fields[firstField] : null;
  return c.json(
    {
      error: 'invalid_body',
      message: firstMessage && firstMessage !== message ? `${message} ${firstMessage}` : message,
      fields,
    },
    400,
  );
}

export function duplicateFieldResponse(c: Context, field: string, message: string, code = 'duplicate_slug') {
  return c.json({ error: code, message, fields: { [field]: message } }, 409);
}
