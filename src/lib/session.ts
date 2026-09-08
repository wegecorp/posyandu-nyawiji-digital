import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'posyandu_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

// Secret key for JWT signing. WAJIB diset via env; tanpa secret di produksi,
// aplikasi sengaja gagal (fail-fast) alih-alih memakai default yang tidak aman.
function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET wajib diset di environment produksi.');
    }
    // Dev-only: jangan pernah dipakai untuk produksi.
    return new TextEncoder().encode('dev-only-insecure-secret-change-me');
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: 'DINKES' | 'PUSKESMAS' | 'POSYANDU';
  healthCenterId?: string | null;
  posyanduId?: string | null;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Deteksi apakah request datang via HTTPS. Percaya header X-Forwarded-Proto
 * (dipakai reverse proxy Nginx), lalu fallback ke URL request.
 */
export function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim().toLowerCase() === 'https';
  return req.url?.toLowerCase().startsWith('https://') ?? false;
}

/**
 * Secure flag dipasang hanya bila koneksi benar-benar HTTPS. Browser menolak
 * menyimpan cookie Secure dari koneksi HTTP -> sesi hilang tiap refresh.
 * Bila akses masih via HTTP (mis. http://IP:3000), jangan pasang Secure.
 */
export function buildSetCookieHeader(token: string, options?: { secure?: boolean }): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${SESSION_MAX_AGE}`,
  ];
  if (options?.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export const clearSessionCookie = buildClearCookieHeader;

export { SESSION_COOKIE_NAME };
