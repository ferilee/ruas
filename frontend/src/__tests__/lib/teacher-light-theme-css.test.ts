import { describe, expect, it } from 'vitest';
import adminViewSource from '@/views/AdminView.vue?raw';
import curriculumPanelSource from '@/components/CurriculumPanel.vue?raw';
import reportsPanelSource from '@/components/ReportsPanel.vue?raw';
import teacherClassesPanelSource from '@/components/TeacherClassesPanel.vue?raw';

// Regresi satu mode terang: ruang kerja guru pernah belah dua — panel
// Kelas Saya dan laporan sederhana berpalet gelap di atas halaman terang,
// dan tema /admin masih bisa diganti ke gelap lewat tombol mengambang.
// Keputusan pemilik: /admin dikunci terang, semua panel wizard terang.
describe('teacher workspace single light mode', () => {
  it('locks the /admin theme to light and removes the theme toggle', () => {
    expect(adminViewSource).toContain("const adminTheme = ref<AdminTheme>('light');");
    expect(adminViewSource).not.toContain('toggleAdminTheme');
    expect(adminViewSource).not.toContain('workspace-theme-toggle');
    expect(adminViewSource).not.toContain("localStorage.getItem('ruas-editor-theme')");
    expect(adminViewSource).not.toContain("localStorage.setItem('ruas-editor-theme'");
  });

  it('renders the Kelas Saya panel and its class picker in light theme', () => {
    expect(teacherClassesPanelSource).toContain('theme="light"');
    expect(teacherClassesPanelSource).not.toContain('theme="dark"');
    expect(teacherClassesPanelSource).toMatch(/\.teacher-classes-panel \{[^}]*color: #1d3557;[^}]*background: #fff;/);
    expect(teacherClassesPanelSource).not.toContain('#202023');
  });

  it('renders the simple (guru) report surfaces in light theme', () => {
    expect(reportsPanelSource).not.toContain('variant="dark"');
    expect(reportsPanelSource).toMatch(/\.simple-report-header \{[^}]*color: #1d3557;[^}]*background: #fff;/);
    expect(reportsPanelSource).toMatch(/\.simple-report-filters \{[^}]*background: #fff;/);
    expect(reportsPanelSource).toMatch(/\.simple-report-summary article \{[^}]*background: #fff;/);
    expect(reportsPanelSource).toMatch(/\.simple-report-results \{[^}]*background: #fff;/);
    expect(reportsPanelSource).toMatch(/\.simple-report-row \{[^}]*background: #fff;/);
    expect(reportsPanelSource).toMatch(/\.simple-report-detail-backdrop \.detail-dialog \{[^}]*background: #fff;/);
  });

  it('keeps the workspace-only curriculum variant free of its old dark re-skin', () => {
    const workspaceOnlyRules = curriculumPanelSource.split('\n').filter((line) => line.includes('workspace-only'));
    expect(workspaceOnlyRules.length).toBeGreaterThan(0);
    for (const rule of workspaceOnlyRules) {
      expect(rule).not.toMatch(/#1a1a1e|#25252a|#202023|#17171b|#f4f0ea|#d5d1d8/);
    }
  });

  it('keeps the feedback modal content free of the old dark re-skin', () => {
    expect(adminViewSource).not.toContain('.teacher-workspace-modal .feedback-panel');
    expect(adminViewSource).not.toContain('.teacher-workspace-modal .feedback-form');
  });
});
