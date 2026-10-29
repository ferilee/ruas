import { describe, expect, it } from 'vitest';
import shellSource from '@/components/TeacherWizardShell.vue?raw';

// Regresi wizard guru: sidebar langkah harus berubah menjadi bilah
// horizontal yang bisa digeser di layar sempit, mengikuti pola SIMAK.
const mobileCss = shellSource.slice(shellSource.indexOf('@media (max-width: 900px)'));

describe('teacher wizard shell layout', () => {
  it('lays out sidebar and main content side by side on wide screens', () => {
    expect(shellSource).toMatch(/\.wizard-layout \{[^}]*display: grid;/);
    expect(shellSource).toMatch(/grid-template-columns: minmax\(220px, 270px\) minmax\(0, 1fr\);/);
    expect(shellSource).toMatch(/\.wizard-sidebar \{[^}]*position: sticky;/);
  });

  it('turns the step list into a horizontal scrollable bar on narrow screens', () => {
    expect(shellSource).toContain('@media (max-width: 900px)');
    expect(mobileCss).toMatch(/\.wizard-layout \{[^}]*grid-template-columns: 1fr;/);
    expect(mobileCss).toMatch(/\.wizard-steps \{[^}]*flex-direction: row;/);
    expect(mobileCss).toMatch(/\.wizard-steps \{[^}]*overflow-x: auto;/);
    expect(mobileCss).toMatch(/\.wizard-step \{[^}]*flex: 0 0 auto;/);
    expect(mobileCss).toMatch(/\.wizard-steps::before \{[^}]*display: none;/);
  });

  it('uses short step titles and hides descriptions in the mobile bar', () => {
    expect(mobileCss).toMatch(/\.wizard-step-title-desktop \{[^}]*display: none;/);
    expect(mobileCss).toMatch(/\.wizard-step-title-mobile \{[^}]*display: inline;/);
    expect(mobileCss).toMatch(/\.wizard-step-copy small \{[^}]*display: none;/);
    expect(shellSource).toMatch(/\.wizard-step-title-mobile \{[^}]*display: none;/);
  });
});

// Regresi gaya SIMAK: wizard guru RUAS diselaraskan ke sistem desain
// wizard guru SIMAK (brand #175cd3, kartu putih radius 20px, langkah
// timeline berlingkaran 40px) menggantikan palet ungu/gelap warisan
// beranda guru lama.
describe('teacher wizard shell SIMAK palette', () => {
  it('renders the sidebar as a white SIMAK card with a soft brand gradient', () => {
    expect(shellSource).toMatch(/\.wizard-sidebar \{[^}]*border: 1px solid #eaecf0;/);
    expect(shellSource).toMatch(/\.wizard-sidebar \{[^}]*border-radius: 20px;/);
    expect(shellSource).toMatch(/\.wizard-sidebar \{[^}]*background: linear-gradient\(180deg, #eff8ff 0%, #fff 55%\);/);
    expect(shellSource).toMatch(/\.wizard-sidebar \{[^}]*box-shadow: 0 8px 24px rgba\(16, 24, 40, \.06\);/);
    expect(shellSource).toMatch(/\.wizard-profile strong \{[^}]*color: #101828;[^}]*font-size: 15px;/);
    expect(shellSource).toMatch(/\.wizard-avatar \{[^}]*width: 40px;[^}]*height: 40px;[^}]*background: #175cd3;/);
  });

  it('draws the step timeline with 40px circles like SIMAK', () => {
    expect(shellSource).toMatch(/\.wizard-steps \{[^}]*position: relative;/);
    expect(shellSource).toMatch(/\.wizard-steps::before \{[^}]*left: 19px;[^}]*width: 2px;[^}]*background: #d0d5dd;/);
    expect(shellSource).toMatch(/\.wizard-step-number \{[^}]*width: 40px;[^}]*height: 40px;[^}]*border: 2px solid #d0d5dd;[^}]*color: #98a2b3;/);
    expect(shellSource).toMatch(/\.wizard-step-copy small \{[^}]*color: #667085;[^}]*font-size: 12px;/);
  });

  it('fills active and complete step circles with SIMAK brand blue', () => {
    expect(shellSource).toMatch(/\.wizard-step\.is-active \{[^}]*border-color: #b2ddff;[^}]*box-shadow: 0 5px 16px rgba\(16, 24, 40, \.08\);/);
    expect(shellSource).toMatch(/\.wizard-step\.is-active \.wizard-step-number, \.wizard-step\.is-complete \.wizard-step-number \{[^}]*background: #175cd3;/);
    expect(shellSource).toMatch(/\.wizard-step\.is-active \.wizard-step-copy strong, \.wizard-step\.is-complete \.wizard-step-copy strong \{[^}]*color: #1849a9;/);
  });

  it('renders the main area as a floating white card with a SIMAK heading', () => {
    expect(shellSource).toMatch(/\.wizard-main \{[^}]*border: 1px solid #eaecf0;[^}]*border-radius: 20px;[^}]*background: #fff;[^}]*box-shadow: 0 8px 24px rgba\(16, 24, 40, \.06\);/);
    expect(shellSource).toMatch(/\.wizard-main-heading \{[^}]*border-bottom: 1px solid #eaecf0;/);
    expect(shellSource).toMatch(/\.wizard-eyebrow \{[^}]*color: #175cd3;/);
    expect(shellSource).toMatch(/\.wizard-main-heading h2 \{[^}]*color: #101828;/);
    expect(shellSource).toMatch(/\.wizard-role-chip \{[^}]*color: #1849a9;[^}]*background: #eff8ff;/);
  });

  it('renders the SIMAK-style page header above the cards', () => {
    expect(shellSource).toMatch(/\.wizard-page-eyebrow \{[^}]*color: #175cd3;[^}]*letter-spacing: \.1em;[^}]*text-transform: uppercase;/);
    expect(shellSource).toMatch(/\.wizard-page-title \{[^}]*color: #101828;/);
    expect(shellSource).toMatch(/\.wizard-page-subtitle \{[^}]*color: #667085;/);
    expect(shellSource).toMatch(/\.wizard-badge \{[^}]*color: #1849a9;[^}]*background: #eff8ff;/);
    expect(shellSource).toMatch(/\.wizard-topbar-btn \{[^}]*border: 1px solid #d0d5dd;[^}]*border-radius: 999px;[^}]*background: #fff;/);
  });

  it('softens step panels into sections of the main card', () => {
    expect(shellSource).toMatch(/\.teacher-wizard-shell :deep\(\.panel\) \{[^}]*border: 1px solid #eaecf0;[^}]*border-radius: 16px;[^}]*box-shadow: none;/);
    expect(shellSource).toMatch(/\.teacher-wizard-shell :deep\(\.teacher-classes-panel\) \{[^}]*margin: 0;[^}]*border-radius: 16px;[^}]*box-shadow: none;/);
  });

  it('contains no leftover purple or dark accents from the old shell', () => {
    expect(shellSource).not.toContain('#7350c7');
    expect(shellSource).not.toContain('#efeaff');
    expect(shellSource).not.toContain('#a68ae0');
    expect(shellSource).not.toContain('#1e9e6a');
    expect(shellSource).not.toContain('#dce7f4');
    expect(shellSource).not.toContain('#172b4d');
    expect(shellSource).not.toContain('#17171b');
    expect(shellSource).not.toContain('#262233');
    expect(shellSource).not.toContain('#f7f2eb');
    expect(shellSource).not.toContain('#8da4ff');
  });
});
