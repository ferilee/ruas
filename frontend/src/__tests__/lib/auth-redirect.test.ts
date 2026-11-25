import { beforeEach, describe, expect, it } from 'vitest';
import { AUTH_RETURN_DESTINATION_KEY, consumeAuthReturnDestination, isSafeInternalPath, saveAuthReturnDestination } from '@/lib/auth-redirect';

beforeEach(() => {
  sessionStorage.clear();
});

describe('isSafeInternalPath', () => {
  it('accepts internal paths including query strings', () => {
    expect(isSafeInternalPath('/admin')).toBe(true);
    expect(isSafeInternalPath('/admin?section=schedule')).toBe(true);
    expect(isSafeInternalPath('/')).toBe(true);
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(isSafeInternalPath('https://evil.example/admin')).toBe(false);
    expect(isSafeInternalPath('//evil.example/admin')).toBe(false);
    expect(isSafeInternalPath('/\\evil.example')).toBe(false);
    expect(isSafeInternalPath('admin')).toBe(false);
    expect(isSafeInternalPath('')).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
    expect(isSafeInternalPath(undefined)).toBe(false);
    expect(isSafeInternalPath(42)).toBe(false);
  });
});

describe('saveAuthReturnDestination / consumeAuthReturnDestination', () => {
  it('round-trips a saved destination exactly once', () => {
    saveAuthReturnDestination('/admin?section=users');
    expect(sessionStorage.getItem(AUTH_RETURN_DESTINATION_KEY)).toBe('/admin?section=users');
    expect(consumeAuthReturnDestination()).toBe('/admin?section=users');
    expect(consumeAuthReturnDestination()).toBeNull();
    expect(sessionStorage.getItem(AUTH_RETURN_DESTINATION_KEY)).toBeNull();
  });

  it('never stores unsafe destinations or the login page itself', () => {
    saveAuthReturnDestination('//evil.example/admin');
    expect(sessionStorage.getItem(AUTH_RETURN_DESTINATION_KEY)).toBeNull();
    saveAuthReturnDestination('/auth');
    expect(sessionStorage.getItem(AUTH_RETURN_DESTINATION_KEY)).toBeNull();
  });

  it('drops unsafe values that were placed in storage directly', () => {
    sessionStorage.setItem(AUTH_RETURN_DESTINATION_KEY, '//evil.example/admin');
    expect(consumeAuthReturnDestination()).toBeNull();
    expect(sessionStorage.getItem(AUTH_RETURN_DESTINATION_KEY)).toBeNull();
  });

  it('returns null when nothing was saved', () => {
    expect(consumeAuthReturnDestination()).toBeNull();
  });
});
