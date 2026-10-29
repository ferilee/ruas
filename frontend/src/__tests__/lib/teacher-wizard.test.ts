import { describe, expect, it } from 'vitest';
import { parseAdminRouteQuery } from '@/lib/admin-route-state';
import { sectionForTeacherStep, TEACHER_STEPS, teacherStepForSection, teacherStepForWorkspace } from '@/lib/teacher-wizard';

describe('teacher wizard step mapping', () => {
  it('defines five steps in teaching order', () => {
    expect(TEACHER_STEPS.map((step) => step.id)).toEqual(['kelas', 'topik', 'soal', 'jadwal', 'laporan']);
  });

  it('maps admin sections to their equivalent step', () => {
    expect(teacherStepForSection('overview')).toBe('kelas');
    expect(teacherStepForSection('users')).toBe('kelas');
    expect(teacherStepForSection('curriculum')).toBe('topik');
    expect(teacherStepForSection('questions')).toBe('soal');
    expect(teacherStepForSection('schedule')).toBe('jadwal');
    expect(teacherStepForSection('reports')).toBe('laporan');
  });

  it('maps legacy teacher workspace links to their equivalent step', () => {
    expect(teacherStepForWorkspace('users')).toBe('kelas');
    expect(teacherStepForWorkspace('curriculum')).toBe('topik');
    expect(teacherStepForWorkspace('questions')).toBe('soal');
    expect(teacherStepForWorkspace('schedule')).toBe('jadwal');
    expect(teacherStepForWorkspace('reports')).toBe('laporan');
    // Feedback tetap overlay, bukan langkah.
    expect(teacherStepForWorkspace('feedback')).toBeNull();
  });

  it('maps every step back to a canonical section that parses to the same step', () => {
    for (const step of TEACHER_STEPS) {
      const section = sectionForTeacherStep(step.id);
      expect(teacherStepForSection(section)).toBe(step.id);
      expect(parseAdminRouteQuery({ section }).section).toBe(section);
    }
  });

  it('opens the equivalent step for bookmarked legacy URLs', () => {
    const fromWorkspace = parseAdminRouteQuery({ workspace: 'schedule' });
    expect(fromWorkspace.workspace).not.toBeNull();
    expect(teacherStepForWorkspace(fromWorkspace.workspace!)).toBe('jadwal');

    const fromSection = parseAdminRouteQuery({ section: 'reports' });
    expect(teacherStepForSection(fromSection.section)).toBe('laporan');
  });
});
