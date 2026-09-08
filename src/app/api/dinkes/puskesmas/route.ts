import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { hashPassword } from '@/lib/password';
import { smartTitle } from '@/lib/names';
import {
  generateHealthCenterCode,
  generateUniquePuskesmasUsername,
  getPuskesmasDefaultPassword,
} from '@/lib/accounts';

export async function GET() {
  try {
    const session = await requireRole(undefined, ['DINKES']);
    if (session instanceof NextResponse) return session;

    const healthCenters = await prisma.healthCenter.findMany({
      include: {
        kapanewon: { select: { name: true } },
        posyandus: {
          include: {
            kalurahan: { select: { name: true } },
            users: { select: { id: true, username: true, mustChangePassword: true } },
            _count: { select: { patients: true, measurements: true } },
          },
          orderBy: { name: 'asc' },
        },
        users: {
          select: { id: true, username: true, mustChangePassword: true },
        },
        _count: {
          select: { posyandus: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Flatten relasi agar bentuk respons tetap stabil utk konsumen (dashboard).
    const data = healthCenters.map((hc) => ({
      ...hc,
      kapanewon: hc.kapanewon.name,
      posyandus: hc.posyandus.map((pos) => ({
        ...pos,
        kalurahan: pos.kalurahan.name,
      })),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching puskesmas:', error);
    return NextResponse.json({ error: 'Gagal memuat data Puskesmas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES']);
    if (session instanceof NextResponse) return session;

    const { name, kapanewonId } = await req.json();

    if (!name || !kapanewonId) {
      return NextResponse.json(
        { error: 'Nama Puskesmas dan Kapanewon wajib diisi' },
        { status: 400 }
      );
    }

    const kapanewon = await prisma.kapanewon.findUnique({ where: { id: kapanewonId } });
    if (!kapanewon) {
      return NextResponse.json({ error: 'Kapanewon tidak ditemukan.' }, { status: 400 });
    }

    const cleanName = smartTitle(name.trim());
    const code = await generateHealthCenterCode(kapanewon.code);
    const username = await generateUniquePuskesmasUsername(cleanName);
    const defaultPassword = getPuskesmasDefaultPassword();
    const hashedPassword = await hashPassword(defaultPassword);

    const result = await prisma.$transaction(async (tx) => {
      const healthCenter = await tx.healthCenter.create({
        data: {
          code,
          name: cleanName,
          kapanewonId: kapanewon.id,
        },
      });

      const user = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          name: cleanName,
          role: 'PUSKESMAS',
          healthCenterId: healthCenter.id,
          mustChangePassword: true,
        },
      });

      return {
        healthCenter: {
          id: healthCenter.id,
          code: healthCenter.code,
          name: healthCenter.name,
          kapanewon: kapanewon.name,
        },
        user: { id: user.id, username: user.username, name: user.name, role: user.role },
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error registering puskesmas:', error);
    return NextResponse.json({ error: 'Gagal mendaftarkan Puskesmas' }, { status: 500 });
  }
}
