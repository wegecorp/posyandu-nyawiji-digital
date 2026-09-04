import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, buildSetCookieHeader, type SessionPayload } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Format input tidak valid' }, { status: 400 });
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
    const envDinkesUser = (process.env.DINKES_ADMIN_USERNAME || '').toLowerCase().trim();
    const envDinkesPass = process.env.DINKES_ADMIN_PASSWORD || '';

    if (!user && envDinkesUser && envDinkesPass && cleanUsername === envDinkesUser && password === envDinkesPass) {
      const hashedPass = await hashPassword(envDinkesPass);
      user = await prisma.user.create({
        data: {
          username: envDinkesUser,
          password: hashedPass,
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

    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
    }

    // Migrate plaintext password to hash on successful login
    const { isPasswordHashed } = await import('@/lib/password');
    if (!isPasswordHashed(user.password)) {
      const hashed = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
    }

    // Build session payload based on role
    const sessionPayload: SessionPayload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role as SessionPayload['role'],
    };

    if (user.role === 'POSYANDU' && user.posyandu) {
      sessionPayload.posyanduId = user.posyandu.id;
    }
    if ((user.role === 'PUSKESMAS' || user.role === 'POSYANDU') && (user.healthCenter || user.posyandu?.healthCenter)) {
      sessionPayload.healthCenterId = user.healthCenter?.id || user.posyandu?.healthCenterId || null;
    }

    // Create JWT and set httpOnly cookie
    const token = await createSession(sessionPayload);

    // Build client-safe user data (no password, no sensitive internals)
    const clientPayload: Record<string, any> = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    if (user.role === 'POSYANDU' && user.posyandu) {
      clientPayload.posyanduId = user.posyandu.id;
      clientPayload.posyanduName = user.posyandu.name;
      clientPayload.posyanduCode = user.posyandu.code;
      clientPayload.healthCenterId = user.posyandu.healthCenterId;
      clientPayload.healthCenterName = user.posyandu.healthCenter?.name || null;
    } else if (user.role === 'PUSKESMAS' && user.healthCenter) {
      clientPayload.healthCenterId = user.healthCenter.id;
      clientPayload.healthCenterName = user.healthCenter.name;
    }

    const response = NextResponse.json({ success: true, user: clientPayload });
    response.headers.set('Set-Cookie', buildSetCookieHeader(token));
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
