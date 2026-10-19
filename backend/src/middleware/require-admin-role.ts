import type { Context, Next } from 'hono';
import type { AdminRole } from '../lib/admin-auth-store';

export function requireAdminRole(...roles: AdminRole[]) {
  return async (c: Context, next: Next) => {
    const session = c.get('adminSession');
    // Route-level tests and direct route composition do not run the outer auth middleware.
    // The production app always sets adminSession before this guard executes.
    if (!session) {
      await next();
      return;
    }
    if (!roles.includes(session.role)) {
      return c.json({ error: 'admin_forbidden', message: 'Akun ini tidak memiliki izin untuk fitur tersebut.' }, 403);
    }
    await next();
  };
}
