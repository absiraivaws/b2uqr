import argon2 from '@node-rs/argon2';

/**
 * Hash a PIN using Argon2id. Appends a server-side pepper (from env) before hashing.
 * Returns the full encoded Argon2 hash string which includes salt and params.
 */
export async function hashPin(pin: string) {
  const pepper = process.env.PIN_PEPPER || '';
  const toHash = pin + pepper;
  // Tunable parameters - adjust for your server hardware. These are reasonable defaults.
  const opts = {
    memoryCost: 2 ** 16, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  } as const;
  return await argon2.hash(toHash, opts as any);
}

/**
 * Verify a plain PIN against a stored Argon2 hash. Uses same pepper.
 */
export async function verifyPin(pin: string, storedHash: string) {
  const pepper = process.env.PIN_PEPPER || '';
  const toCheck = pin + pepper;
  try {
    return await argon2.verify(storedHash, toCheck);
  } catch (err) {
    // For any error treat as verification failure
    console.warn('argon2 verify error', err);
    return false;
  }
}

/**
 * Heuristic: detect if a stored hash looks like an Argon2 encoded string.
 */
export function isArgonHash(storedHash: string) {
  return typeof storedHash === 'string' && storedHash.startsWith('$argon2');
}
