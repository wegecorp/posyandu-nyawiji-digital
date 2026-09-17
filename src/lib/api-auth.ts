import { NextResponse } from 'next/server';
import { verifySession, getSessionFromCookies, SESSION_COOKIE_NAME, type SessionPayload } from './session';
import { prisma } from './prisma';

/**
 * Cocokkan tokenVersion JWT dengan DB. Beda = sesi sudah dicabut (logout,
 * ganti password, atau reset oleh admin). Sesi lama tanpa tokenVersion
 * (terbit sebelum fitur ini) juga ditolak → paksa login ulang sekali.
 */
async function isSessionFresh(payload: SessionPayload | null): Promise<SessionPayload | null> {
  if (!payload) return null;
  if (typeof payload.tokenVersion !== 'number') return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { tokenVersion: true, disabledAt: true },
  });
  if (!user || user.tokenVersion !== payload.tokenVersion) return null;
  if (user.disabledAt) return null; // akun dinonaktifkan
  return payload;
}

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
      if (payload) return isSessionFresh(payload);
    }
  }
  return isSessionFresh(await getSessionFromCookies());
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
 * DINKES boleh mem-filter health center mana pun. Peran lain hanya HC sendiri.
 * Return 403 bila melanggar, null bila lolos.
 */
export function assertHcFilter(
  session: SessionPayload,
  hcId: string | null
): NextResponse | null {
  if (!hcId || session.role === 'DINKES') return null;
  if (session.role === 'PUSKESMAS' && session.healthCenterId === hcId) return null;
  return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
}

/**
 * Peran lokasi (POSYANDU/PUSKESMAS) WAJIB punya id cakupan. Bila sesi kehilangan
 * id (akun orphan / sesi lama), JANGAN jatuh ke "semua unit" — tolak (fail-closed).
 * DINKES tidak dibatasi. Return 403 bila melanggar, null bila lolos.
 */
export function requireSessionScope(session: SessionPayload): NextResponse | null {
  if (session.role === 'POSYANDU' && !session.posyanduId) {
    return NextResponse.json(
      { error: 'Akses ditolak — sesi tanpa cakupan posyandu.' },
      { status: 403 },
    );
  }
  if (session.role === 'PUSKESMAS' && !session.healthCenterId) {
    return NextResponse.json(
      { error: 'Akses ditolak — sesi tanpa cakupan puskesmas.' },
      { status: 403 },
    );
  }
  return null;
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
