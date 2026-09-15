import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/api-auth';
import { recomputePatientWeightProgression } from '@/lib/weight-progression-db';

/**
 * DELETE /api/measurements/[id]
 *
 * Hapus satu sesi pengukuran (satu baris bulan pasien). Hanya Kader POSYANDU
 * pemiliknya. Setelah hapus, rantai N/T & 2T pasien dihitung ulang dari awal
 * karena pengukuran setelahnya bisa berubah statusnya.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (session.role !== 'POSYANDU') {
      return NextResponse.json(
        { error: 'Akun Puskesmas/Dinkes bersifat Read-Only (tidak dapat menghapus pengukuran)' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const measurement = await prisma.measurement.findUnique({ where: { id } });
    if (!measurement) {
      return NextResponse.json({ error: 'Pengukuran tidak ditemukan' }, { status: 404 });
    }

    if (!session.posyanduId || measurement.posyanduId !== session.posyanduId) {
      return NextResponse.json({ error: 'Akses ditolak (bukan pengukuran posyandu Anda)' }, { status: 403 });
    }

    await prisma.measurement.delete({ where: { id } });
    await recomputePatientWeightProgression(measurement.patientId);

    return NextResponse.json({
      success: true,
      patientId: measurement.patientId,
      message: 'Sesi pengukuran berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting measurement:', error);
    return NextResponse.json({ error: 'Gagal menghapus pengukuran' }, { status: 500 });
  }
}
