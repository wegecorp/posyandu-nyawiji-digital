import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateAge, getPatientCategory } from '@/lib/utils';
import { getAuthSession } from '@/lib/api-auth';
import { validateBirthDate, validatePhone, validateTextLength } from '@/lib/validation';
import { computeGrowth, type StaturePosition } from '@/lib/growth';

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
    // Fail-closed: posyanduId kosong tidak boleh lolos.
    if (!session.posyanduId || patient.posyanduId !== session.posyanduId) {
      return { patient: null, allowed: false, status: 403, error: 'Akses ditolak (bukan wilayah Posyandu Anda)' };
    }
  } else if (session.role === 'PUSKESMAS') {
    if (!session.healthCenterId || patient.posyandu.healthCenterId !== session.healthCenterId) {
      return { patient: null, allowed: false, status: 403, error: 'Akses ditolak (bukan wilayah Puskesmas Anda)' };
    }
  } else if (session.role === 'DINKES') {
    // DINKES boleh meninjau identitas pasien di seluruh wilayah.
  } else {
    return { patient: null, allowed: false, status: 403, error: 'Akses ditolak' };
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
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayMeasurement = patient.measurements.find(
      (m) => new Date(m.sessionDate) >= startOfToday && new Date(m.sessionDate) <= endOfToday
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

    if (gender !== 'L' && gender !== 'P') {
      return NextResponse.json({ error: 'Jenis kelamin wajib dipilih (Laki-laki / Perempuan)' }, { status: 400 });
    }

    const bdCheck = validateBirthDate(birthDate);
    if (!bdCheck.valid) return NextResponse.json({ error: bdCheck.message }, { status: 400 });
    const nameCheck = validateTextLength(name, 'Nama', 120);
    if (!nameCheck.valid) return NextResponse.json({ error: nameCheck.message }, { status: 400 });
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) return NextResponse.json({ error: phoneCheck.message }, { status: 400 });
    const addressCheck = validateTextLength(address, 'Alamat', 255);
    if (!addressCheck.valid) return NextResponse.json({ error: addressCheck.message }, { status: 400 });
    const guardianCheck = validateTextLength(guardianName, 'Nama wali', 120);
    if (!guardianCheck.valid) return NextResponse.json({ error: guardianCheck.message }, { status: 400 });

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
        updatedBy: session.username,
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

    // Usia & kategori untuk RESPONS (usia pasien hari ini).
    const age = calculateAge(updatedPatient.birthDate);
    const category = getPatientCategory(updatedPatient.birthDate, updatedPatient.isPregnant, updatedPatient.gender);

    // Perbaiki snapshot TIAP pengukuran memakai tanggal sesinya sendiri, bukan
    // usia hari ini — kalau tidak, riwayat lama salah umur/kategori. Sekaligus
    // hitung ulang status gizi (mis. saat gender pasien dikoreksi).
    for (const m of updatedPatient.measurements) {
      const mDate = new Date(m.sessionDate);
      const mAge = calculateAge(updatedPatient.birthDate, mDate);
      const mCategory = getPatientCategory(
        updatedPatient.birthDate,
        updatedPatient.isPregnant,
        updatedPatient.gender,
        mDate,
      );
      const growth = computeGrowth({
        gender: updatedPatient.gender,
        birthDate: updatedPatient.birthDate,
        sessionDate: mDate,
        weight: m.weight,
        height: m.height,
        position: (m.position as StaturePosition | null) ?? undefined,
      });
      await prisma.measurement.update({
        where: { id: m.id },
        data: {
          ageInMonths: mAge.totalMonths,
          category: mCategory,
          ...(growth.ok
            ? {
                position: growth.position ?? m.position,
                ageInDays: Math.max(
                  0,
                  Math.floor((mDate.getTime() - new Date(updatedPatient.birthDate).getTime()) / 86_400_000),
                ),
                zWeightAge: growth.BB_U?.z ?? null,
                zHeightAge: growth.TB_U?.z ?? null,
                zWeightHeight: growth.BB_TB?.z ?? null,
                zBmiAge: growth.IMT_U?.z ?? null,
                underweightStatus: growth.BB_U?.categoryKey ?? null,
                stuntingStatus: growth.TB_U?.categoryKey ?? null,
                wastingStatus: growth.BB_TB?.categoryKey ?? null,
                growthRefVersion: growth.refVersion,
              }
            : {}),
        },
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayMeasurement = updatedPatient.measurements.find(
      (m) => new Date(m.sessionDate) >= startOfToday && new Date(m.sessionDate) <= endOfToday
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
