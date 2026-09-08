import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { calculateAge } from '@/lib/utils';
import { getAuthSession } from '@/lib/api-auth';

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
      weight,
      height,
      headCircumference,
      armCircumference,
      systolic,
      diastolic,
      gestationalAge,
      bloodSugar,
      cholesterol,
      uricAcid,
      hemoglobin,
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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Check if measurement exists for today
    const existingMeasurement = await prisma.measurement.findFirst({
      where: {
        patientId,
        sessionDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    const age = calculateAge(patient.birthDate);

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
    if (notes !== undefined) fieldData.notes = notes;
    if (recordedBy) fieldData.recordedBy = recordedBy;

    let savedRecord;

    if (existingMeasurement) {
      savedRecord = await prisma.measurement.update({
        where: { id: existingMeasurement.id },
        data: {
          ...(fieldData as unknown as Prisma.MeasurementUncheckedUpdateInput),
          ageInMonths: age.totalMonths,
        },
      });
    } else {
      savedRecord = await prisma.measurement.create({
        data: {
          ...(fieldData as unknown as Prisma.MeasurementUncheckedCreateInput),
          patientId,
          posyanduId: session.posyanduId!,
          sessionDate: new Date(),
          ageInMonths: age.totalMonths,
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
