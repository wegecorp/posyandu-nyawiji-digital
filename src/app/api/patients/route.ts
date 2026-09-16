import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { calculateAge, getPatientCategory } from '@/lib/utils';
import { supportsWeightFaltering } from '@/lib/growth/weight-progression';
import { getAuthSession } from '@/lib/api-auth';
import { resolvePatientScope } from '@/lib/patient-scope';
import { validateBirthDate, validatePhone, validateTextLength, measurementCompletion } from '@/lib/validation';

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

    // Fail-closed: sesi tanpa cakupan lokasi DITOLAK, bukan dikembalikan tanpa filter.
    const scope = resolvePatientScope(session, requestedPosyanduId);
    if (scope.kind === 'deny') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    if (scope.kind === 'posyandu') {
      // PUSKESMAS harus memverifikasi posyandu tujuan milik wilayahnya.
      if (session.role === 'PUSKESMAS') {
        const posyandu = await prisma.posyandu.findUnique({
          where: { id: scope.posyanduId },
        });
        if (!posyandu || posyandu.healthCenterId !== session.healthCenterId) {
          return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }
      }
      whereClause.posyanduId = scope.posyanduId;
    } else if (scope.kind === 'healthCenter') {
      whereClause.posyandu = { healthCenterId: scope.healthCenterId };
    }
    // scope.kind === 'all' → DINKES tanpa filter (boleh tinjau seluruh wilayah).

    if (query.trim()) {
      whereClause.OR = [
        { name: { contains: query.trim() } },
        { regNumber: { contains: query.trim() } },
        { guardianName: { contains: query.trim() } },
      ];
    }

    // Sesi = BULAN: status daftar pasien mengikuti pengukuran bulan berjalan.
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: {
        posyandu: true,
      },
      orderBy: { name: 'asc' },
    });

    // Ambil pengukuran bulan ini sekali (tanpa N+1), lalu tempel per pasien.
    type MeasurementRow = Awaited<ReturnType<typeof prisma.measurement.findFirst>>;
    const todayByPatient = new Map<string, NonNullable<MeasurementRow>>();
    const faltering2TPatients = new Set<string>();
    const latestByPatient = new Map<string, Date>();
    if (patients.length > 0) {
      const ids = patients.map((p) => p.id);
      const [measurements, latestDates] = await Promise.all([
        prisma.measurement.findMany({
          where: {
            patientId: { in: ids },
            sessionDate: { gte: startOfMonth, lte: endOfMonth },
          },
          orderBy: { sessionDate: 'desc' },
        }),
        prisma.measurement.groupBy({
          by: ['patientId'],
          where: { patientId: { in: ids } },
          _max: { sessionDate: true },
        }),
      ]);
      for (const m of measurements) {
        if (!todayByPatient.has(m.patientId)) todayByPatient.set(m.patientId, m);
      }

      // Penanda 2T = pengukuran TERBARU pasien masih berstatus 2T.
      const latestPairs = latestDates
        .filter((l) => l._max.sessionDate)
        .map((l) => ({ patientId: l.patientId, sessionDate: l._max.sessionDate as Date }));
      for (const l of latestPairs) latestByPatient.set(l.patientId, l.sessionDate);
      if (latestPairs.length > 0) {
        const flagged = await prisma.measurement.findMany({
          where: { OR: latestPairs, weightFaltering2T: true },
          select: { patientId: true },
        });
        for (const f of flagged) faltering2TPatients.add(f.patientId);
      }
    }

    const enrichedPatients = patients.map((p) => {
      const age = calculateAge(p.birthDate);
      const category = getPatientCategory(p.birthDate, p.isPregnant);
      const todayMeasurement = todayByPatient.get(p.id) || null;
      const latestDate = latestByPatient.get(p.id) ?? null;
      const completion = measurementCompletion(todayMeasurement, category);
      return {
        ...p,
        category,
        ageYears: age.years,
        ageMonths: age.totalMonths,
        ageDisplay: age.display,
        todayMeasurement,
        measurementComplete: completion.percent === 100,
        dataCompletionPercent: completion.percent,
        faltering2T: supportsWeightFaltering(category) && faltering2TPatients.has(p.id),
        lastMeasuredAt: latestDate ? latestDate.toISOString() : null,
        measuredThisMonth: Boolean(todayMeasurement),
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
