import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  }).toString('hex');

  return `scrypt$${SCRYPT_COST}$${SCRYPT_BLOCK_SIZE}$${SCRYPT_PARALLELIZATION}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, cost, blockSize, parallelization, salt, expectedHex] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !cost || !blockSize || !parallelization || !salt || !expectedHex) return false;

  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = scryptSync(password, salt, expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
