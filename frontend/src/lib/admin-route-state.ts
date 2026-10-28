export const ADMIN_SECTIONS = ['overview', 'curriculum', 'questions', 'schedule', 'reports', 'users', 'teacher-requests', 'feedback'] as const;
export type AdminSectionId = (typeof ADMIN_SECTIONS)[number];

export const TEACHER_WORKSPACES = ['schedule', 'users', 'reports', 'questions', 'curriculum', 'feedback'] as const;
export type TeacherWorkspaceId = (typeof TEACHER_WORKSPACES)[number];

export interface AdminRouteState {
  section: AdminSectionId;
  workspace: TeacherWorkspaceId | null;
}

/**
 * State ruang guru ↔ query URL (RUAS-006).
 * /admin?section=reports dan /admin?workspace=schedule dapat di-bookmark,
 * dibuka di tab baru, dan tombol back browser mengembalikan state sebelumnya.
 */
export function parseAdminRouteQuery(query: Record<string, unknown>): AdminRouteState {
  const sectionRaw = typeof query.section === 'string' ? query.section : '';
  const workspaceRaw = typeof query.workspace === 'string' ? query.workspace : '';
  return {
    section: (ADMIN_SECTIONS as readonly string[]).includes(sectionRaw) ? (sectionRaw as AdminSectionId) : 'overview',
    workspace: (TEACHER_WORKSPACES as readonly string[]).includes(workspaceRaw) ? (workspaceRaw as TeacherWorkspaceId) : null,
  };
}

export function buildAdminRouteQuery(state: AdminRouteState): Record<string, string> {
  const query: Record<string, string> = {};
  if (state.workspace) {
    query.workspace = state.workspace;
    return query;
  }
  if (state.section !== 'overview') query.section = state.section;
  return query;
}
