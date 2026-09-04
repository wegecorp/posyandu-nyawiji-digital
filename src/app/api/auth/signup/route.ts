import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/auth/signup
// Handles signup for PUSKESMAS and POSYANDU institutional accounts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type } = body; // 'PUSKESMAS' or 'POSYANDU'

    if (type === 'PUSKESMAS') {
      return await signupPuskesmas(body);
    } else if (type === 'POSYANDU') {
      return await signupPosyandu(body);
    } else {
      return NextResponse.json(
        { error: 'Tipe pendaftaran tidak valid. Gunakan PUSKESMAS atau POSYANDU.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Username sudah digunakan. Pilih username lain.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

async function signupPuskesmas(body: Record<string, any>) {
  const { name, kapanewon, username, password } = body;

  if (!name?.trim() || !kapanewon?.trim() || !username?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: 'Nama Puskesmas, Kapanewon, Username, dan Password wajib diisi' },
      { status: 400 }
    );
  }

  const cleanUsername = username.toLowerCase().trim();

  // Check username uniqueness
  const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existing) {
    return NextResponse.json({ error: 'Username sudah digunakan. Pilih username lain.' }, { status: 400 });
  }

  // Generate code
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

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'PUSKESMAS',
      healthCenterId: healthCenter.id,
      healthCenterName: healthCenter.name,
    };
  });

  return NextResponse.json({ success: true, user: result });
}

async function signupPosyandu(body: Record<string, any>) {
  const { name, kalurahan, padukuhan, healthCenterId, username, password } = body;

  if (!name?.trim() || !healthCenterId || !username?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: 'Nama Posyandu, Puskesmas Pembina, Username, dan Password wajib diisi' },
      { status: 400 }
    );
  }

  const cleanUsername = username.toLowerCase().trim();

  // Check username uniqueness
  const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existing) {
    return NextResponse.json({ error: 'Username sudah digunakan. Pilih username lain.' }, { status: 400 });
  }

  // Verify health center exists
  const hc = await prisma.healthCenter.findUnique({ where: { id: healthCenterId } });
  if (!hc) {
    return NextResponse.json({ error: 'Puskesmas Pembina tidak ditemukan.' }, { status: 404 });
  }

  // Generate code
  const count = await prisma.posyandu.count();
  const code = `POS-GK-${String(count + 1).padStart(3, '0')}`;

  const result = await prisma.$transaction(async (tx) => {
    const posyandu = await tx.posyandu.create({
      data: {
        code,
        name: name.trim(),
        kalurahan: kalurahan?.trim() || '-',
        padukuhan: padukuhan?.trim() || '-',
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

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'POSYANDU',
      posyanduId: posyandu.id,
      posyanduName: posyandu.name,
      posyanduCode: posyandu.code,
      healthCenterId: hc.id,
      healthCenterName: hc.name,
    };
  });

  return NextResponse.json({ success: true, user: result });
}
