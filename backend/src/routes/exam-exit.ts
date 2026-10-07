import { Hono } from 'hono';
import { z } from 'zod';

const exitBodySchema = z.object({
  password: z.string().min(1),
});

export function examExitRoutes(validPassword: string) {
  const app = new Hono();

  app.post('/', async (c) => {
    if (!validPassword) {
      return c.json({ error: 'exit_password_unconfigured', message: 'Kata sandi pengawas belum dikonfigurasi.' }, 400);
    }

    const parsed = exitBodySchema.safeParse(await c.req.json());
    if (!parsed.success || parsed.data.password !== validPassword) {
      return c.json({ error: 'invalid_exit_password', message: 'Kata sandi pengawas salah.' }, 403);
    }

    return c.json({ authorized: true });
  });

  return app;
}
