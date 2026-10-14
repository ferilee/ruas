import { describe, expect, it, vi } from 'vitest';
import { publishRealtimeEvent, subscribeRealtime } from '@/lib/realtime-events';

describe('realtime events', () => {
  it('publishes an event to active subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRealtime(listener);

    const event = publishRealtimeEvent({ resource: 'attempts', method: 'POST', path: '/api/exam/attempts' });

    expect(listener).toHaveBeenCalledWith(event);
    expect(event.type).toBe('data.changed');
    expect(event.id).toEqual(expect.any(String));
    expect(event.occurred_at).toEqual(expect.any(String));
    unsubscribe();
  });

  it('stops delivering events after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRealtime(listener);
    unsubscribe();

    publishRealtimeEvent({ resource: 'users', method: 'PATCH', path: '/api/admin/users/1' });

    expect(listener).not.toHaveBeenCalled();
  });
});
