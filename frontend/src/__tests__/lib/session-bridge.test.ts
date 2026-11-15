import { beforeEach, describe, expect, it } from 'vitest';
import { consumeSessionBridge, extractBridgeSessionToken } from '@/lib/session-bridge';

describe('extractBridgeSessionToken', () => {
  it('reads the session token from the bridge fragment', () => {
    expect(extractBridgeSessionToken('#simak-sesi=token-abc')).toBe('token-abc');
  });

  it('returns null without the bridge fragment', () => {
    expect(extractBridgeSessionToken('')).toBeNull();
    expect(extractBridgeSessionToken('#bagian-lain')).toBeNull();
    expect(extractBridgeSessionToken('#simak-sesi=')).toBeNull();
  });
});

describe('consumeSessionBridge', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('stores the token as a normal login session and cleans the fragment', () => {
    window.history.pushState({}, '', '/quiz/7?subject_id=3#simak-sesi=token-abc');
    expect(consumeSessionBridge()).toBe(true);
    expect(sessionStorage.getItem('auth_token')).toBe('token-abc');
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/quiz/7');
    expect(window.location.search).toBe('?subject_id=3');
  });

  it('does nothing on a normal page load', () => {
    window.history.pushState({}, '', '/');
    expect(consumeSessionBridge()).toBe(false);
    expect(sessionStorage.getItem('auth_token')).toBeNull();
  });
});
