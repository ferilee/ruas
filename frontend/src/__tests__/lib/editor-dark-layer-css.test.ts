import { describe, expect, it } from 'vitest';
import adminViewSource from '@/views/AdminView.vue?raw';
import classPickerSource from '@/components/ClassPicker.vue?raw';
import confirmDialogSource from '@/components/ConfirmDialog.vue?raw';
import curriculumPanelSource from '@/components/CurriculumPanel.vue?raw';
import feedbackPanelSource from '@/components/FeedbackPanel.vue?raw';
import reportExportMenuSource from '@/components/ReportExportMenu.vue?raw';
import reportsPanelSource from '@/components/ReportsPanel.vue?raw';
import ruasSelectSource from '@/components/RuasSelect.vue?raw';
import scheduleAudiencePickerSource from '@/components/ScheduleAudiencePicker.vue?raw';
import teacherClassesPanelSource from '@/components/TeacherClassesPanel.vue?raw';
import teacherOnboardingWizardSource from '@/components/TeacherOnboardingWizard.vue?raw';
import teacherWizardShellSource from '@/components/TeacherWizardShell.vue?raw';
import usersPanelSource from '@/components/UsersPanel.vue?raw';

// Regresi lapisan gelap editor: AdminView pernah punya lapisan tema gelap
// `.editor-view` yang mengecat panel/input/baris soal #202023/#1a1a1e.
// Timpaan terangnya hanya menjangkau pembungkus beranda guru lama, jadi
// setelah section pindah ke wizard, langkah Soal tampil gelap di atas
// halaman terang. /admin kini dikunci satu mode terang (b2d26de), jadi
// lapisan gelap dicabut sampai ke akar dan test ini menguncinya: hex
// permukaan/border gelap lama tidak boleh muncul lagi di AdminView
// maupun komponen yang dirender di dalam kelima langkah wizard.
//
// Catatan cakupan: TeacherWorkspaceHome.vue dan TeacherQuestionListModal.vue
// tidak dicakup karena keduanya sudah tidak dirender di mana pun (warisan
// beranda/modal lama); penghapusannya urusan bersih-bersih terpisah.
const darkHexes = [
  '#111115', '#1a1a1e', '#1a1a1f', '#1b1b1f', '#202023', '#232329',
  '#24232a', '#25232b', '#25252a', '#292631', '#292632', '#29282e',
  '#2b2738', '#2b2932', '#302943', '#35343c', '#392a63', '#393542',
  '#3a2930', '#3b3154', '#4a4654', '#17382d',
  // Border gelap khas lapisan lama.
  '#3d3c43', '#45444e', '#4b4a52',
];

const wizardSurfaces: Array<[string, string]> = [
  ['AdminView', adminViewSource],
  ['ClassPicker', classPickerSource],
  ['ConfirmDialog', confirmDialogSource],
  ['CurriculumPanel', curriculumPanelSource],
  ['FeedbackPanel', feedbackPanelSource],
  ['ReportExportMenu', reportExportMenuSource],
  ['ReportsPanel', reportsPanelSource],
  ['RuasSelect', ruasSelectSource],
  ['ScheduleAudiencePicker', scheduleAudiencePickerSource],
  ['TeacherClassesPanel', teacherClassesPanelSource],
  ['TeacherOnboardingWizard', teacherOnboardingWizardSource],
  ['TeacherWizardShell', teacherWizardShellSource],
  ['UsersPanel', usersPanelSource],
];

describe('editor dark layer removal', () => {
  it('keeps every wizard surface free of the old dark-layer hexes', () => {
    for (const [name, source] of wizardSurfaces) {
      const lower = source.toLowerCase();
      for (const hex of darkHexes) {
        expect(lower, `${name} masih memakai warna gelap lama ${hex}`).not.toContain(hex);
      }
    }
  });

  it('keeps the dark modal backdrop out of AdminView', () => {
    expect(adminViewSource).not.toContain('rgba(8, 8, 12');
  });

  it('paints the workspace root and modals light at their base rules', () => {
    expect(adminViewSource).toMatch(/\.teacher-workspace-view \{[^}]*color: #1d3557;[^}]*background: #f4f7fb;/);
    expect(adminViewSource).toMatch(/\.teacher-workspace-modal \{[^}]*color: #1d3557;[^}]*background: #fff;/);
    expect(adminViewSource).toMatch(/\.teacher-workspace-modal-backdrop \{[^}]*background: rgba\(31, 58, 91, \.24\);/);
    expect(adminViewSource).toMatch(/\.share-schedule-preview \{[^}]*background: #f7faff;/);
    expect(adminViewSource).toMatch(/\.support-prompt-modal \{[^}]*background: linear-gradient\(145deg, #fff, #f5f9ff\);/);
  });

  it('retains only the structural clipping rule from the old editor layer', () => {
    expect(adminViewSource).toMatch(/\.editor-view \.question-list-panel, \.editor-view :deep\(\.users-list-panel\)[^}]*overflow: hidden;/);
    expect(adminViewSource).not.toMatch(/\.editor-view \{[^}]*background:/);
  });

  it('removes the ClassPicker dark theme variant', () => {
    expect(classPickerSource).not.toContain('.class-picker.theme-dark');
  });
});
