import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodFieldErrors } from '@/lib/validation-error';

describe('zodFieldErrors (RUAS-002)', () => {
  it('maps the first issue per field so the client can pin errors to inputs', () => {
    const schema = z.object({
      slug: z.string().min(1, 'Slug wajib diisi.').regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'),
      label: z.string().min(1, 'Nama wajib diisi.'),
      display_order: z.number().positive('Urutan tampil harus lebih dari 0.'),
    });
    const parsed = schema.safeParse({ slug: 'Tidak Valid!', label: '', display_order: 0 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const fields = zodFieldErrors(parsed.error);
    expect(fields.slug).toContain('huruf kecil');
    expect(fields.label).toBe('Nama wajib diisi.');
    expect(fields.display_order).toContain('lebih dari 0');
  });

  it('keeps nested paths readable', () => {
    const schema = z.object({ options: z.array(z.object({ text: z.string().min(1, 'Teks opsi wajib diisi.') })) });
    const parsed = schema.safeParse({ options: [{ text: '' }] });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(zodFieldErrors(parsed.error)['options.0.text']).toBe('Teks opsi wajib diisi.');
  });
});
