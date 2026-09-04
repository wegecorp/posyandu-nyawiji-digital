import { NextResponse } from 'next/server';
import { verifySession, getSessionFromCookies, SESSION_COOKIE_NAME, type SessionPayload } from './session';

/**
 * Extract and verify session from the request cookie or Next.js cookie store.
 * Returns the session payload or null if not authenticated.
 */
export async function getAuthSession(req?: Request): Promise<SessionPayload | null> {
  if (req) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
      const payload = await verifySession(match[1]);
      if (payload) return payload;
    }
  }
  return getSessionFromCookies();
}

/**
 * Require authentication. Returns session or sends 401 response.
 */
export async function requireAuth(
  req?: Request
): Promise<SessionPayload | NextResponse> {
  const session = await getAuthSession(req);
  if (!session) {
    return NextResponse.json(
      { error: 'Sesi tidak valid. Silakan login kembali.' },
      { status: 401 }
    );
  }
  return session;
}

/**
 * Require specific role(s). Returns session or sends 401/403 response.
 */
export async function requireRole(
  req: Request | undefined,
  allowedRoles: Array<'DINKES' | 'PUSKESMAS' | 'POSYANDU'>
): Promise<SessionPayload | NextResponse> {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  if (!allowedRoles.includes(result.role)) {
    return NextResponse.json(
      { error: 'Anda tidak memiliki akses untuk tindakan ini.' },
      { status: 403 }
    );
  }
  return result;
}
