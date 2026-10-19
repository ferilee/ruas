import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createPoolMock } = vi.hoisted(() => ({ createPoolMock: vi.fn() }));

vi.mock('mysql2/promise', () => ({ default: { createPool: createPoolMock } }));
vi.mock('@/config', () => ({
  loadConfig: () => ({
    DB_HOST: 'mariadb',
    DB_PORT: 3306,
    DB_USER: 'ruas',
    DB_PASSWORD: 'secret',
    DB_NAME: 'ruas_belajar',
  }),
}));

import { createPool } from '@/db/connection';

describe('createPool', () => {
  beforeEach(() => {
    createPoolMock.mockReset();
    createPoolMock.mockReturnValue({});
  });

  it('keeps multi-statements disabled for the application pool by default', () => {
    createPool();

    expect(createPoolMock).toHaveBeenCalledWith(expect.objectContaining({ multipleStatements: false }));
  });

  it('enables multi-statements for the migration pool', () => {
    createPool({ multipleStatements: true });

    expect(createPoolMock).toHaveBeenCalledWith(expect.objectContaining({ multipleStatements: true }));
  });
});
