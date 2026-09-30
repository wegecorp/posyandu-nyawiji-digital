import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractSearchTokens } from '@/lib/search';
import { romanToNumber } from '@/lib/names';

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

// GET /api/public/posyandu/search?q=...
// Pencarian langsung posyandu lintas puskesmas/kalurahan (tanpa perlu tahu hierarki dulu).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const tokens = extractSearchTokens(q);
    if (tokens.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const andConditions = tokens.map((token) => {
      const variants = [token];

      // Angka arab -> tambahkan romawi & padded
      if (/^\d+$/.test(token)) {
        const roman = ARABIC_TO_ROMAN[token];
        if (roman) variants.push(roman);
        if (token.length === 1) variants.push(`0${token}`);
      }

      // Romawi -> tambahkan arab
      const arabic = romanToNumber(token);
      if (arabic !== null) {
        variants.push(String(arabic));
        if (arabic < 10) variants.push(`0${arabic}`);
      }

      return {
        OR: variants.flatMap((v) => [
          { name: { contains: v, mode: 'insensitive' as const } },
          { padukuhan: { contains: v, mode: 'insensitive' as const } },
          { code: { contains: v, mode: 'insensitive' as const } },
          { kalurahan: { name: { contains: v, mode: 'insensitive' as const } } },
          { healthCenter: { name: { contains: v, mode: 'insensitive' as const } } },
          { healthCenter: { kapanewon: { name: { contains: v, mode: 'insensitive' as const } } } },
        ]),
      };
    });

    const posyandus = await prisma.posyandu.findMany({
      where: { AND: andConditions },
      select: {
        id: true,
        code: true,
        name: true,
        padukuhan: true,
        kalurahan: {
          select: {
            id: true,
            name: true,
          },
        },
        healthCenter: {
          select: {
            id: true,
            code: true,
            name: true,
            kapanewon: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    const data = posyandus.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      padukuhan: p.padukuhan,
      kalurahan: {
        id: p.kalurahan.id,
        name: p.kalurahan.name,
      },
      healthCenter: {
        id: p.healthCenter.id,
        code: p.healthCenter.code,
        name: p.healthCenter.name,
        kapanewon: p.healthCenter.kapanewon.name,
      },
    }));

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Error searching public posyandu:', error);
    return NextResponse.json({ error: 'Gagal mencari posyandu' }, { status: 500 });
  }
}
