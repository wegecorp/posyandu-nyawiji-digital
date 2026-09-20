import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/puskesmas/[puskesmasId]/posyandu?kalurahanId=...
// Langkah 3 login cascade: daftar posyandu di puskesma + kalurahan tertentu.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ puskesmasId: string }> }
) {
  try {
    const { puskesmasId } = await params;
    const { searchParams } = new URL(req.url);
    const kalurahanId = searchParams.get('kalurahanId');

    if (!kalurahanId) {
      return NextResponse.json({ error: 'Kalurahan wajib dipilih' }, { status: 400 });
    }

    const posyandus = await prisma.posyandu.findMany({
      where: { healthCenterId: puskesmasId, kalurahanId },
      select: {
        id: true,
        code: true,
        name: true,
        padukuhan: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      { success: true, data: posyandus },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching posyandu for cascade:', error);
    return NextResponse.json({ error: 'Gagal memuat data Posyandu' }, { status: 500 });
  }
}
