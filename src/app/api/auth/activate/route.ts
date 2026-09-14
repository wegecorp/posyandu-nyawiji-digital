import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword } from '@/lib/password';
import { createSession, buildSetCookieHeader, isSecureRequest, type SessionPayload } from '@/lib/session';
import { isRateLimited, getClientKey } from '@/lib/rate-limit';
import { getUserBySession, serializeUser } from '@/lib/user-profile';
import { getDefaultPasswordForRole } from '@/lib/accounts';

// POST /api/auth/activate
// Aktivasi akun baru: verifikasi identitas + password default, lalu set password pribadi.
// Sukses => session dibuat & cookie diset.
export async function POST(req: Request) {
  try {
    if (isRateLimited({ key: getClientKey(req, 'activate'), limit: 10, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json();
    const { mode, username, posyanduId, currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Password saat ini dan password baru wajib diisi' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.trim().length < 8) {
      return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 });
    }

    // Cari akun sesuai mode login (staff via username, kader via posyanduId).
    let user: Awaited<ReturnType<typeof prisma.user.findUnique>>;
    if (mode === 'posyandu') {
      if (!posyanduId) {
        return NextResponse.json({ error: 'Posyandu tidak valid.' }, { status: 400 });
      }
      user = await prisma.user.findFirst({
        where: { posyanduId, role: 'POSYANDU' },
      });
      if (!user) {
        return NextResponse.json({ error: 'Akun posyandu tidak ditemukan.' }, { status: 401 });
      }
    } else if (mode === 'staff') {
      if (!username) {
        return NextResponse.json({ error: 'Username tidak valid.' }, { status: 400 });
      }
      const found = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
      if (!found) {
        return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 401 });
      }
      user = found;
    } else {
      return NextResponse.json({ error: 'Mode aktivasi tidak valid.' }, { status: 400 });
    }

    // Hanya akun yang memang belum diaktivasi.
    if (!user.mustChangePassword) {
      return NextResponse.json({ error: 'Akun ini sudah aktif.' }, { status: 400 });
    }

    const passwordValid = await verifyPassword(currentPassword, user.password);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Password saat ini salah.' }, { status: 401 });
    }

    const cleanNewPassword = newPassword.trim();
    if (cleanNewPassword === getDefaultPasswordForRole(user.role)) {
      return NextResponse.json(
        { error: 'Password baru tidak boleh sama dengan password default.' },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(cleanNewPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: false },
    });

    // Bangun sesi & cookie (sama seperti login).
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
    console.error('Activation error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
