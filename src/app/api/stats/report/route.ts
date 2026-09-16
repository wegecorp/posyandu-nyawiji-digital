/**
 * GET /api/stats/report?from=&to=&format=json|xlsx
 *
 * Rekap RINGKAS per unit (agregat, bukan data mentah) untuk semua kategori umur.
 * - POSYANDU  : unit = posyandu sendiri (1 baris).
 * - PUSKESMAS : unit = tiap posyandu binaan.
 * - DINKES    : unit = tiap puskesmas (roll-up) + baris global kabupaten.
 *
 * Definisi (dikunci):
 * - Terdaftar = pasien dengan createdAt <= akhir periode.
 * - Terukur   = pasien unik dgn >=1 pengukuran dalam periode (pengukuran terakhir).
 * - Kategori  = snapshot saat pengukuran (m.category), fallback usia saat itu.
 * - N/T       : TIDAK_NAIK bila berat <= sebelumnya; 2T = dua TIDAK_NAIK berturut.
 * - "Belum dinilai" dipisah dari "Normal" (indikator klinis).
 */

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { getPatientCategory } from '@/lib/utils';
import { INDICATORS, checkIndicator, type IndicatorDef } from '@/lib/clinical';
import { computeGrowth, ageInCompletedMonths, isKmsAge, type StaturePosition } from '@/lib/growth';
import {
  buildRoster,
  buildDetails,
  buildRiskList,
  type ExportRow,
  type ExportPatient,
  type ExportMeasurement,
} from '@/lib/member-export';
import { MAX_EXPORT_UNITS, MAX_EXPORT_ROWS } from '@/lib/export-limits';
import type { PatientCategory } from '@/lib/types';

type Bucket = { abnormal: number; assessed: number };
type ReportRow = {
  unitId: string;
  unitName: string;
  registered: number;
  measured: number;
  balita: { total: number; normal: number; underweight: number; severelyUnderweight: number; riskOverweight: number };
  nt: { naik: number; tidakNaik: number; duaT: number; belumDinilai: number };
  indicators: Record<string, Bucket>;
};

function emptyRow(unitId: string, unitName: string): ReportRow {
  return {
    unitId,
    unitName,
    registered: 0,
    measured: 0,
    balita: { total: 0, normal: 0, underweight: 0, severelyUnderweight: 0, riskOverweight: 0 },
    nt: { naik: 0, tidakNaik: 0, duaT: 0, belumDinilai: 0 },
    indicators: {},
  };
}

function hasData(m: Record<string, unknown>, ind: IndicatorDef): boolean {
  if (ind.key === 'hypertension') return m.systolic != null || m.diastolic != null;
  if (ind.key === 'abnormalVision') return m.visionStatus != null;
  if (ind.key === 'abnormalHearing') return m.hearingStatus != null;
  if (ind.key === 'tbRisk') return m.tbScreeningStatus != null;
  if (!ind.field) return false;
  const v = m[ind.field];
  return v != null && Number.isFinite(Number(v));
}

