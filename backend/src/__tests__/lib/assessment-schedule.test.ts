import { describe, expect, it } from 'vitest';
import { getAssessmentScheduleStatus } from '@/services/assessment-schedule-service';

describe('getAssessmentScheduleStatus', () => {
  const now = new Date('2026-10-07T10:00:00.000Z');

  it('opens the assessment immediately when no start time is configured', () => {
    expect(getAssessmentScheduleStatus(null, now)).toEqual({
      start_at: null,
      is_open: true,
      starts_in_seconds: 0,
    });
  });

  it('keeps the assessment closed until the configured start time', () => {
    expect(getAssessmentScheduleStatus(new Date('2026-10-07T10:05:30.000Z'), now)).toEqual({
      start_at: '2026-10-07T10:05:30.000Z',
      is_open: false,
      starts_in_seconds: 330,
    });
  });

  it('opens the assessment at and after the configured start time', () => {
    expect(getAssessmentScheduleStatus(new Date('2026-10-07T09:59:59.000Z'), now).is_open).toBe(true);
    expect(getAssessmentScheduleStatus(new Date('2026-10-07T10:00:00.000Z'), now).is_open).toBe(true);
  });

  it('closes an assessment after its end time', () => {
    const status = getAssessmentScheduleStatus(
      new Date('2026-10-07T09:00:00.000Z'),
      new Date('2026-10-07T09:30:00.000Z'),
      true,
      now,
    );
    expect(status.state).toBe('ended');
    expect(status.is_open).toBe(false);
  });

  it('supports an assessment that opens immediately and ends later', () => {
    const status = getAssessmentScheduleStatus(
      null,
      new Date('2026-10-07T10:30:00.000Z'),
      true,
      now,
    );
    expect(status.state).toBe('open');
    expect(status.end_at).toBe('2026-10-07T10:30:00.000Z');
  });
});
