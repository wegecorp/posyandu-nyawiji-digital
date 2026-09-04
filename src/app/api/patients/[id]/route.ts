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
