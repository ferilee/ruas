export interface RealtimeEvent {
  id: string;
  type: 'data.changed';
  occurred_at: string;
  resource: string;
  method: string;
  path: string;
}

type RealtimeListener = (event: RealtimeEvent) => void;

const listeners = new Set<RealtimeListener>();

export function subscribeRealtime(listener: RealtimeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishRealtimeEvent(input: Omit<RealtimeEvent, 'id' | 'type' | 'occurred_at'>) {
  const event: RealtimeEvent = {
    id: crypto.randomUUID(),
    type: 'data.changed',
    occurred_at: new Date().toISOString(),
    ...input,
  };

  for (const listener of listeners) listener(event);
  return event;
}
