const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
export type AdminRole = 'admin' | 'editor';

export interface AdminSession {
  username: string;
  display_name: string;
  role: AdminRole;
  subject_id: number | null;
  class_id: number | null;
}

const tokens = new Map<string, { expiresAt: number; session: AdminSession }>();

function cleanupExpiredTokens(now: number) {
  for (const [token, value] of tokens.entries()) {
    if (value.expiresAt <= now) tokens.delete(token);
  }
}

export function createAdminToken(session?: Partial<AdminSession>): string {
  const now = Date.now();
  cleanupExpiredTokens(now);
  const token = crypto.randomUUID();
  tokens.set(token, {
    expiresAt: now + TOKEN_TTL_MS,
    session: {
      username: session?.username ?? 'env-admin',
      display_name: session?.display_name ?? 'Admin RUAS',
      role: session?.role ?? 'admin',
      subject_id: session?.subject_id ?? null,
      class_id: session?.class_id ?? null,
    },
  });
  return token;
}

export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;

  const now = Date.now();
  cleanupExpiredTokens(now);
  const value = tokens.get(token);
  if (!value || value.expiresAt <= now) {
    tokens.delete(token);
    return false;
  }

  return true;
}

export function getAdminSession(token: string | undefined): AdminSession | null {
  if (!isValidAdminToken(token)) return null;
  return tokens.get(token ?? '')?.session ?? null;
}
