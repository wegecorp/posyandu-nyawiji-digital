import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/puskesmas
// Daftar puskesmas publik (langkah pertama login cascade kader posyandu).
export async function GET() {
  try {
    const healthCenters = await prisma.healthCenter.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        kapanewon: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data = healthCenters.map((hc) => ({
      id: hc.id,
      code: hc.code,
      name: hc.name,
      kapanewon: hc.kapanewon.name,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching public puskesmas list:', error);
    return NextResponse.json({ error: 'Gagal memuat data Puskesmas' }, { status: 500 });
  }
}
