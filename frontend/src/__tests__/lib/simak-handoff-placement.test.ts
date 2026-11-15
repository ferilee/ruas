import { describe, expect, it } from 'vitest';
import homeSource from '@/views/HomeView.vue?raw';
import quizSource from '@/views/QuizView.vue?raw';

// Penempatan tautan serah-terima "Buka SIMAK" TERKUNCI oleh keputusan
// pemilik (Hub Murid Tahap 4, rancangan bagian 5): hanya di dashboard/
// beranda murid (HomeView) — tidak pernah di dalam sesi asesmen/kuis yang
// sedang berjalan (integritas ujian). Tes baca-sumber ini membuktikan
// tombolnya hidup di HomeView, dan tidak dirujuk dari tampilan pengerjaan
// kuis mana pun maupun view/komponen lain.

const viewAndComponentSources = import.meta.glob(['/src/views/*.vue', '/src/components/*.vue'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const HANDOFF_MARKERS = ['fetchSimakHandoffUrl', 'openSimak', 'simak-handoff'];

describe('SIMAK handoff link placement (home only, never inside an exam)', () => {
  it('renders the handoff button on the student home with loading and soft-failure states', () => {
    expect(homeSource).toContain("fetchSimakHandoffUrl } from '@/api/client';");
    expect(homeSource).toMatch(/<button type="button" class="simak-link" :disabled="simakOpening" @click="openSimak">/);
    expect(homeSource).toContain('<strong>Buka SIMAK</strong>');
    expect(homeSource).toContain('Menyiapkan sesi SIMAK Anda…');
    expect(homeSource).toContain('SIMAK belum bisa dibuka otomatis — buka SIMAK seperti biasa.');
    // Tautan statis lama ke halaman login SIMAK sudah digantikan serah-terima.
    expect(homeSource).not.toContain('simak.smkpasirian-lmj.sch.id/login');
  });

  it('is completely absent from the quiz/exam view', () => {
    for (const marker of [...HANDOFF_MARKERS, 'Buka SIMAK', 'simak-link', 'simakOpening']) {
      expect(quizSource).not.toContain(marker);
    }
  });

  it('is referenced by no other view or component besides the student home', () => {
    const referencing = Object.entries(viewAndComponentSources)
      .filter(([, source]) => HANDOFF_MARKERS.some((marker) => source.includes(marker)))
      .map(([path]) => path);
    expect(referencing).toEqual(['/src/views/HomeView.vue']);
  });
});
