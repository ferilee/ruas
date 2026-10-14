export const ADMIN_REALTIME_EVENT = 'ruas:admin-realtime';

export type AdminRealtimeStatus = 'connecting' | 'connected' | 'disconnected';

export interface AdminRealtimeEvent {
  id: string;
  type: 'data.changed';
  occurred_at: string;
  resource: string;
  method: string;
  path: string;
}

export function connectAdminRealtime(
  onEvent: (event: AdminRealtimeEvent) => void,
  onStatus: (status: AdminRealtimeStatus) => void,
) {
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  async function connect() {
    if (stopped) return;
    onStatus('connecting');
    controller = new AbortController();

    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/admin/realtime', {
        headers: { Accept: 'text/event-stream', 'x-admin-token': token ?? '' },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error('Realtime connection failed');

      onStatus('connected');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!stopped) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const data = frame
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n');
          if (!data) continue;
          try {
            const event = JSON.parse(data) as Partial<AdminRealtimeEvent>;
            if (event.type === 'data.changed' && event.id && event.resource && event.method && event.path && event.occurred_at) onEvent(event as AdminRealtimeEvent);
          } catch {
            // Keep the connection alive if a malformed frame arrives.
          }
        }
      }
    } catch {
      // Reconnect below unless the component has already been unmounted.
    }

    if (!stopped) {
      onStatus('disconnected');
      retryTimer = setTimeout(() => void connect(), 3_000);
    }
  }

  void connect();

  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    controller?.abort();
    onStatus('disconnected');
  };
}

export function dispatchAdminRealtimeEvent(event: AdminRealtimeEvent) {
  window.dispatchEvent(new CustomEvent<AdminRealtimeEvent>(ADMIN_REALTIME_EVENT, { detail: event }));
}
