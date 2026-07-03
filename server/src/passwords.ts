import bcrypt from 'bcrypt';

/** bcrypt work factor used for every password hash in the app. */
export const BCRYPT_COST = 12;

/** Minimum accepted password length (per-site error messages stay local). */
export const MIN_PASSWORD_LENGTH = 6;

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_COST);
}
