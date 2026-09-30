import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { hashPassword } from '@/lib/password';
import { smartTitle, romanToNumber } from '@/lib/names';
import { extractSearchTokens } from '@/lib/search';
import {
  generateHealthCenterCode,
  generateUniquePuskesmasUsername,
  getPuskesmasDefaultPassword,
} from '@/lib/accounts';

const ARABIC_TO_ROMAN: Record<string, string> = {
  '1': 'I',
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  '5': 'V',
  '6': 'VI',
  '7': 'VII',
  '8': 'VIII',
  '9': 'IX',
  '10': 'X',
};

export async function GET(req: Request) {
  try {
    const session = await requireRole(undefined, ['DINKES']);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q) {
      const tokens = extractSearchTokens(q);
      const tokenConditions = (tokens.length > 0 ? tokens : [q]).map((token) => {
        const variants = [token];
        if (/^\d+$/.test(token)) {
          const roman = ARABIC_TO_ROMAN[token];
          if (roman) variants.push(roman);
          if (token.length === 1) variants.push(`0${token}`);
        }
        const arabic = romanToNumber(token);
        if (arabic !== null) {
          variants.push(String(arabic));
          if (arabic < 10) variants.push(`0${arabic}`);
        }
        return variants;
      });

      const healthCenters = await prisma.healthCenter.findMany({
        where: {
          AND: tokenConditions.map((variants) => ({
            OR: variants.flatMap((v) => [
              { name: { contains: v, mode: 'insensitive' as const } },
              { code: { contains: v, mode: 'insensitive' as const } },
              { kapanewon: { name: { contains: v, mode: 'insensitive' as const } } },
              {
                posyandus: {
                  some: {
                    OR: [
                      { name: { contains: v, mode: 'insensitive' as const } },
                      { code: { contains: v, mode: 'insensitive' as const } },
                      { padukuhan: { contains: v, mode: 'insensitive' as const } },
                      { kalurahan: { name: { contains: v, mode: 'insensitive' as const } } },
                    ],
                  },
                },
              },
            ]),
          })),
        },
        include: {
          kapanewon: { select: { name: true } },
          users: {
            select: { id: true, username: true, mustChangePassword: true, disabledAt: true },
          },
          posyandus: {
            where: {
              AND: tokenConditions.map((variants) => ({
                OR: variants.flatMap((v) => [
                  { name: { contains: v, mode: 'insensitive' as const } },
                  { code: { contains: v, mode: 'insensitive' as const } },
                  { padukuhan: { contains: v, mode: 'insensitive' as const } },
                  { kalurahan: { name: { contains: v, mode: 'insensitive' as const } } },
                  { healthCenter: { name: { contains: v, mode: 'insensitive' as const } } },
                ]),
              })),
            },
            include: {
              kalurahan: { select: { name: true } },
              users: { select: { id: true, username: true, mustChangePassword: true } },
              _count: { select: { patients: true, measurements: true } },
            },
            orderBy: { name: 'asc' },
          },
          _count: {
            select: { posyandus: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      const data = healthCenters.map((hc) => ({
        id: hc.id,
        code: hc.code,
        name: hc.name,
        kapanewon: hc.kapanewon.name,
        users: hc.users,
        _count: hc._count,
        posyandus: hc.posyandus.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          padukuhan: p.padukuhan,
          kalurahan: p.kalurahan.name,
          users: p.users,
          _count: p._count,
        })),
      }));

      return NextResponse.json({ success: true, data });
    }

    const healthCenters = await prisma.healthCenter.findMany({
      include: {
        kapanewon: { select: { name: true } },
        users: {
          select: { id: true, username: true, mustChangePassword: true, disabledAt: true },
        },
        _count: {
          select: { posyandus: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Flatten relasi agar bentuk respons tetap stabil utk konsumen (dashboard).
    // Posyandu di-load secara on-demand saat kartu puskesmas di-expand.
    const data = healthCenters.map((hc) => ({
      ...hc,
      kapanewon: hc.kapanewon.name,
      posyandus: [],
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
