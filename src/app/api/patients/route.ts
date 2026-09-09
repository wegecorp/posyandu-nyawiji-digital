import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { calculateAge, getPatientCategory } from '@/lib/utils';
import { getAuthSession } from '@/lib/api-auth';
import { validateBirthDate, validatePhone, validateTextLength, isMeasurementComplete } from '@/lib/validation';

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

    const whereClause: Prisma.PatientWhereInput = {};

    if (session.role === 'POSYANDU') {
      if (session.posyanduId) whereClause.posyanduId = session.posyanduId;
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
      } else if (session.healthCenterId) {
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
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: {
        posyandu: true,
        measurements: {
          where: {
            sessionDate: {
              gte: startOfToday,
              lte: endOfToday,
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
      const todayMeasurement = p.measurements[0] || null;
      return {
        ...p,
        category,
        ageYears: age.years,
        ageMonths: age.totalMonths,
        ageDisplay: age.display,
        todayMeasurement,
        measurementComplete: isMeasurementComplete(todayMeasurement),
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
    const { name, birthDate, posyanduId, gender, address, guardianName, phone, isPregnant, force, clientId } = body;

    const targetPosyanduId = posyanduId || session.posyanduId;

    // Idempotensi registrasi offline: bila klien kirim ulang clientId yang sudah
    // tersimpan (retry), kembalikan record yang sudah ada alih-alih membuat duplikat.
    if (clientId && typeof clientId === 'string') {
      const existing = await prisma.patient.findUnique({
        where: { clientId },
        include: { posyandu: true },
      });
      if (existing) {
        const age = calculateAge(existing.birthDate);
        const category = getPatientCategory(existing.birthDate, existing.isPregnant);
        return NextResponse.json({
          success: true,
          data: {
            ...existing,
            category,
            ageYears: age.years,
            ageMonths: age.totalMonths,
            ageDisplay: age.display,
          },
        });
      }
    }

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

    if (gender !== 'L' && gender !== 'P') {
      return NextResponse.json({ error: 'Jenis kelamin wajib dipilih (Laki-laki / Perempuan)' }, { status: 400 });
    }

    const bdCheck = validateBirthDate(birthDate);
    if (!bdCheck.valid) {
      return NextResponse.json({ error: bdCheck.message }, { status: 400 });
    }
    const nameCheck = validateTextLength(name, 'Nama', 120);
    if (!nameCheck.valid) return NextResponse.json({ error: nameCheck.message }, { status: 400 });
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) return NextResponse.json({ error: phoneCheck.message }, { status: 400 });
    const addressCheck = validateTextLength(address, 'Alamat', 255);
    if (!addressCheck.valid) return NextResponse.json({ error: addressCheck.message }, { status: 400 });
    const guardianCheck = validateTextLength(guardianName, 'Nama wali', 120);
    if (!guardianCheck.valid) return NextResponse.json({ error: guardianCheck.message }, { status: 400 });

    const posyandu = await prisma.posyandu.findUnique({
      where: { id: targetPosyanduId },
    });

    if (!posyandu) {
      return NextResponse.json({ error: 'Posyandu tidak valid' }, { status: 404 });
    }

    // Cek duplikat: nama (ignore case) + tanggal lahir sama di posyandu sama.
    if (!force) {
      const bd = new Date(birthDate);
      const start = new Date(bd.getFullYear(), bd.getMonth(), bd.getDate());
      const end = new Date(bd.getFullYear(), bd.getMonth(), bd.getDate() + 1);
      const candidates = await prisma.patient.findMany({
        where: {
          posyanduId: targetPosyanduId,
          birthDate: { gte: start, lt: end },
        },
        select: { id: true, name: true, birthDate: true, gender: true, regNumber: true },
      });
      const normName = name.trim().toLowerCase();
      const duplicate = candidates.find((c) => c.name.trim().toLowerCase() === normName);
      if (duplicate) {
        return NextResponse.json(
          {
            error: 'Pasien dengan nama & tanggal lahir yang sama sudah terdaftar',
            duplicate: true,
            existing: duplicate,
          },
          { status: 409 }
        );
      }
    }

    // Generate unique sequential registration number: e.g. POS-WNS-01-2026-0042.
    // Anti-race: coba create; bila regNumber bentrok (P2002) ulangi dgn counter naik.
    const currentYear = new Date().getFullYear();
    const cleanPosCode = posyandu.code.replace(/\s+/g, '-').toUpperCase();

    const baseData = {
      clientId: clientId && typeof clientId === 'string' ? clientId : null,
      name: name.trim(),
      birthDate: new Date(birthDate),
      gender: gender || null,
      address: address ? address.trim() : null,
      guardianName: guardianName ? guardianName.trim() : null,
      phone: phone ? phone.trim() : null,
      isPregnant: gender === 'L' ? false : Boolean(isPregnant),
      posyanduId: targetPosyanduId,
      updatedBy: session.username,
    };

    const totalPatientsInPosyandu = await prisma.patient.count({
      where: { posyanduId: targetPosyanduId },
    });

    let patient;
    let attempt = 0;
    const MAX_ATTEMPTS = 10;
    while (true) {
      const seq = String(totalPatientsInPosyandu + 1 + attempt).padStart(4, '0');
      const regNumber = `${cleanPosCode}-${currentYear}-${seq}`;
      try {
        patient = await prisma.patient.create({
          data: { ...baseData, regNumber },
          include: { posyandu: true },
        });
        break;
      } catch (err) {
        if (
          attempt < MAX_ATTEMPTS &&
          typeof err === 'object' &&
          err !== null &&
          (err as { code?: string }).code === 'P2002'
        ) {
          attempt++;
          continue;
        }
        throw err;
      }
    }

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
