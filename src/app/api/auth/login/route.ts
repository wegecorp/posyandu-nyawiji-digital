import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();

    let user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      include: {
        posyandu: {
          include: {
            healthCenter: true,
          },
        },
        healthCenter: true,
      },
    });

    // Auto-bootstrap Dinkes Super Admin if database is fresh and login matches env
    const envDinkesUser = (process.env.DINKES_ADMIN_USERNAME || 'dinkes_gk').toLowerCase().trim();
    const envDinkesPass = process.env.DINKES_ADMIN_PASSWORD || 'adminposyandu123';

    if (!user && cleanUsername === envDinkesUser && password === envDinkesPass) {
      user = await prisma.user.create({
        data: {
          username: envDinkesUser,
          password: envDinkesPass,
          name: 'Dinas Kesehatan Kabupaten Gunungkidul',
          role: 'DINKES',
        },
        include: {
          posyandu: { include: { healthCenter: true } },
          healthCenter: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'Akun tidak ditemukan. Periksa username Anda.' }, { status: 401 });
    }

    if (user.password !== password) {
      return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
    }

    // Build session payload based on role
    const sessionPayload: Record<string, any> = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    if (user.role === 'POSYANDU' && user.posyandu) {
      sessionPayload.posyanduId = user.posyandu.id;
      sessionPayload.posyanduName = user.posyandu.name;
      sessionPayload.posyanduCode = user.posyandu.code;
      sessionPayload.healthCenterId = user.posyandu.healthCenterId;
      sessionPayload.healthCenterName = user.posyandu.healthCenter?.name || null;
    } else if (user.role === 'PUSKESMAS' && user.healthCenter) {
      sessionPayload.healthCenterId = user.healthCenter.id;
      sessionPayload.healthCenterName = user.healthCenter.name;
    }
    // DINKES gets no extra fields — they see everything

    return NextResponse.json({ success: true, user: sessionPayload });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
