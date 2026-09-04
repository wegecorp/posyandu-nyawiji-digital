import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const query = searchParams.get('q') || '';
    const categoryFilter = searchParams.get('category'); // optional

    const whereClause: any = {};

    if (session.role === 'POSYANDU') {
      whereClause.posyanduId = session.posyanduId;
    } else if (session.role === 'PUSKESMAS') {
      if (requestedPosyanduId) {
        // Verify posyandu belongs to this puskesmas
        const posyandu = await prisma.posyandu.findUnique({
          where: { id: requestedPosyanduId },
        });
        if (!posyandu || posyandu.healthCenterId !== session.healthCenterId) {
          return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }
        whereClause.posyanduId = requestedPosyanduId;
      } else {
        whereClause.posyandu = { healthCenterId: session.healthCenterId };
      }
    } else if (session.role === 'DINKES') {
      if (requestedPosyanduId) {
        whereClause.posyanduId = requestedPosyanduId;
      }
    }

    if (query.trim()) {
      whereClause.OR = [
        { name: { contains: query.trim() } },
        { regNumber: { contains: query.trim() } },
        { guardianName: { contains: query.trim() } },
      ];
    }

    // Get today's start and end for measurement check
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: {
        posyandu: true,
        measurements: {
          where: {
            sessionDate: {
              gte: startOfToday,
            },
          },
          orderBy: { sessionDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const enrichedPatients = patients.map((p) => {
      const age = calculateAge(p.birthDate);
      const category = getPatientCategory(p.birthDate, p.isPregnant);
      return {
        ...p,
        category,
        ageYears: age.years,
        ageMonths: age.totalMonths,
        ageDisplay: age.display,
        todayMeasurement: p.measurements[0] || null,
      };
    });

    const filtered = categoryFilter
      ? enrichedPatients.filter((p) => p.category === categoryFilter)
      : enrichedPatients;

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Gagal memuat data pasien' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (session.role !== 'POSYANDU') {
      return NextResponse.json(
        { error: 'Akun Puskesmas/Dinkes bersifat Read-Only (tidak dapat menambah pasien)' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, birthDate, posyanduId, gender, address, guardianName, phone, isPregnant } = body;

    const targetPosyanduId = posyanduId || session.posyanduId;

    // Strict ownership check for POSYANDU role
    if (targetPosyanduId !== session.posyanduId) {
      return NextResponse.json({ error: 'Akses ditolak ke posyandu ini' }, { status: 403 });
    }

    if (!name || !birthDate || !targetPosyanduId) {
      return NextResponse.json(
        { error: 'Nama, Tanggal Lahir, dan Posyandu wajib diisi' },
        { status: 400 }
      );
    }

    const posyandu = await prisma.posyandu.findUnique({
      where: { id: targetPosyanduId },
    });

    if (!posyandu) {
      return NextResponse.json({ error: 'Posyandu tidak valid' }, { status: 404 });
    }

    // Generate unique sequential registration number: e.g. POS-WNS-01-2026-0042
    const currentYear = new Date().getFullYear();
    const totalPatientsInPosyandu = await prisma.patient.count({
      where: { posyanduId: targetPosyanduId },
    });

    const nextSeq = String(totalPatientsInPosyandu + 1).padStart(4, '0');
    const cleanPosCode = posyandu.code.replace(/\s+/g, '-').toUpperCase();
    let regNumber = `${cleanPosCode}-${currentYear}-${nextSeq}`;

    // Ensure uniqueness
    let exists = await prisma.patient.findUnique({ where: { regNumber } });
    let counter = 1;
    while (exists) {
      regNumber = `${cleanPosCode}-${currentYear}-${String(totalPatientsInPosyandu + 1 + counter).padStart(4, '0')}`;
      exists = await prisma.patient.findUnique({ where: { regNumber } });
      counter++;
    }

    const patient = await prisma.patient.create({
      data: {
        regNumber,
        name: name.trim(),
        birthDate: new Date(birthDate),
        gender: gender || null,
        address: address ? address.trim() : null,
        guardianName: guardianName ? guardianName.trim() : null,
        phone: phone ? phone.trim() : null,
        isPregnant: gender === 'L' ? false : Boolean(isPregnant),
        posyanduId: targetPosyanduId,
      },
      include: {
        posyandu: true,
      },
    });

    const age = calculateAge(patient.birthDate);
    const category = getPatientCategory(patient.birthDate, patient.isPregnant);

    return NextResponse.json({
      success: true,
      data: {
        ...patient,
        category,
        ageYears: age.years,
        ageMonths: age.totalMonths,
        ageDisplay: age.display,
      },
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Gagal mendaftarkan pasien baru' }, { status: 500 });
  }
}
