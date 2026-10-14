import { Hono } from 'hono';
import { subscribeRealtime } from '@/lib/realtime-events';

export function adminRealtimeRoutes() {
  const app = new Hono();

  app.get('/', () => {
    const encoder = new TextEncoder();
    let closed = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let unsubscribe: () => void = () => undefined;
    let cleanup = () => undefined;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (value: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(value));
          } catch {
            cleanup();
          }
        };

        cleanup = () => {
          if (closed) return;
          closed = true;
          if (timer) clearInterval(timer);
          unsubscribe();
        };

        unsubscribe = subscribeRealtime((event) => {
          write(`event: change\ndata: ${JSON.stringify(event)}\n\n`);
        });
        write(`event: connected\ndata: ${JSON.stringify({ occurred_at: new Date().toISOString() })}\n\n`);
        timer = setInterval(() => write(': keep-alive\n\n'), 25_000);
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  });

  return app;
}
