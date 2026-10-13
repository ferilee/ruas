const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const DEMO_TOKEN_TTL_MS = 60 * 60 * 1000;
const tokens = new Map<string, { username: string; expiresAt: number }>();

function cleanupExpiredTokens(now: number) {
  for (const [token, session] of tokens.entries()) {
    if (session.expiresAt <= now) {
      tokens.delete(token);
    }
  }
}

export function createToken(username = '', options?: { ttlMs?: number }): string {
  const now = Date.now();
  cleanupExpiredTokens(now);

  const token = crypto.randomUUID();
  tokens.set(token, { username, expiresAt: now + (options?.ttlMs ?? TOKEN_TTL_MS) });
  return token;
}

export function createDemoToken(username: string): string {
  return createToken(username, { ttlMs: DEMO_TOKEN_TTL_MS });
}

export function isValidToken(token: string | undefined): boolean {
  if (!token) return false;

  const now = Date.now();
  cleanupExpiredTokens(now);

  const session = tokens.get(token);
  if (!session) return false;
  if (session.expiresAt <= now) {
    tokens.delete(token);
    return false;
  }

  return true;
}

export function getTokenUsername(token: string | undefined): string | null {
  if (!isValidToken(token)) return null;
  return token ? tokens.get(token)?.username || null : null;
}

export function removeToken(token: string): void {
  tokens.delete(token);
}

export function clearTokensForTest(): void {
  tokens.clear();
}
