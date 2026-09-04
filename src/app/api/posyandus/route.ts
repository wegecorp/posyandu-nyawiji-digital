import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const healthCenterId = searchParams.get('healthCenterId');

    const whereClause: any = {};
    if (healthCenterId) {
      whereClause.id = healthCenterId;
    }

    const healthCenters = await prisma.healthCenter.findMany({
      where: whereClause,
      include: {
        posyandus: {
          include: {
            users: {
              select: { username: true },
            },
            _count: {
              select: { patients: true, measurements: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: healthCenters });
  } catch (error) {
    console.error('Error fetching posyandus:', error);
    return NextResponse.json({ error: 'Gagal memuat data Posyandu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, kalurahan, padukuhan, healthCenterId, username, password } = await req.json();

    if (!name || !healthCenterId || !username || !password) {
      return NextResponse.json(
        { error: 'Nama Posyandu, Puskesmas Pembina, Username, dan Password wajib diisi' },
        { status: 400 }
      );
    }

    // Generate unique sequential Posyandu Code
    const count = await prisma.posyandu.count();
    const code = `POS-GK-${String(count + 1).padStart(3, '0')}`;

    const cleanUsername = username.toLowerCase().trim();

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username posyandu ini sudah digunakan' }, { status: 400 });
    }

    // Create Posyandu and its Posyandu institutional account in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const posyandu = await tx.posyandu.create({
        data: {
          code,
          name: name.trim(),
          kalurahan: kalurahan ? kalurahan.trim() : '-',
          padukuhan: padukuhan ? padukuhan.trim() : '-',
          healthCenterId,
        },
      });

      const user = await tx.user.create({
        data: {
          username: cleanUsername,
          password: password.trim(),
          name: name.trim(),
          role: 'POSYANDU',
          posyanduId: posyandu.id,
        },
      });

      return { posyandu, user };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error registering posyandu:', error);
    return NextResponse.json({ error: error.message || 'Gagal mendaftarkan Posyandu' }, { status: 500 });
  }
}
