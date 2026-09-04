import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  // Legacy support: if stored password is not a bcrypt hash, compare plaintext
  // This allows gradual migration from plaintext to hashed passwords
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
    return plaintext === hash;
  }
  return bcrypt.compare(plaintext, hash);
}

export function isPasswordHashed(password: string): boolean {
  return password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$');
}
