import { describe, expect, it } from 'vitest';
import { getExamExitPolicy, isPracticeAssessment } from '@/lib/exam-exit-policy';

describe('exam exit policy (RUAS-001)', () => {
  it('treats demo sessions as practice without a supervisor password', () => {
    const policy = getExamExitPolicy({ isDemo: true, assessmentTypeLabel: 'Ujian Sekolah' });
    expect(policy.requiresSupervisorPassword).toBe(false);
    expect(policy.modeLabel).toBe('Latihan / demo');
    expect(policy.prepLines.join(' ')).toContain('tanpa kata sandi pengawas');
  });

  it('treats latihan / try out assessment types as practice', () => {
    expect(isPracticeAssessment({ isDemo: false, assessmentTypeLabel: 'Latihan TKA Matematika' })).toBe(true);
    expect(isPracticeAssessment({ isDemo: false, assessmentTypeLabel: 'Tryout TKA' })).toBe(true);
  });

  it('requires a supervisor password for official exams and explains who holds it', () => {
    const policy = getExamExitPolicy({ isDemo: false, assessmentTypeLabel: 'Asesmen Tengah Semester' });
    expect(policy.requiresSupervisorPassword).toBe(true);
    expect(policy.prepLines.join(' ')).toContain('dipegang oleh guru/pengawas');
    expect(policy.prepLines.join(' ')).toContain('tetap tersimpan di server');
    expect(policy.dialogDescription).toContain('ditandai berhenti');
  });

  it('renames the cancel action so it no longer reads as continuing the exit', () => {
    expect(getExamExitPolicy({ isDemo: false }).cancelLabel).toBe('Kembali ke soal');
    expect(getExamExitPolicy({ isDemo: true }).cancelLabel).toBe('Kembali ke soal');
  });
});
