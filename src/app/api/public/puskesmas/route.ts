import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/puskesmas
// Public list of health centers for Posyandu registration dropdown
export async function GET() {
  try {
    let healthCenters = await prisma.healthCenter.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        kapanewon: true,
      },
      orderBy: { name: 'asc' },
    });

    // Auto-bootstrap default Puskesmas if database is fresh/empty
    if (healthCenters.length === 0) {
      const defaultHc = await prisma.healthCenter.create({
        data: {
          code: 'PKM-GK-001',
          name: 'Puskesmas Wonosari I',
          kapanewon: 'Wonosari',
        },
        select: {
          id: true,
          code: true,
          name: true,
          kapanewon: true,
        },
      });
      healthCenters = [defaultHc];
    }

    return NextResponse.json({ success: true, data: healthCenters });
  } catch (error) {
    console.error('Error fetching public puskesmas list:', error);
    return NextResponse.json({ error: 'Gagal memuat data Puskesmas' }, { status: 500 });
  }
}
