import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { calculateAge, getPatientCategory } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const posyanduId = searchParams.get('posyanduId');
    const healthCenterId = searchParams.get('healthCenterId');

    const whereClause: any = {};
    if (posyanduId) {
      whereClause.posyanduId = posyanduId;
    } else if (healthCenterId) {
      whereClause.posyandu = {
        healthCenterId,
      };
    }

    const measurements = await prisma.measurement.findMany({
      where: whereClause,
      include: {
        patient: true,
        posyandu: {
          include: {
            healthCenter: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    // Transform to raw Excel rows
    const rows = measurements.map((m, index) => {
      const age = calculateAge(m.patient.birthDate, new Date(m.sessionDate));
      const category = getPatientCategory(m.patient.birthDate, m.patient.isPregnant);

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
        'Tensi Sistolik (mmHg)': m.systolic ?? '-',
        'Tensi Diastolik (mmHg)': m.diastolic ?? '-',
        'Usia Kehamilan (mg)': m.gestationalAge ?? '-',
        Catatan: m.notes ?? '-',
        'Kader Pencatat': m.recordedBy || '-',
        Posyandu: m.posyandu.name,
        Kalurahan: m.posyandu.kalurahan,
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
