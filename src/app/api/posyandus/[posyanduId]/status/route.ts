import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';

// POST /api/posyandus/[posyanduId]/status   { disabled: boolean }
// Nonaktifkan / aktifkan akun Posyandu. Saat nonaktif: tokenVersion dinaikkan
// sehingga semua sesi lama tercabut, dan login ditolak.
// Diizinkan: PUSKESMAS untuk posyandu binaannya, DINKES untuk semua.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ posyanduId: string }> }
) {
  try {
    const session = await requireRole(req, ['PUSKESMAS', 'DINKES']);
    if (session instanceof NextResponse) return session;

    const { posyanduId } = await params;
    const { disabled } = await req.json();
    if (typeof disabled !== 'boolean') {
      return NextResponse.json({ error: 'Field `disabled` wajib boolean.' }, { status: 400 });
    }

    const posyandu = await prisma.posyandu.findUnique({
      where: { id: posyanduId },
      select: { id: true, healthCenterId: true },
    });
    if (!posyandu) {
      return NextResponse.json({ error: 'Posyandu tidak ditemukan.' }, { status: 404 });
    }
    if (session.role === 'PUSKESMAS' && posyandu.healthCenterId !== session.healthCenterId) {
      return NextResponse.json({ error: 'Bukan posyandu binaan Anda.' }, { status: 403 });
    }

    const user = await prisma.user.findFirst({
      where: { posyanduId, role: 'POSYANDU' },
      select: { id: true, disabledAt: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Akun Posyandu tidak ditemukan.' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        disabledAt: disabled ? new Date() : null,
        ...(disabled ? { tokenVersion: { increment: 1 } } : {}),
      },
      select: { id: true, disabledAt: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating posyandu status:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status Posyandu' }, { status: 500 });
  }
}
