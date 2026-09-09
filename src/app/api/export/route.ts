import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { calculateAge, getPatientCategory } from '@/lib/utils';
import { getAuthSession } from '@/lib/api-auth';

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedPosyanduId = searchParams.get('posyanduId');
    const requestedHealthCenterId = searchParams.get('healthCenterId');

    const whereClause: Prisma.MeasurementWhereInput = {};

    if (session.role === 'POSYANDU') {
      if (session.posyanduId) whereClause.posyanduId = session.posyanduId;
    } else if (session.role === 'PUSKESMAS') {
      if (requestedPosyanduId) {
        const posyandu = await prisma.posyandu.findUnique({
          where: { id: requestedPosyanduId },
        });
        if (!posyandu || posyandu.healthCenterId !== session.healthCenterId) {
          return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }
        whereClause.posyanduId = requestedPosyanduId;
      } else if (session.healthCenterId) {
        whereClause.posyandu = { healthCenterId: session.healthCenterId };
      }
    } else if (session.role === 'DINKES') {
      if (requestedPosyanduId) {
        whereClause.posyanduId = requestedPosyanduId;
      } else if (requestedHealthCenterId) {
        whereClause.posyandu = { healthCenterId: requestedHealthCenterId };
      }
    }

    const measurements = await prisma.measurement.findMany({
      where: whereClause,
      include: {
        patient: true,
        posyandu: {
          include: {
            kalurahan: true,
            healthCenter: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    // Transform to raw Excel rows
    const rows = measurements.map((m, index) => {
      const age = calculateAge(m.patient.birthDate, new Date(m.sessionDate));
      // Kategori harus dari USIA SAAT SESI (atau snapshot tersimpan), bukan usia hari ini —
      // kalau tidak, baris historis (mis. balita yang sudah berulang tahun) salah label.
      const category = m.category ?? getPatientCategory(m.patient.birthDate, m.patient.isPregnant);

      return {
        No: index + 1,
        'Tanggal Sesi': new Date(m.sessionDate).toLocaleDateString('id-ID'),
        'Waktu Input': new Date(m.sessionDate).toLocaleTimeString('id-ID'),
        'No. Registrasi': m.patient.regNumber,
        'Nama Pasien': m.patient.name,
        'Tanggal Lahir': new Date(m.patient.birthDate).toLocaleDateString('id-ID'),
        'Usia (Bulan)': age.totalMonths,
        'Usia (Tampilan)': age.display,
        Kategori: category,
        'Jenis Kelamin': m.patient.gender || '-',
        'Alamat / RT-RW': m.patient.address || '-',
        'Orang Tua / Wali': m.patient.guardianName || '-',
        'No. HP': m.patient.phone || '-',
        'BB (kg)': m.weight ?? '-',
        'TB/PB (cm)': m.height ?? '-',
        'Lingkar Kepala (cm)': m.headCircumference ?? '-',
        'LiLA (cm)': m.armCircumference ?? '-',
        'Lingkar Perut (cm)': m.waistCircumference ?? '-',
        'IMT (kg/m2)': m.imt ?? '-',
        'Tensi Sistolik (mmHg)': m.systolic ?? '-',
        'Tensi Diastolik (mmHg)': m.diastolic ?? '-',
        'Usia Kehamilan (mg)': m.gestationalAge ?? '-',
        'Gula Darah (mg/dL)': m.bloodSugar ?? '-',
        'Kolesterol (mg/dL)': m.cholesterol ?? '-',
        'Asam Urat (mg/dL)': m.uricAcid ?? '-',
        'HB (g/dL)': m.hemoglobin ?? '-',
        'Skrining Mata': m.visionStatus ?? '-',
        'Skrining Telinga': m.hearingStatus ?? '-',
        'Sumber Catatan': m.noteSource ?? '-',
        Catatan: m.notes ?? '-',
        'Kader Pencatat': m.recordedBy || '-',
        Posyandu: m.posyandu.name,
        Kalurahan: m.posyandu.kalurahan.name,
        Padukuhan: m.posyandu.padukuhan,
        Puskesmas: m.posyandu.healthCenter.name,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Rekap Posyandu');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const filename = `Rekap_Posyandu_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating excel export:', error);
    return NextResponse.json({ error: 'Gagal membuat file export Excel' }, { status: 500 });
  }
}
