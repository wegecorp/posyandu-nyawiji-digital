import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/puskesmas/[puskesmasId]/kalurahan
// Langkah 2 login cascade: kalurahan yang memiliki posyandu di puskesmas tsb.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ puskesmasId: string }> }
) {
  try {
    const { puskesmasId } = await params;

    const posyandus = await prisma.posyandu.findMany({
      where: { healthCenterId: puskesmasId },
      select: { kalurahanId: true },
      distinct: ['kalurahanId'],
    });

    if (posyandus.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const kalurahan = await prisma.kalurahan.findMany({
      where: { id: { in: posyandus.map((p) => p.kalurahanId) } },
      select: {
        id: true,
        name: true,
        _count: { select: { posyandus: { where: { healthCenterId: puskesmasId } } } },
      },
      orderBy: { name: 'asc' },
    });

    const data = kalurahan.map((k) => ({
      id: k.id,
      name: k.name,
      posyanduCount: k._count.posyandus,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching kalurahan for cascade:', error);
    return NextResponse.json({ error: 'Gagal memuat data Kalurahan' }, { status: 500 });
  }
}
