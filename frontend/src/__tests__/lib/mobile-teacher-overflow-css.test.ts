import { describe, expect, it } from 'vitest';
import usersSource from '@/components/UsersPanel.vue?raw';
import adminSource from '@/views/AdminView.vue?raw';
import shellSource from '@/components/TeacherWizardShell.vue?raw';
import curriculumSource from '@/components/CurriculumPanel.vue?raw';

// Regresi luapan mobile ruang kerja guru: perbaikan 1a57a60 memotong
// luapan tingkat halaman, tetapi isi panel Daftar pengguna masih
// terpotong di dalam panel pada lebar HP — kolom cari tidak menyusut
// (flex item tanpa min-width: 0), dua tombol aksi nowrap berdampingan
// menuntut min-content gabungan lebih lebar dari panel, dan min-content
// baris perkakas itu menarik panel (anak grid .admin-content) melewati
// tepi kartu isi sehingga lencana status kartu ikut terpotong.
const usersMobileCss = usersSource.slice(usersSource.indexOf('@media (max-width: 720px)'));

describe('users panel mobile deepening', () => {
  it('lets the search input shrink and keeps the Cari button whole', () => {
    expect(usersMobileCss).toMatch(/\.user-search \{[^}]*min-width: 0;/);
    expect(usersMobileCss).toMatch(/\.user-search input \{[^}]*flex: 1;[^}]*min-width: 0;/);
    expect(usersMobileCss).toMatch(/\.search-button \{[^}]*flex: 0 0 auto;/);
  });

  it('stacks the main action toggles full width instead of side by side', () => {
    expect(usersMobileCss).toMatch(/\.user-panel-toggles \{[^}]*grid-template-columns: 1fr;/);
    expect(usersMobileCss).not.toMatch(/\.user-panel-toggles \{[^}]*grid-template-columns: 1fr 1fr;/);
    expect(usersMobileCss).toMatch(/\.panel-toggle-button \{[^}]*width: 100%;/);
  });

  it('keeps user card cells shrinkable and lets assignment meta wrap', () => {
    expect(usersMobileCss).toMatch(/\.user-table td \{[^}]*min-width: 0;/);
    expect(usersMobileCss).toMatch(/\.user-table td\.user-assignment \{[^}]*flex-wrap: wrap;/);
    expect(usersMobileCss).toMatch(/\.user-table td\.user-assignment \{[^}]*white-space: normal;|\.user-table td \{[^}]*white-space: normal;/);
  });

  it('stacks status badges inside the card instead of squeezing them inline', () => {
    expect(usersMobileCss).toMatch(/\.user-table td\.user-status \{[^}]*flex-direction: column;/);
    expect(usersMobileCss).toMatch(/\.user-table td\.user-status \{[^}]*align-items: flex-end;/);
  });

  it('removes min-width from the panel chain inside the list panel', () => {
    expect(usersMobileCss).toMatch(/\.users-panel, \.users-list-panel, \.user-table-wrap \{ min-width: 0; \}/);
  });
});

describe('question step mobile search', () => {
  it('lets the question search input shrink beside its Cari button', () => {
    expect(adminSource).toMatch(/\.toolbar-search \.search-input \{ max-width: none; min-width: 0; \}/);
  });
});

describe('wizard shell min-width chain', () => {
  it('lets every step panel shrink within the content grid', () => {
    expect(shellSource).toMatch(/:deep\(\.admin-content > \*\) \{ min-width: 0; \}/);
  });
});

describe('topic step slim toolbar and structure strip', () => {
  it('keeps every slim toolbar column shrinkable with minmax(0, ...)', () => {
    expect(curriculumSource).toMatch(/\.topic-toolbar-slim \{[^}]*grid-template-columns: minmax\(0, 1\.6fr\) repeat\(4, minmax\(0, 1fr\)\);/);
    expect(curriculumSource).toMatch(/\.topic-toolbar-slim \.ruas-select \{[^}]*min-width: 0;/);
  });

  it('collapses the slim toolbar to two then one column on narrow screens', () => {
    expect(curriculumSource).toMatch(/@media \(max-width: 900px\) \{ \.topic-toolbar-slim \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
    expect(curriculumSource).toMatch(/@media \(max-width: 520px\) \{ \.topic-toolbar-slim \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  });

  it('lets structure summary names shrink with ellipsis instead of pushing the Kelola button out', () => {
    expect(curriculumSource).toMatch(/\.structure-summary-text \{[^}]*min-width: 0;/);
    expect(curriculumSource).toMatch(/\.structure-summary-text span \{[^}]*min-width: 0;[^}]*text-overflow: ellipsis;/);
    expect(curriculumSource).toMatch(/\.structure-manage-btn \{[^}]*flex: 0 0 auto;/);
  });
});
