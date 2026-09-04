import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'posyandu_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

// Secret key for JWT signing — in production, use a proper env var
function getSecretKey() {
  const secret = process.env.SESSION_SECRET || 'posyandu-digital-gk-secret-key-change-in-production';
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

export function buildSetCookieHeader(token: string): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${SESSION_MAX_AGE}`,
  ];
  // Add Secure flag in production
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export const clearSessionCookie = buildClearCookieHeader;

export { SESSION_COOKIE_NAME };
