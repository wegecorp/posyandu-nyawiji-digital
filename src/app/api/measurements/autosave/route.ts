import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { calculateAge, getPatientCategory } from '@/lib/utils';
import { getAuthSession } from '@/lib/api-auth';
import { isRateLimited } from '@/lib/rate-limit';
import { computeImt, validateMeasurementValue, validateBloodPressure } from '@/lib/validation';
import { computeGrowth, type StaturePosition } from '@/lib/growth';
import { recomputePatientWeightProgression } from '@/lib/weight-progression-db';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (session.role !== 'POSYANDU') {
      return NextResponse.json(
        { error: 'Akun Puskesmas/Dinkes bersifat Read-Only (tidak dapat mencatat pengukuran)' },
        { status: 403 }
      );
    }

    if (isRateLimited({ key: `autosave:${session.userId}`, limit: 120, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan simpan. Coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json();
    const {
      patientId,
      recordedBy,
      sessionDate,
      version,
      weight,
      height,
      position,
      headCircumference,
      armCircumference,
      waistCircumference,
      systolic,
      diastolic,
      gestationalAge,
      bloodSugar,
      cholesterol,
      uricAcid,
      hemoglobin,
      visionStatus,
      hearingStatus,
      noteSource,
      notes,
    } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID wajib disertakan' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Pasien tidak ditemukan' }, { status: 404 });
    }

    // Verify patient belongs to user's posyandu
    if (patient.posyanduId !== session.posyanduId) {
      return NextResponse.json({ error: 'Akses ditolak (bukan pasien posyandu Anda)' }, { status: 403 });
    }

    // Tentukan tanggal sesi: pakai tanggal terpilih (opsional) atau hari ini (real-time).
    const targetDate = sessionDate ? new Date(sessionDate) : new Date();
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Tanggal sesi tidak valid' }, { status: 400 });
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if measurement exists for the target date
    const existingMeasurement = await prisma.measurement.findFirst({
      where: {
        patientId,
        sessionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Validasi rentang angka (backstop; client sudah memblokir nilai invalid).
    const numericFields: Array<[string, unknown]> = [
      ['weight', weight],
      ['height', height],
      ['headCircumference', headCircumference],
      ['armCircumference', armCircumference],
      ['waistCircumference', waistCircumference],
      ['systolic', systolic],
      ['diastolic', diastolic],
      ['gestationalAge', gestationalAge],
      ['bloodSugar', bloodSugar],
      ['cholesterol', cholesterol],
      ['uricAcid', uricAcid],
      ['hemoglobin', hemoglobin],
    ];
    for (const [field, value] of numericFields) {
      if (value === undefined || value === null || value === '') continue;
      const check = validateMeasurementValue(field, String(value));
      if (!check.valid) {
        return NextResponse.json({ error: check.message }, { status: 400 });
      }
    }

    // Effective systolic/diastolic (fallback ke nilai tersimpan) utk cek pasangan.
    const effectiveSys = systolic !== undefined ? String(systolic) : String(existingMeasurement?.systolic ?? '');
    const effectiveDia = diastolic !== undefined ? String(diastolic) : String(existingMeasurement?.diastolic ?? '');
    const bpCheck = validateBloodPressure(effectiveSys, effectiveDia);
    if (!bpCheck.valid) {
      return NextResponse.json({ error: bpCheck.message }, { status: 400 });
    }

    // Umur dihitung relatif ke tanggal sesi (bukan hari ini) agar data yang
    // diinput terlambat tetap valid.
    const age = calculateAge(patient.birthDate, targetDate);
    const ageInDays = Math.max(
      0,
      Math.floor((targetDate.getTime() - new Date(patient.birthDate).getTime()) / 86_400_000),
    );

    // Hitung IMT dari BB/TB efektif (gabung nilai baru + tersimpan).
    const effectiveWeight = weight !== undefined ? weight : existingMeasurement?.weight ?? null;
    const effectiveHeight = height !== undefined ? height : existingMeasurement?.height ?? null;
    const imt = computeImt(effectiveWeight, effectiveHeight);

    // Status gizi balita (BB/U, TB/U, BB/TB, IMT/U) — Permenkes 2/2020.
    const effectivePosition: StaturePosition | null =
      position !== undefined
        ? (position as StaturePosition | null)
        : (existingMeasurement?.position as StaturePosition | null) ?? null;
    const growth = computeGrowth({
      gender: patient.gender,
      birthDate: patient.birthDate,
      sessionDate: targetDate,
      weight: effectiveWeight,
      height: effectiveHeight,
      position: effectivePosition,
    });

    const SCREENING_VALUES = ['Normal', 'Tidak Normal'];
    const NOTE_SOURCES = ['Kader', 'Nakes'];
    const POSITION_VALUES: StaturePosition[] = ['TELENTANG', 'BERDIRI'];

    // Build update object only for provided fields
    const fieldData: Record<string, string | number | null> = {};
    if (weight !== undefined) fieldData.weight = weight === '' || weight === null ? null : parseFloat(weight);
    if (height !== undefined) fieldData.height = height === '' || height === null ? null : parseFloat(height);
    if (position !== undefined)
      fieldData.position = POSITION_VALUES.includes(position) ? position : null;
    if (headCircumference !== undefined)
      fieldData.headCircumference =
        headCircumference === '' || headCircumference === null ? null : parseFloat(headCircumference);
    if (armCircumference !== undefined)
      fieldData.armCircumference =
        armCircumference === '' || armCircumference === null ? null : parseFloat(armCircumference);
    if (waistCircumference !== undefined)
      fieldData.waistCircumference =
        waistCircumference === '' || waistCircumference === null ? null : parseFloat(waistCircumference);
    if (systolic !== undefined)
      fieldData.systolic = systolic === '' || systolic === null ? null : parseInt(systolic, 10);
    if (diastolic !== undefined)
      fieldData.diastolic = diastolic === '' || diastolic === null ? null : parseInt(diastolic, 10);
    if (gestationalAge !== undefined)
      fieldData.gestationalAge =
        gestationalAge === '' || gestationalAge === null ? null : parseInt(gestationalAge, 10);
    if (bloodSugar !== undefined)
      fieldData.bloodSugar = bloodSugar === '' || bloodSugar === null ? null : parseFloat(bloodSugar);
    if (cholesterol !== undefined)
      fieldData.cholesterol = cholesterol === '' || cholesterol === null ? null : parseFloat(cholesterol);
    if (uricAcid !== undefined)
      fieldData.uricAcid = uricAcid === '' || uricAcid === null ? null : parseFloat(uricAcid);
    if (hemoglobin !== undefined)
      fieldData.hemoglobin = hemoglobin === '' || hemoglobin === null ? null : parseFloat(hemoglobin);
    if (visionStatus !== undefined)
      fieldData.visionStatus = SCREENING_VALUES.includes(visionStatus) ? visionStatus : null;
    if (hearingStatus !== undefined)
      fieldData.hearingStatus = SCREENING_VALUES.includes(hearingStatus) ? hearingStatus : null;
    if (noteSource !== undefined)
      fieldData.noteSource = NOTE_SOURCES.includes(noteSource) ? noteSource : null;
    if (notes !== undefined) fieldData.notes = notes;
    if (recordedBy) fieldData.recordedBy = recordedBy;
    if (weight !== undefined || height !== undefined) fieldData.imt = imt;

    // Simpan status gizi mentah + hasil. Dihitung ulang setiap ada perubahan
    // BB/TB/posisi; dibersihkan bila data tidak lagi memenuhi syarat.
    fieldData.ageInDays = ageInDays;
    if (weight !== undefined || height !== undefined || position !== undefined) {
      if (growth.ok) {
        fieldData.position = growth.position ?? effectivePosition;
        fieldData.zWeightAge = growth.BB_U?.z ?? null;
        fieldData.zHeightAge = growth.TB_U?.z ?? null;
        fieldData.zWeightHeight = growth.BB_TB?.z ?? null;
        fieldData.zBmiAge = growth.IMT_U?.z ?? null;
        fieldData.underweightStatus = growth.BB_U?.categoryKey ?? null;
        fieldData.stuntingStatus = growth.TB_U?.categoryKey ?? null;
        fieldData.wastingStatus = growth.BB_TB?.categoryKey ?? null;
        fieldData.growthRefVersion = growth.refVersion;
      } else {
        fieldData.zWeightAge = null;
        fieldData.zHeightAge = null;
        fieldData.zWeightHeight = null;
        fieldData.zBmiAge = null;
        fieldData.underweightStatus = null;
        fieldData.stuntingStatus = null;
        fieldData.wastingStatus = null;
        fieldData.growthRefVersion = null;
      }
    }

    fieldData.updatedBy = session.username;

    // Last-write-wins via client version (ms epoch). Tolak tulis yang lebih tua
    // dari record tersimpan (mis. flush offline yang datang terlambat).
    const incomingVersion = Number.isFinite(Number(version)) ? Math.floor(Number(version)) : 0;
    if (existingMeasurement && incomingVersion > 0 && incomingVersion < existingMeasurement.version) {
      return NextResponse.json({ error: 'Data usang — muat ulang sebelum menyimpan.', stale: true }, { status: 409 });
    }
    const newVersion = incomingVersion > 0 ? incomingVersion : (existingMeasurement?.version ?? 0) + 1;
    fieldData.version = newVersion;

    let savedRecord;

    if (existingMeasurement) {
      savedRecord = await prisma.measurement.update({
        where: { id: existingMeasurement.id },
        data: {
          ...(fieldData as unknown as Prisma.MeasurementUncheckedUpdateInput),
          ageInMonths: age.totalMonths,
          category: getPatientCategory(patient.birthDate, patient.isPregnant, patient.gender, targetDate),
        },
      });
    } else {
      try {
        savedRecord = await prisma.measurement.create({
          data: {
            ...(fieldData as unknown as Prisma.MeasurementUncheckedCreateInput),
            patientId,
            posyanduId: session.posyanduId!,
            sessionDate: targetDate,
            ageInMonths: age.totalMonths,
            category: getPatientCategory(patient.birthDate, patient.isPregnant, patient.gender, targetDate),
          },
        });
      } catch (err) {
        // Race: record untuk (patientId, sessionDate) baru saja dibuat proses lain.
        if (
          typeof err === 'object' &&
          err !== null &&
          (err as { code?: string }).code === 'P2002'
        ) {
          const raced = await prisma.measurement.findFirst({
            where: {
              patientId,
              sessionDate: { gte: startOfDay, lte: endOfDay },
            },
          });
          if (!raced) throw err;
          savedRecord = await prisma.measurement.update({
            where: { id: raced.id },
            data: {
              ...(fieldData as unknown as Prisma.MeasurementUncheckedUpdateInput),
              ageInMonths: age.totalMonths,
              category: getPatientCategory(patient.birthDate, patient.isPregnant, patient.gender, targetDate),
            },
          });
        } else {
          throw err;
        }
      }
    }

    // Progres berat (N/T & 2T) hanya berubah bila berat diubah. Hitung ulang
    // seluruh rantai pasien agar pengukuran setelah tanggal ini ikut terkoreksi.
    if (weight !== undefined && savedRecord) {
      await recomputePatientWeightProgression(patientId);
      const refreshed = await prisma.measurement.findUnique({ where: { id: savedRecord.id } });
      if (refreshed) savedRecord = refreshed;
    }

    return NextResponse.json({
      success: true,
      data: savedRecord,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error auto-saving measurement:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data otomatis' }, { status: 500 });
  }
}
