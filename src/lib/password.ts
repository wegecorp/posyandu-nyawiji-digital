import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  // Hanya hash bcrypt yang diterima. Password plaintext lama (pra-migrasi)
  // tidak lagi bisa login — akun begitu harus direset oleh admin (DINKES/Puskesmas),
  // yang akan menulis hash baru.
  if (!isPasswordHashed(hash)) return false;
  return bcrypt.compare(plaintext, hash);
}

export function isPasswordHashed(password: string): boolean {
  return password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$');
}
