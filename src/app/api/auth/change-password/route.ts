import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { requireAuth } from '@/lib/api-auth';
import { createSession, buildSetCookieHeader, isSecureRequest, type SessionPayload } from '@/lib/session';
import { getUserBySession } from '@/lib/user-profile';

export async function POST(req: Request) {
  try {
    // Verify server-side authentication
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Password Saat Ini dan Password Baru wajib diisi' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < 8) {
      return NextResponse.json(
        { error: 'Password baru minimal 8 karakter' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    // Verify current password
    const currentValid = await verifyPassword(currentPassword, user.password);
    if (!currentValid) {
      return NextResponse.json({ error: 'Password saat ini salah' }, { status: 401 });
    }

    // Tolak password baru yang sama dengan yang lama (termasuk password default bawaan).
    const sameAsCurrent = await verifyPassword(newPassword.trim(), user.password);
    if (sameAsCurrent) {
      return NextResponse.json(
        { error: 'Password baru tidak boleh sama dengan password saat ini' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNew = await hashPassword(newPassword.trim());

    // Update password + naikkan tokenVersion → semua sesi lain langsung dicabut.
    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        password: hashedNew,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });

    // Terbitkan sesi baru utk perangkat ini agar tidak ikut ter-logout.
    const fresh = await getUserBySession(updated.id);
    if (!fresh) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
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
    const response = NextResponse.json({
      success: true,
      message: 'Password Anda berhasil diperbarui!',
    });
    response.headers.set('Set-Cookie', buildSetCookieHeader(token, { secure: isSecureRequest(req) }));
    return response;
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memperbarui password' },
      { status: 500 }
    );
  }
}
