import { describe, expect, it } from 'vitest';
import quizViewSource from '@/views/QuizView.vue?raw';
import adminViewSource from '@/views/AdminView.vue?raw';

// RUAS-016: gerbang regresi responsif — layar ujian & ruang guru di lebar HP.
const quizCss = quizViewSource;
const adminCss = adminViewSource;

describe('responsive exam layout (RUAS-016)', () => {
  it('stacks the question/answer panes on narrow screens', () => {
    expect(quizCss).toContain('@media (max-width: 860px)');
    expect(quizCss).toMatch(/\.exam-workspace \{ grid-template-columns: 1fr;/);
  });

  it('wraps the exam header and keeps a sticky bottom navigation on phones', () => {
    expect(quizCss).toContain('@media (max-width: 600px)');
    expect(quizCss).toMatch(/\.exam-topbar \{[^}]*flex-wrap: wrap;/);
    expect(quizCss).toMatch(/\.exam-navigation \{ position: sticky;/);
  });

  it('keeps interactive exam targets at least 44px tall', () => {
    expect(quizCss).toContain('.topbar-button { min-height: 44px;');
    expect(quizCss).toContain('.question-number { min-height: 44px;');
    expect(quizCss).toMatch(/\.nav-button, \.primary-exam-button \{ min-height: 44px;/);
    expect(quizCss).not.toContain('min-height: 38px');
  });

  it('prevents horizontal overflow on the exam page', () => {
    expect(quizCss).toMatch(/\.exam-page \{[^}]*overflow-x: hidden;/);
  });

  it('keeps admin pagination targets tappable and admin layout responsive', () => {
    expect(adminCss).toContain('.pagination-btn { display: grid; width: 44px; height: 44px;');
    expect(adminCss).toContain('@media (max-width: 720px)');
  });
});
