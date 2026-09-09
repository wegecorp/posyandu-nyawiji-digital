import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { requireAuth } from '@/lib/api-auth';

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

    // Update password (+ pastikan status aktivasi selesai)
    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        password: hashedNew,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password Anda berhasil diperbarui!',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memperbarui password' },
      { status: 500 }
    );
  }
}
