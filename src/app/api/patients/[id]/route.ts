import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateAge, getPatientCategory } from '@/lib/utils';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
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

    if (!patient) {
      return NextResponse.json({ error: 'Pasien tidak ditemukan' }, { status: 404 });
    }

    const age = calculateAge(patient.birthDate);
    const category = getPatientCategory(patient.birthDate, patient.isPregnant);

    // Get today's measurement if exists
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
    const { id } = await params;
    const body = await req.json();

    const {
      name,
      birthDate,
      gender,
      address,
      guardianName,
      phone,
      isPregnant,
    } = body;

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
    const { id } = await params;

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

