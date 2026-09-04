import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const healthCenters = await prisma.healthCenter.findMany({
      include: {
        posyandus: true,
        users: {
          select: { username: true },
        },
        _count: {
          select: { posyandus: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: healthCenters });
  } catch (error) {
    console.error('Error fetching puskesmas:', error);
    return NextResponse.json({ error: 'Gagal memuat data Puskesmas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, kapanewon, username, password } = await req.json();

    if (!name || !kapanewon || !username || !password) {
      return NextResponse.json(
        { error: 'Nama Puskesmas, Kapanewon, Username, dan Password wajib diisi' },
        { status: 400 }
      );
    }

    const cleanUsername = username.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username puskesmas ini sudah digunakan' }, { status: 400 });
    }

    const count = await prisma.healthCenter.count();
    const code = `PKM-GK-${String(count + 1).padStart(3, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const healthCenter = await tx.healthCenter.create({
        data: {
          code,
          name: name.trim(),
          kapanewon: kapanewon.trim(),
        },
      });

      const user = await tx.user.create({
        data: {
          username: cleanUsername,
          password: password.trim(),
          name: name.trim(),
          role: 'PUSKESMAS',
          healthCenterId: healthCenter.id,
        },
      });

      return { healthCenter, user };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error registering puskesmas:', error);
    return NextResponse.json({ error: error.message || 'Gagal mendaftarkan Puskesmas' }, { status: 500 });
  }
}
