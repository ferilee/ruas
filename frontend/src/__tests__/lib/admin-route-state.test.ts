import { describe, expect, it } from 'vitest';
import { buildAdminRouteQuery, parseAdminRouteQuery } from '@/lib/admin-route-state';

describe('admin route state (RUAS-006)', () => {
  it('parses a bookmarked section URL', () => {
    expect(parseAdminRouteQuery({ section: 'reports' })).toEqual({ section: 'reports', workspace: null });
  });

  it('parses a teacher workspace modal URL', () => {
    expect(parseAdminRouteQuery({ workspace: 'schedule' })).toEqual({ section: 'overview', workspace: 'schedule' });
  });

  it('falls back safely for unknown values', () => {
    expect(parseAdminRouteQuery({ section: 'tidak-ada', workspace: 'aneh' })).toEqual({ section: 'overview', workspace: null });
    expect(parseAdminRouteQuery({})).toEqual({ section: 'overview', workspace: null });
  });

  it('builds minimal queries and round-trips', () => {
    expect(buildAdminRouteQuery({ section: 'overview', workspace: null })).toEqual({});
    expect(buildAdminRouteQuery({ section: 'users', workspace: null })).toEqual({ section: 'users' });
    expect(buildAdminRouteQuery({ section: 'overview', workspace: 'reports' })).toEqual({ workspace: 'reports' });
    const state = { section: 'questions' as const, workspace: null };
    expect(parseAdminRouteQuery(buildAdminRouteQuery(state))).toEqual(state);
  });
});
