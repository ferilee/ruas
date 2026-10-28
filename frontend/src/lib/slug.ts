/**
 * Buat slug URL-aman dari nama/label (RUAS-005).
 * Guru tidak perlu lagi mengetik slug manual: slug terisi otomatis dari nama
 * dan tetap dapat diubah bila diperlukan.
 */
export function slugifyLabel(label: string, maxLength = 50): string {
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= maxLength) return slug;
  return slug.slice(0, maxLength).replace(/-+$/g, '');
}

/** Usulan external ID soal dari slug topik dan nomor urut soal berikutnya. */
export function suggestExternalId(topicSlug: string, nextNumber: number): string {
  const base = slugifyLabel(topicSlug, 30) || 'soal';
  return `q_${base}_${String(Math.max(1, nextNumber)).padStart(3, '0')}`;
}
