import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateAge, getPatientCategory } from '@/lib/utils';
import { getAuthSession } from '@/lib/api-auth';

async function checkPatientAccess(patientId: string, session: { role: string; posyanduId?: string | null; healthCenterId?: string | null }) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      posyandu: {
        include: {
          healthCenter: true,
        },
      },
      measurements: {
        orderBy: { sessionDate: 'desc' },
      },
    },
  });

  if (!patient) return { patient: null, allowed: false, status: 404, error: 'Pasien tidak ditemukan' };

  if (session.role === 'POSYANDU') {
    if (patient.posyanduId !== session.posyanduId) {
      return { patient: null, allowed: false, status: 403, error: 'Akses ditolak (bukan wilayah Posyandu Anda)' };
    }
  } else if (session.role === 'PUSKESMAS') {
    if (patient.posyandu.healthCenterId !== session.healthCenterId) {
      return { patient: null, allowed: false, status: 403, error: 'Akses ditolak (bukan wilayah Puskesmas Anda)' };
    }
  }

  return { patient, allowed: true, status: 200, error: null };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { id } = await params;
    const access = await checkPatientAccess(id, session);
    if (!access.allowed || !access.patient) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const patient = access.patient;
    const age = calculateAge(patient.birthDate);
    const category = getPatientCategory(patient.birthDate, patient.isPregnant);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayMeasurement = patient.measurements.find(
      (m) => new Date(m.sessionDate) >= startOfToday
    ) || null;

    return NextResponse.json({
      success: true,
      data: {
        ...patient,
        category,
        ageYears: age.years,
        ageMonths: age.totalMonths,
        ageDisplay: age.display,
        todayMeasurement,
      },
    });
  } catch (error) {
    console.error('Error fetching patient detail:', error);
    return NextResponse.json({ error: 'Gagal memuat detail pasien' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (session.role !== 'POSYANDU') {
      return NextResponse.json(
        { error: 'Akun Puskesmas/Dinkes bersifat Read-Only (tidak dapat mengedit pasien)' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const access = await checkPatientAccess(id, session);
    if (!access.allowed || !access.patient) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { name, birthDate, gender, address, guardianName, phone, isPregnant } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nama pasien wajib diisi' }, { status: 400 });
    }

    if (!birthDate) {
      return NextResponse.json({ error: 'Tanggal lahir wajib diisi' }, { status: 400 });
    }

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: {
        name: name.trim(),
        birthDate: new Date(birthDate),
        gender: gender || null,
        address: address?.trim() || null,
        guardianName: guardianName?.trim() || null,
        phone: phone?.trim() || null,
        isPregnant: gender === 'L' ? false : Boolean(isPregnant),
      },
      include: {
        posyandu: {
          include: {
            healthCenter: true,
          },
        },
        measurements: {
          orderBy: { sessionDate: 'desc' },
        },
      },
    });

    const age = calculateAge(updatedPatient.birthDate);
    const category = getPatientCategory(updatedPatient.birthDate, updatedPatient.isPregnant);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayMeasurement = updatedPatient.measurements.find(
      (m) => new Date(m.sessionDate) >= startOfToday
    ) || null;

    return NextResponse.json({
      success: true,
      data: {
        ...updatedPatient,
        category,
        ageYears: age.years,
        ageMonths: age.totalMonths,
        ageDisplay: age.display,
        todayMeasurement,
      },
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: 'Gagal memperbarui data pasien' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (session.role !== 'POSYANDU') {
      return NextResponse.json(
        { error: 'Akun Puskesmas/Dinkes bersifat Read-Only (tidak dapat menghapus pasien)' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const access = await checkPatientAccess(id, session);
    if (!access.allowed || !access.patient) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await prisma.patient.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Data pasien berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json({ error: 'Gagal menghapus data pasien' }, { status: 500 });
  }
}