function toPosition(p: string | null): StaturePosition | undefined {
  return p === 'TELENTANG' || p === 'BERDIRI' ? p : undefined;
}

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let fromDate = searchParams.get('from') ?? fmt(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    const toDate = searchParams.get('to') ?? fmt(now);

    // Pilihan isi & unit. include: 'anggota' | 'detail' | 'beresiko'.
    const includeParam = (searchParams.get('include') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const wantMembers = includeParam.includes('anggota') || includeParam.includes('detail');
    const wantRisk = includeParam.includes('beresiko');
    const unitIdsParam = searchParams.get('unitIds');

    // Batas periode: role bawah 12 bulan, DINKES 24 bulan.
    const maxMonths = session.role === 'DINKES' ? 24 : 12;
    const fromObjInit = new Date(`${fromDate}T00:00:00`);
    const toObj = new Date(`${toDate}T00:00:00`);
    const minFrom = new Date(toObj);
    minFrom.setMonth(minFrom.getMonth() - maxMonths);
    if (fromObjInit < minFrom) fromDate = fmt(minFrom);
    const fromObj = new Date(`${fromDate}T00:00:00`);
    const toExclusive = new Date(toObj.getTime() + 86_400_000);

    // Scope posyandu ids (fail-closed per peran).
    let posyanduIds: string[] = [];
    if (session.role === 'POSYANDU' && session.posyanduId) {
      posyanduIds = [session.posyanduId];
    } else if (session.role === 'PUSKESMAS' && session.healthCenterId) {
      const ps = await prisma.posyandu.findMany({
        where: { healthCenterId: session.healthCenterId },
        select: { id: true },
      });
      const own = new Set(ps.map((p) => p.id));
      if (unitIdsParam) {
        posyanduIds = unitIdsParam
          .split(',')
          .map((s) => s.trim())
          .filter((id) => own.has(id));
      } else {
        posyanduIds = [...own];
      }
    } else {
      const ps = await prisma.posyandu.findMany({ select: { id: true } });
      posyanduIds = ps.map((p) => p.id);
    }

    if ((wantMembers || wantRisk) && posyanduIds.length > MAX_EXPORT_UNITS) {
      return NextResponse.json(
        {
          error: `Terlalu banyak posyandu (${posyanduIds.length}). Maksimal ${MAX_EXPORT_UNITS} posyandu untuk export data per pasien — persempit pilihan.`,
        },
        { status: 400 },
      );
    }

    const [posyandus, patients, meas] = await Promise.all([
      prisma.posyandu.findMany({
        where: { id: { in: posyanduIds } },
        select: {
          id: true,
          name: true,
          healthCenterId: true,
          healthCenter: { select: { id: true, name: true } },
        },
      }),
      prisma.patient.findMany({
        where: { posyanduId: { in: posyanduIds } },
        select: { id: true, posyanduId: true, createdAt: true },
      }),
      prisma.measurement.findMany({
        where: { posyanduId: { in: posyanduIds }, sessionDate: { gte: fromObj, lt: toExclusive } },
        select: {
          patientId: true,
          posyanduId: true,
          sessionDate: true,
          weight: true,
          height: true,
          position: true,
          category: true,
          weightStatus: true,
          weightFaltering2T: true,
          systolic: true,
          diastolic: true,
          hemoglobin: true,
          bloodSugar: true,
          cholesterol: true,
          uricAcid: true,
          visionStatus: true,
          hearingStatus: true,
          tbScreeningStatus: true,
          patient: { select: { gender: true, birthDate: true, isPregnant: true } },
        },
      }),
    ]);

    const info = new Map(posyandus.map((p) => [p.id, p]));
    const posyanduRow = new Map<string, ReportRow>();
    const getPosRow = (pid: string) => {
      let r = posyanduRow.get(pid);
      if (!r) {
        r = emptyRow(pid, info.get(pid)?.name ?? '');
        posyanduRow.set(pid, r);
      }
      return r;
    };

    // Terdaftar: createdAt <= akhir periode.
    const toMs = toExclusive.getTime();
    for (const p of patients) {
      if (p.createdAt.getTime() <= toMs) getPosRow(p.posyanduId).registered++;
    }

    // Pengukuran terakhir per pasien dalam periode.
    const latest = new Map<string, (typeof meas)[number]>();
    for (const m of meas) {
      const cur = latest.get(m.patientId);
      if (!cur || m.sessionDate.getTime() > cur.sessionDate.getTime()) latest.set(m.patientId, m);
    }

    for (const m of latest.values()) {
      const row = getPosRow(m.posyanduId);
      row.measured++;

      const category = (m.category as PatientCategory) ??
        getPatientCategory(m.patient.birthDate, m.patient.isPregnant);

      if (category === 'BAYI' || category === 'BALITA_APRAS') {
        row.balita.total++;
        const res = computeGrowth({
          gender: m.patient.gender,
          birthDate: m.patient.birthDate,
          sessionDate: m.sessionDate,
          weight: m.weight,
          height: m.height,
          position: toPosition(m.position),
        });
        const bb = res.BB_U;
        if (bb) {
          switch (bb.categoryKey) {
            case 'normal':
              row.balita.normal++;
              break;
            case 'underweight':
              row.balita.underweight++;
              break;
            case 'severely_underweight':
              row.balita.severelyUnderweight++;
              break;
            case 'risk_overweight':
            case 'overweight':
            case 'obese':
              row.balita.riskOverweight++;
              break;
          }
        }
        // N/T & 2T hanya KMS (umur 0-60 bln); kategori Apras lanjut tidak dinilai.
        if (isKmsAge(ageInCompletedMonths(m.patient.birthDate, m.sessionDate))) {
          if (m.weightStatus === 'NAIK') row.nt.naik++;
          else if (m.weightStatus === 'TIDAK_NAIK') row.nt.tidakNaik++;
          else row.nt.belumDinilai++;
          if (m.weightFaltering2T) row.nt.duaT++;
        }
      }

      const applicable = INDICATORS.filter((ind) => ind.appliesTo.includes(category));
      const raw = m as unknown as Record<string, unknown>;
      for (const ind of applicable) {
        if (!hasData(raw, ind)) continue;
        const b = (row.indicators[ind.key] ??= { abnormal: 0, assessed: 0 });
        b.assessed++;
        if (checkIndicator(m, ind, m.patient.gender, category)) b.abnormal++;
      }
    }

    // Unit list + global sesuai peran.
    const rows = [...posyanduRow.values()];
    let units: ReportRow[];
    if (session.role === 'DINKES') {
      const byHc = new Map<string, ReportRow>();
      for (const r of rows) {
        const p = info.get(r.unitId);
        const hcId = p?.healthCenterId ?? 'unknown';
        let agg = byHc.get(hcId);
        if (!agg) {
          agg = emptyRow(hcId, p?.healthCenter?.name ?? 'Tidak diketahui');
          byHc.set(hcId, agg);
        }
        mergeRow(agg, r);
      }
      units = [...byHc.values()].sort((a, b) => a.unitName.localeCompare(b.unitName));
    } else {
      units = rows.sort((a, b) => a.unitName.localeCompare(b.unitName));
    }

    const global = emptyRow('global', 'Total');
    for (const r of rows) mergeRow(global, r);

    const canDetails = session.role !== 'DINKES';
    const estimates = {
      units: posyanduIds.length,
      patients: patients.filter((p) => p.createdAt.getTime() < toExclusive.getTime()).length,
      measurements: meas.length,
    };

    const payload = {
      success: true,
      from: fromDate,
      to: toDate,
      role: session.role,
      unitLabel: session.role === 'DINKES' ? 'Puskesmas' : 'Posyandu',
      global,
      units,
      estimates: { ...estimates, rows: estimates.patients + estimates.measurements },
      limits: { units: MAX_EXPORT_UNITS, rows: MAX_EXPORT_ROWS },
      canDetails,
    };

    if (searchParams.get('format') === 'xlsx') {
      let members: MemberSheets | null = null;
      let risks: ExportRow[] | null = null;

      if (canDetails && (wantMembers || wantRisk) && posyanduIds.length > 0) {
        const data = await memberSheets(posyanduIds, fromObj, toExclusive);
        const rowCount = data.patients.length + data.measurements.length;
        if (rowCount > MAX_EXPORT_ROWS) {
          return NextResponse.json(
            {
              error: `Data terlalu besar (±${rowCount} baris). Maksimal ${MAX_EXPORT_ROWS} baris — persempit periode atau pilihan posyandu.`,
            },
            { status: 413 },
          );
        }
        const periodEnd = new Date(toExclusive.getTime() - 1);
        if (wantMembers) {
          members = {
            roster: buildRoster(data.patients, data.measurements, periodEnd),
            details: buildDetails(data.patients, data.measurements),
          };
        }
        if (wantRisk) risks = buildRiskList(data.patients, data.measurements);
      }

      return xlsxResponse(payload, members, risks);
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Stats report error:', error);
    return NextResponse.json({ error: 'Gagal memuat rekap' }, { status: 500 });
  }
}

function mergeRow(dst: ReportRow, src: ReportRow) {
  dst.registered += src.registered;
  dst.measured += src.measured;
  dst.balita.total += src.balita.total;
  dst.balita.normal += src.balita.normal;
  dst.balita.underweight += src.balita.underweight;
  dst.balita.severelyUnderweight += src.balita.severelyUnderweight;
  dst.balita.riskOverweight += src.balita.riskOverweight;
  dst.nt.naik += src.nt.naik;
  dst.nt.tidakNaik += src.nt.tidakNaik;
  dst.nt.duaT += src.nt.duaT;
  dst.nt.belumDinilai += src.nt.belumDinilai;
  for (const [k, v] of Object.entries(src.indicators)) {
    const b = (dst.indicators[k] ??= { abnormal: 0, assessed: 0 });
    b.abnormal += v.abnormal;
    b.assessed += v.assessed;
  }
}

type ReportPayload = {
  from: string;
  to: string;
  role: string;
  unitLabel: string;
  global: ReportRow;
  units: ReportRow[];
};

function flatRow(no: number | string, r: ReportRow) {
  const out: Record<string, string | number> = {
    No: no,
    Unit: r.unitName,
    Terdaftar: r.registered,
    Terukur: r.measured,
    'Balita Total': r.balita.total,
    'Gizi Normal': r.balita.normal,
    'Gizi Kurang': r.balita.underweight,
    'Gizi Sangat Kurang': r.balita.severelyUnderweight,
    'Gizi Risiko Lebih': r.balita.riskOverweight,
    'N (naik)': r.nt.naik,
    'T (tidak naik)': r.nt.tidakNaik,
    '2T (rujuk)': r.nt.duaT,
    'Belum Dinilai BB': r.nt.belumDinilai,
  };
  for (const ind of INDICATORS) {
    const b = r.indicators[ind.key];
    out[`${ind.label} — temuan`] = b?.abnormal ?? 0;
    out[`${ind.label} — diperiksa`] = b?.assessed ?? 0;
  }
  return out;
}

type MemberSheets = { roster: ExportRow[]; details: ExportRow[] };
type MemberData = { patients: ExportPatient[]; measurements: ExportMeasurement[] };

/** Ambil pasien + pengukuran periode untuk sekumpulan posyandu (export per pasien). */
async function memberSheets(
  posyanduIds: string[],
  fromObj: Date,
  toExclusive: Date,
): Promise<MemberData> {
  const posyandus = await prisma.posyandu.findMany({
    where: { id: { in: posyanduIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(posyandus.map((p) => [p.id, p.name]));

  const patients = await prisma.patient.findMany({
    where: { posyanduId: { in: posyanduIds }, createdAt: { lt: toExclusive } },
    select: {
      id: true,
      regNumber: true,
      name: true,
      birthDate: true,
      gender: true,
      isPregnant: true,
      address: true,
      posyanduId: true,
    },
  });
  const ids = patients.map((p) => p.id);
  const measurements = ids.length
    ? await prisma.measurement.findMany({
        where: {
          posyanduId: { in: posyanduIds },
          patientId: { in: ids },
          sessionDate: { gte: fromObj, lt: toExclusive },
        },
      })
    : [];

  return {
    patients: patients.map((p) => ({ ...p, unitName: nameById.get(p.posyanduId) ?? '' })),
    measurements,
  };
}

/** Lebar kolom proporsional judul (SheetJS community tak dukung styling sel). */
function setCols(ws: XLSX.WorkSheet, rows: ExportRow[]) {
  const sample = rows[0];
  if (!sample) return;
  ws['!cols'] = Object.keys(sample).map((k) => ({ wch: Math.max(k.length + 2, 12) }));
}

function xlsxResponse(p: ReportPayload, members: MemberSheets | null, risks: ExportRow[] | null) {
  const wb = XLSX.utils.book_new();

  const globalSheet = XLSX.utils.json_to_sheet([flatRow('TOTAL', p.global)]);
  XLSX.utils.book_append_sheet(wb, globalSheet, 'Ringkasan');

  const unitSheet = XLSX.utils.json_to_sheet(
    p.units.map((r, i) => flatRow(i + 1, r)),
  );
  XLSX.utils.book_append_sheet(wb, unitSheet, p.unitLabel);

  if (members) {
    const rosterSheet = XLSX.utils.json_to_sheet(members.roster);
    setCols(rosterSheet, members.roster);
    XLSX.utils.book_append_sheet(wb, rosterSheet, 'Daftar Anggota');

    const detailSheet = XLSX.utils.json_to_sheet(members.details);
    setCols(detailSheet, members.details);
    XLSX.utils.book_append_sheet(wb, detailSheet, 'Detail Pengukuran');
  }

  if (risks) {
    const riskSheet = XLSX.utils.json_to_sheet(risks);
    setCols(riskSheet, risks);
    XLSX.utils.book_append_sheet(wb, riskSheet, 'Daftar Berisiko');
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  const scopeLabel =
    members && p.units.length === 1 ? sanitizeName(p.units[0].unitName) : sanitizeName(p.unitLabel);
  const filename = `Rekap_${scopeLabel}_${p.from}_${p.to}.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function sanitizeName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'Posyandu';
}
