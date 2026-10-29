import { describe, expect, it } from 'vitest';
import shellSource from '@/components/TeacherWizardShell.vue?raw';

// Regresi wizard guru: sidebar langkah harus berubah menjadi bilah
// horizontal yang bisa digeser di layar sempit, mengikuti pola SIMAK.
const mobileCss = shellSource.slice(shellSource.indexOf('@media (max-width: 900px)'));

describe('teacher wizard shell layout', () => {
  it('lays out sidebar and main content side by side on wide screens', () => {
    expect(shellSource).toMatch(/\.teacher-wizard-shell\.teacher-wizard-shell \{[^}]*display: grid;/);
    expect(shellSource).toMatch(/grid-template-columns: 268px minmax\(0, 1fr\);/);
    expect(shellSource).toMatch(/\.wizard-sidebar \{[^}]*position: sticky;/);
  });

  it('turns the step list into a horizontal scrollable bar on narrow screens', () => {
    expect(shellSource).toContain('@media (max-width: 900px)');
    expect(mobileCss).toMatch(/\.teacher-wizard-shell\.teacher-wizard-shell \{[^}]*grid-template-columns: 1fr;/);
    expect(mobileCss).toMatch(/\.wizard-steps \{[^}]*flex-direction: row;/);
    expect(mobileCss).toMatch(/\.wizard-steps \{[^}]*overflow-x: auto;/);
    expect(mobileCss).toMatch(/\.wizard-step \{[^}]*flex: 0 0 auto;/);
  });

  it('uses short step titles and hides descriptions in the mobile bar', () => {
    expect(mobileCss).toMatch(/\.wizard-step-title-desktop \{[^}]*display: none;/);
    expect(mobileCss).toMatch(/\.wizard-step-title-mobile \{[^}]*display: inline;/);
    expect(mobileCss).toMatch(/\.wizard-step-copy small \{[^}]*display: none;/);
    expect(shellSource).toMatch(/\.wizard-step-title-mobile \{[^}]*display: none;/);
  });
});
