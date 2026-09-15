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

// DELETE /api/posyandus/[posyanduId]
// Hapus permanen posyandu — HANYA bila belum punya data (0 pasien & 0 pengukuran),
// supaya kesalahan/duplikat posyandu kosong bisa dibersihkan tanpa kehilangan data.
// Diizinkan: PUSKESMAS untuk posyandu binaannya, DINKES untuk semua.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ posyanduId: string }> }
) {
  try {
    const session = await requireRole(req, ['PUSKESMAS', 'DINKES']);
    if (session instanceof NextResponse) return session;

    const { posyanduId } = await params;
    const posyandu = await prisma.posyandu.findUnique({
      where: { id: posyanduId },
      select: { id: true, name: true, healthCenterId: true },
    });
    if (!posyandu) {
      return NextResponse.json({ error: 'Posyandu tidak ditemukan.' }, { status: 404 });
    }
    if (session.role === 'PUSKESMAS' && posyandu.healthCenterId !== session.healthCenterId) {
      return NextResponse.json({ error: 'Bukan posyandu binaan Anda.' }, { status: 403 });
    }

    const [patients, measurements] = await Promise.all([
      prisma.patient.count({ where: { posyanduId } }),
      prisma.measurement.count({ where: { posyanduId } }),
    ]);
    if (patients > 0 || measurements > 0) {
      return NextResponse.json(
        {
          error:
            'Posyandu masih memiliki data (pasien/pengukuran). Ekspor atau pindahkan datanya dulu sebelum menghapus.',
        },
        { status: 409 }
      );
    }

    await prisma.posyandu.delete({ where: { id: posyanduId } });
    return NextResponse.json({ success: true, message: 'Posyandu dihapus.' });
  } catch (error) {
    console.error('Error deleting posyandu:', error);
    return NextResponse.json({ error: 'Gagal menghapus Posyandu' }, { status: 500 });
  }
}
