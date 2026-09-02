import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const COST = 16384
const BLOCK_SIZE = 8
const PARALLELIZATION = 1

export function hashPassword(password: string) {
  if (password.length < 10) throw new Error('Password must contain at least 10 characters')
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  })
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export function verifyPassword(password: string, encoded: string) {
  try {
    const [algorithm, cost, blockSize, parallelization, saltValue, hashValue] = encoded.split('$')
    if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false
    const expected = Buffer.from(hashValue, 'base64url')
    const actual = scryptSync(password, Buffer.from(saltValue, 'base64url'), expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
      maxmem: 64 * 1024 * 1024,
    })
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}
