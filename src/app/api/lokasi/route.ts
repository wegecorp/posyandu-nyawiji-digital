import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';

// GET /api/lokasi
// Referensi Kapanewon + Kalurahan utk dropdown pembuatan akun (DINKES/PUSKESMAS).
export async function GET() {
  try {
    const session = await requireRole(undefined, ['DINKES', 'PUSKESMAS']);
    if (session instanceof NextResponse) return session;

    const kapanewon = await prisma.kapanewon.findMany({
      include: {
        kalurahan: {
          select: { id: true, code: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: kapanewon });
  } catch (error) {
    console.error('Error fetching lokasi:', error);
    return NextResponse.json({ error: 'Gagal memuat data lokasi' }, { status: 500 });
  }
}
