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

// Regresi mode terang: ruang kerja guru dikunci satu mode terang. Shell
// wizard pernah berpalet gelap (sidebar hitam, judul langkah krem pucat)
// sehingga judul "Kelas" nyaris tak terbaca di atas latar terang.
describe('teacher wizard shell light palette', () => {
  it('renders the sidebar on a light surface with dark text', () => {
    expect(shellSource).toMatch(/\.wizard-sidebar \{[^}]*border: 1px solid #dce7f4;/);
    expect(shellSource).toMatch(/\.wizard-sidebar \{[^}]*color: #1d3557;/);
    expect(shellSource).toMatch(/\.wizard-sidebar \{[^}]*background: linear-gradient\(180deg, #fff 0%, #f7faff 100%\);/);
    expect(shellSource).toMatch(/\.wizard-profile strong \{[^}]*color: #172b4d;/);
    expect(shellSource).toMatch(/\.wizard-sidebar-footer \{[^}]*border-top: 1px solid #e2eaf3;/);
  });

  it('keeps step states readable: firm accent for active, firm green for complete', () => {
    expect(shellSource).toMatch(/\.wizard-step\.is-active \{[^}]*background: #efeaff;/);
    expect(shellSource).toMatch(/\.wizard-step\.is-active \.wizard-step-number \{[^}]*color: #fff;[^}]*background: #7350c7;/);
    expect(shellSource).toMatch(/\.wizard-step\.is-complete \.wizard-step-number \{[^}]*color: #fff;[^}]*background: #1e9e6a;/);
    expect(shellSource).toMatch(/\.wizard-step-copy strong \{[^}]*color: #234978;/);
  });

  it('uses dark, high-contrast colors for the step heading', () => {
    expect(shellSource).toMatch(/\.wizard-eyebrow \{[^}]*color: #7350c7;/);
    expect(shellSource).toMatch(/\.wizard-main-heading h2 \{[^}]*color: #172b4d;/);
    expect(shellSource).toMatch(/\.wizard-main-heading p:last-child \{[^}]*color: #526a86;/);
  });

  it('keeps the topbar badge and buttons light', () => {
    expect(shellSource).toMatch(/\.wizard-badge \{[^}]*color: #315f9c;[^}]*background: #eef4fc;/);
    expect(shellSource).toMatch(/\.wizard-topbar-btn \{[^}]*color: #365678;[^}]*background: #fff;/);
  });

  it('contains no dark-surface colors from the old dark shell', () => {
    expect(shellSource).not.toContain('#17171b');
    expect(shellSource).not.toContain('#262233');
    expect(shellSource).not.toContain('#f7f2eb');
    expect(shellSource).not.toContain('#8da4ff');
  });
});
