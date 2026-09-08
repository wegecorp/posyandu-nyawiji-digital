import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { calculateAge, getPatientCategory } from '@/lib/utils';
import { getAuthSession } from '@/lib/api-auth';
import { computeImt, validateMeasurementValue, validateBloodPressure } from '@/lib/validation';

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

    const body = await req.json();
    const {
      patientId,
      recordedBy,
      sessionDate,
      weight,
      height,
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

    const age = calculateAge(patient.birthDate);

    // Hitung IMT dari BB/TB efektif (gabung nilai baru + tersimpan).
    const effectiveWeight = weight !== undefined ? weight : existingMeasurement?.weight ?? null;
    const effectiveHeight = height !== undefined ? height : existingMeasurement?.height ?? null;
    const imt = computeImt(effectiveWeight, effectiveHeight);

    const SCREENING_VALUES = ['Normal', 'Tidak Normal'];
    const NOTE_SOURCES = ['Kader', 'Nakes'];

    // Build update object only for provided fields
    const fieldData: Record<string, string | number | null> = {};
    if (weight !== undefined) fieldData.weight = weight === '' || weight === null ? null : parseFloat(weight);
    if (height !== undefined) fieldData.height = height === '' || height === null ? null : parseFloat(height);
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

    let savedRecord;

    if (existingMeasurement) {
      savedRecord = await prisma.measurement.update({
        where: { id: existingMeasurement.id },
        data: {
          ...(fieldData as unknown as Prisma.MeasurementUncheckedUpdateInput),
          ageInMonths: age.totalMonths,
          category: getPatientCategory(patient.birthDate, patient.isPregnant, patient.gender),
        },
      });
    } else {
      savedRecord = await prisma.measurement.create({
        data: {
          ...(fieldData as unknown as Prisma.MeasurementUncheckedCreateInput),
          patientId,
          posyanduId: session.posyanduId!,
          sessionDate: targetDate,
          ageInMonths: age.totalMonths,
          category: getPatientCategory(patient.birthDate, patient.isPregnant, patient.gender),
        },
      });
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
