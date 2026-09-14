import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, buildSetCookieHeader, isSecureRequest, type SessionPayload } from '@/lib/session';
import { isRateLimited, getClientKey } from '@/lib/rate-limit';
import { getUserBySession, serializeUser } from '@/lib/user-profile';

// POST /api/auth/login
// Mode 'staff'   : { mode:'staff', username, password }   -> DINKES / PUSKESMAS
// Mode 'posyandu': { mode:'posyandu', posyanduId, password } -> kader (login cascade)
export async function POST(req: Request) {
  try {
    if (isRateLimited({ key: getClientKey(req, 'login'), limit: 20, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json();
    const { mode, username, posyanduId, password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password wajib diisi' }, { status: 400 });
    }

    let user;

    if (mode === 'posyandu') {
      if (!posyanduId) {
        return NextResponse.json({ error: 'Pilih posyandu terlebih dahulu' }, { status: 400 });
      }
      user = await prisma.user.findFirst({
        where: { posyanduId, role: 'POSYANDU' },
      });
      if (!user) {
        return NextResponse.json({ error: 'Akun posyandu tidak ditemukan.' }, { status: 401 });
      }
    } else {
      // Staff (DINKES/PUSKESMAS) default
      if (!username || typeof username !== 'string') {
        return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
      }
      const cleanUsername = username.toLowerCase().trim();

      user = await prisma.user.findUnique({ where: { username: cleanUsername } });

      // Auto-bootstrap Dinkes Super Admin bila DB kosong & login cocok dgn env.
      const envDinkesUser = (process.env.DINKES_ADMIN_USERNAME || '').toLowerCase().trim();
      const envDinkesPass = process.env.DINKES_ADMIN_PASSWORD || '';
      if (!user && envDinkesUser && envDinkesPass && cleanUsername === envDinkesUser && password === envDinkesPass) {
        const hashedPass = await hashPassword(envDinkesPass);
        user = await prisma.user.create({
          data: {
            username: envDinkesUser,
            password: hashedPass,
            name: 'Dinas Kesehatan Kabupaten Gunungkidul',
            role: 'DINKES',
            mustChangePassword: false,
          },
        });
      }

      if (!user) {
        return NextResponse.json({ error: 'Akun tidak ditemukan. Periksa username Anda.' }, { status: 401 });
      }
    }

    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
    }

    // Akun baru (belum aktivasi): jangan beri sesi — paksa ganti password dulu.
    if (user.mustChangePassword) {
      return NextResponse.json({
        success: true,
        needsActivation: true,
        identity: {
          mode: user.role === 'POSYANDU' ? 'posyandu' : 'staff',
          username: user.username,
          posyanduId: user.posyanduId || null,
          label: user.name,
        },
      });
    }

    const fresh = await getUserBySession(user.id);
    if (!fresh) {
      return NextResponse.json({ error: 'Gagal memuat akun.' }, { status: 500 });
    }

    const sessionPayload: SessionPayload = {
      userId: fresh.id,
      username: fresh.username,
      name: fresh.name,
      role: fresh.role as SessionPayload['role'],
      tokenVersion: fresh.tokenVersion,
    };
    if (fresh.role === 'POSYANDU' && fresh.posyandu) {
      sessionPayload.posyanduId = fresh.posyandu.id;
    }
    if ((fresh.role === 'PUSKESMAS' || fresh.role === 'POSYANDU') && (fresh.healthCenter || fresh.posyandu?.healthCenter)) {
      sessionPayload.healthCenterId = fresh.healthCenter?.id || fresh.posyandu?.healthCenterId || null;
    }

    const token = await createSession(sessionPayload);
    const response = NextResponse.json({ success: true, user: serializeUser(fresh) });
    response.headers.set('Set-Cookie', buildSetCookieHeader(token, { secure: isSecureRequest(req) }));
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
