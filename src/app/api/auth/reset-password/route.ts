import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { requireAuth } from '@/lib/api-auth';

export async function POST(req: Request) {
  try {
    // Verify server-side authentication
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { targetUserId, newPassword } = await req.json();

    if (!targetUserId || !newPassword) {
      return NextResponse.json(
        { error: 'ID Akun Target dan Password Baru wajib diisi' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < 8) {
      return NextResponse.json(
        { error: 'Password baru minimal 8 karakter' },
        { status: 400 }
      );
    }

    // Authorization checks using server-verified role
    if (auth.role === 'POSYANDU') {
      return NextResponse.json(
        { error: 'Akun Posyandu tidak memiliki wewenang untuk mereset akun lain' },
        { status: 403 }
      );
    }

    // Target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { posyandu: true, healthCenter: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Akun target tidak ditemukan' }, { status: 404 });
    }

    if (auth.role === 'PUSKESMAS') {
      // Puskesmas can only reset POSYANDU accounts under its health center
      if (targetUser.role !== 'POSYANDU') {
        return NextResponse.json(
          { error: 'Puskesmas hanya dapat mereset akun Posyandu' },
          { status: 403 }
        );
      }

      if (targetUser.posyandu?.healthCenterId !== auth.healthCenterId) {
        return NextResponse.json(
          { error: 'Puskesmas hanya dapat mereset Posyandu di bawah pembinaannya' },
          { status: 403 }
        );
      }
    }

    // DINKES can reset PUSKESMAS & POSYANDU accounts
    if (auth.role === 'DINKES' && targetUser.role === 'DINKES') {
      return NextResponse.json(
        { error: 'Tidak dapat mereset akun Dinkes lain' },
        { status: 403 }
      );
    }

    // Hash new password before storing
    const hashedPassword = await hashPassword(newPassword.trim());

    // Perform password reset
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password akun ${updatedUser.username} berhasil direset!`,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat mereset password' },
      { status: 500 }
    );
  }
}
