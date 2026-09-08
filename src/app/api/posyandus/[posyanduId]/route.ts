import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requireRole } from '@/lib/api-auth';
import { smartTitle } from '@/lib/names';

// PATCH /api/posyandus/[posyanduId]
// Ubah nama / kalurahan / padukuhan posyandu. Nama boleh duplikat; kode tidak berubah.
// Diizinkan: PUSKESMAS untuk posyandu binaannya, DINKES untuk semua.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ posyanduId: string }> }
) {
  try {
    const session = await requireRole(req, ['PUSKESMAS', 'DINKES']);
    if (session instanceof NextResponse) return session;

    const { posyanduId } = await params;
    const { name, kalurahanId, padukuhan } = await req.json();

    const posyandu = await prisma.posyandu.findUnique({
      where: { id: posyanduId },
      include: { healthCenter: { include: { kapanewon: true } } },
    });
    if (!posyandu) {
      return NextResponse.json({ error: 'Posyandu tidak ditemukan.' }, { status: 404 });
    }

    if (session.role === 'PUSKESMAS' && posyandu.healthCenterId !== session.healthCenterId) {
      return NextResponse.json({ error: 'Bukan posyandu binaan Anda.' }, { status: 403 });
    }

    const data: Prisma.PosyanduUncheckedUpdateInput = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Nama posyandu tidak boleh kosong' }, { status: 400 });
      }
      data.name = smartTitle(name.trim());
    }

    if (kalurahanId !== undefined) {
      const kalurahan = await prisma.kalurahan.findUnique({
        where: { id: kalurahanId },
        include: { kapanewon: true },
      });
      if (!kalurahan) {
        return NextResponse.json({ error: 'Kalurahan tidak ditemukan.' }, { status: 400 });
      }
      if (kalurahan.kapanewonId !== posyandu.healthCenter.kapanewonId) {
        return NextResponse.json(
          { error: 'Kalurahan di luar wilayah kapanewon Puskesmas Pembina.' },
          { status: 400 }
        );
      }
      data.kalurahanId = kalurahan.id;
    }

    if (padukuhan !== undefined) {
      data.padukuhan = smartTitle((padukuhan || '').trim() || '-');
    }

    const updated = await prisma.posyandu.update({
      where: { id: posyanduId },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating posyandu:', error);
    return NextResponse.json({ error: 'Gagal memperbarui Posyandu' }, { status: 500 });
  }
}
