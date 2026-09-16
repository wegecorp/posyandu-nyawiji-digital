import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requireRole } from '@/lib/api-auth';
import { hashPassword } from '@/lib/password';
import { generatePosyanduCode, buildPosyanduUsername, getPosyanduDefaultPassword } from '@/lib/accounts';
import { smartTitle } from '@/lib/names';

export async function GET(req: Request) {
  try {
    const session = await requireRole(undefined, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;

    // POSYANDU cukup melihat posyandu dirinya sendiri — TANPA data user akun lain.
    if (session.role === 'POSYANDU') {
      if (!session.posyanduId) {
        return NextResponse.json({ success: true, data: [] });
      }
      const own = await prisma.posyandu.findUnique({
        where: { id: session.posyanduId },
        include: {
          kalurahan: { select: { name: true, code: true } },
          healthCenter: { select: { id: true, name: true } },
        },
      });
      if (!own) return NextResponse.json({ success: true, data: [] });
      return NextResponse.json({
        success: true,
        data: [
          {
            id: own.healthCenter.id,
            name: own.healthCenter.name,
            code: '',
            kapanewon: '',
            posyandus: [
              {
                id: own.id,
                code: own.code,
                name: own.name,
                padukuhan: own.padukuhan,
                kalurahan: own.kalurahan.name,
                kalurahanCode: own.kalurahan.code,
                healthCenterId: own.healthCenter.id,
              },
            ],
          },
        ],
      });
    }

    const { searchParams } = new URL(req.url);
    const healthCenterId = searchParams.get('healthCenterId');

    const whereClause: Prisma.HealthCenterWhereInput = {};

    if (session.role === 'PUSKESMAS') {
      whereClause.id = session.healthCenterId ?? '';
    } else if (healthCenterId) {
      whereClause.id = healthCenterId;
    }

    const healthCenters = await prisma.healthCenter.findMany({
      where: whereClause,
      include: {
        kapanewon: { select: { name: true } },
        posyandus: {
          include: {
            kalurahan: { select: { name: true, code: true } },
            users: { select: { id: true, username: true, mustChangePassword: true, disabledAt: true } },
            _count: { select: { patients: true, measurements: true } },
          },
          orderBy: [{ kalurahan: { name: 'asc' } }, { name: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = healthCenters.map((hc) => ({
      ...hc,
      kapanewon: hc.kapanewon.name,
      posyandus: hc.posyandus.map((pos) => ({
        ...pos,
        kalurahan: pos.kalurahan.name,
        kalurahanCode: pos.kalurahan.code,
      })),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching posyandus:', error);
    return NextResponse.json({ error: 'Gagal memuat data Posyandu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS']);
    if (session instanceof NextResponse) return session;

    const { name, kalurahanId, padukuhan, healthCenterId } = await req.json();

    // Puskesmas membuat posyandu di bawah dirinya sendiri; DINKES boleh tunjuk puskesmas.
    const targetHealthCenterId = session.role === 'PUSKESMAS' ? session.healthCenterId : healthCenterId;

    if (!name || !kalurahanId || !targetHealthCenterId) {
      return NextResponse.json(
        { error: 'Nama Posyandu, Kalurahan, dan Puskesmas Pembina wajib diisi' },
        { status: 400 }
      );
    }

    const hc = await prisma.healthCenter.findUnique({
      where: { id: targetHealthCenterId },
      include: { kapanewon: true },
    });
    if (!hc) {
      return NextResponse.json({ error: 'Puskesmas Pembina tidak ditemukan.' }, { status: 400 });
    }

    const kalurahan = await prisma.kalurahan.findUnique({
      where: { id: kalurahanId },
      include: { kapanewon: true },
    });
    if (!kalurahan) {
      return NextResponse.json({ error: 'Kalurahan tidak ditemukan.' }, { status: 400 });
    }

    // Posyandu harus berada di wilayah (kapanewon) puskesmas pembinanya.
    if (kalurahan.kapanewonId !== hc.kapanewonId) {
      return NextResponse.json(
        { error: 'Kalurahan di luar wilayah kapanewon Puskesmas Pembina.' },
        { status: 400 }
      );
    }

    const code = await generatePosyanduCode(hc.code);
    const cleanName = smartTitle(name.trim());
    const cleanPadukuhan = smartTitle(padukuhan?.trim() || '-');
    const defaultPassword = getPosyanduDefaultPassword();
    const hashedPassword = await hashPassword(defaultPassword);
    const username = buildPosyanduUsername(code);

    const result = await prisma.$transaction(async (tx) => {
      const posyandu = await tx.posyandu.create({
        data: {
          code,
          name: cleanName,
          kalurahanId: kalurahan.id,
          padukuhan: cleanPadukuhan,
          healthCenterId: targetHealthCenterId,
        },
      });

      const user = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          name: cleanName,
          role: 'POSYANDU',
          posyanduId: posyandu.id,
          mustChangePassword: true,
        },
      });

      return { posyandu, user: { id: user.id, role: user.role } };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error registering posyandu:', error);
    return NextResponse.json({ error: 'Gagal mendaftarkan Posyandu' }, { status: 500 });
  }
}
