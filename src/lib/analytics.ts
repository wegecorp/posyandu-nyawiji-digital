/**
 * Server-side aggregation helpers untuk statistik pemaparan data.
 *
 * CATATAN: Prisma menyimpan DateTime SQLite sebagai INTEGER epoch-milliseconds.
 * Jadi semua perbandingan tanggal di $queryRaw WAJIB pakai rentang numeric ms,
 * dan konversi ke bulan harus sessionDate/1000,'unixepoch','localtime'.
 * Membandingkan kolom integer dengan string tanggal ("YYYY-MM-DD") SELALU 0 baris,
 * dan date(sessionDate) rusak karena integer itu bukan Julian day.
 */

import { prisma } from './prisma';
import { checkIndicator, INDICATORS } from './clinical';
import type { PatientCategory } from './types';

/** Konversi rentang tanggal 'YYYY-MM-DD' (inklusif) → [fromMs, toExclusiveMs). */
export function dateRangeMs(from: string, to: string): { fromMs: number; toMs: number } {
  const fromMs = new Date(`${from}T00:00:00`).getTime();
  const toMs = new Date(`${to}T00:00:00`).getTime() + 86_400_000;
  return { fromMs, toMs };
}

export interface CoverageRow {
  ym: string;
  unitId: string;
  numerator: number;
  denominator: number;
}

export interface AggregatedCoverageRow {
  ym: string;
  unitId: string;
  unitName: string;
  numerator: number;
  denominator: number;
  participation: number;
}

interface UnitInfo {
  id: string;
  name: string;
  healthCenterId?: string;
  healthCenterName?: string;
}

/**
 * Fetch coverage per posyandu per bulan dalam rentang [from, to] (YYYY-MM-DD, inklusif).
 */
export async function fetchCoverageBase(from: string, to: string): Promise<CoverageRow[]> {
  const { fromMs, toMs } = dateRangeMs(from, to);
  // NOTE: ekspresi strftime DITULIS LANGSUNG (bukan ${...}) — Prisma mengikat ${} sbg parameter, bukan inline SQL.
  const rows = await prisma.$queryRaw<
    Array<{ ym: string; unitId: string; numerator: bigint }>
  >`
    SELECT
      strftime('%Y-%m', m.sessionDate/1000, 'unixepoch', 'localtime') AS ym,
      m.posyanduId AS unitId,
      COUNT(DISTINCT m.patientId) AS numerator
    FROM Measurement m
    WHERE m.sessionDate >= ${fromMs}
      AND m.sessionDate < ${toMs}
    GROUP BY ym, unitId
  `;

  const denomRows = await prisma.$queryRaw<
    Array<{ posyanduId: string; cnt: bigint }>
  >`
    SELECT posyanduId, COUNT(id) AS cnt
    FROM Patient
    GROUP BY posyanduId
  `;
  const denomMap = new Map(denomRows.map((r) => [r.posyanduId, Number(r.cnt)]));

  return rows.map((r) => ({
    ym: r.ym,
    unitId: r.unitId,
    numerator: Number(r.numerator),
    denominator: denomMap.get(r.unitId) ?? 0,
  }));
}

/** Look up posyandu names + parent HC info. */
export async function getPosyanduInfo(ids: string[]): Promise<Map<string, UnitInfo>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.posyandu.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      healthCenterId: true,
      healthCenter: { select: { id: true, name: true } },
    },
  });
  return new Map(
    rows.map((r) => [
      r.id,
      { id: r.id, name: r.name, healthCenterId: r.healthCenterId, healthCenterName: r.healthCenter?.name },
    ]),
  );
}

/** Look up healthCenter names. */
export async function getHealthCenterInfo(ids: string[]): Promise<Map<string, UnitInfo>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.healthCenter.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [r.id, { id: r.id, name: r.name }]));
}

/**
 * Aggregate base coverage (posyandu) up to healthCenter level.
 * Sums numerator (unique patients measured) & denominator (registered patients) per HC per month.
 */
export function aggregateToHealthCenter(
  base: CoverageRow[],
  posyanduInfoMap: Map<string, UnitInfo>,
  months: string[],
): AggregatedCoverageRow[] {
  const byHcYm = new Map<string, { numerator: number; denominator: number }>();

  for (const row of base) {
    const info = posyanduInfoMap.get(row.unitId);
    const hcId = info?.healthCenterId ?? 'unknown';
    const key = `${hcId}|${row.ym}`;
    const existing = byHcYm.get(key);
    if (existing) {
      existing.numerator += row.numerator;
      existing.denominator += row.denominator;
    } else {
      byHcYm.set(key, { numerator: row.numerator, denominator: row.denominator });
    }
  }

  // Build result, fill missing months with zeros
  const hcIds = new Set<string>();
  for (const row of base) {
    const info = posyanduInfoMap.get(row.unitId);
    hcIds.add(info?.healthCenterId ?? 'unknown');
  }

  const hcNameMap = new Map<string, string>();
  for (const info of posyanduInfoMap.values()) {
    if (info.healthCenterId && info.healthCenterName) {
      hcNameMap.set(info.healthCenterId, info.healthCenterName);
    }
  }

  const result: AggregatedCoverageRow[] = [];
  for (const hcId of hcIds) {
    for (const ym of months) {
      const key = `${hcId}|${ym}`;
      const agg = byHcYm.get(key);
      const num = agg?.numerator ?? 0;
      const den = agg?.denominator ?? 0;
      result.push({
        ym,
        unitId: hcId,
        unitName: hcNameMap.get(hcId) ?? 'Tidak Diketahui',
        numerator: num,
        denominator: den,
        participation: den > 0 ? num / den : 0,
      });
    }
  }

  return result;
}

/** Aggregate base coverage to kabupaten level (single row per month). */
export function aggregateToKabupaten(base: CoverageRow[], months: string[]): AggregatedCoverageRow[] {
  const byYm = new Map<string, { numerator: number; denominator: number }>();
  for (const m of months) byYm.set(m, { numerator: 0, denominator: 0 });

  for (const row of base) {
    const agg = byYm.get(row.ym);
    if (agg) {
      agg.numerator += row.numerator;
      agg.denominator += row.denominator;
    }
  }

  return months.map((m) => {
    const agg = byYm.get(m)!;
    return {
      ym: m,
      unitId: 'kabupaten',
      unitName: 'Kabupaten Gunungkidul',
      numerator: agg.numerator,
      denominator: agg.denominator,
      participation: agg.denominator > 0 ? agg.numerator / agg.denominator : 0,
    };
  });
}

/** Generate YYYY-MM keys in range. */
export function monthRange(from: string, to: string): string[] {
  const start = new Date(from);
  const end = new Date(to);
  const months: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

// ─── Outcomes ────────────────────────────────────────────────────────────────

interface OutcomeBaseRow {
  ym: string;
  posyanduId: string;
  patientId: string;
  category: string | null;
  gender: string | null;
  systolic: number | null;
  diastolic: number | null;
  hemoglobin: number | null;
  bloodSugar: number | null;
  cholesterol: number | null;
  uricAcid: number | null;
  visionStatus: string | null;
  hearingStatus: string | null;
}

export interface UnitOutcomeAgg {
  ym: string;
  unitId: string;
  unitName: string;
  total: number;
  normal: number;
  abnormal: number;
  abnormalByIndicator: Record<string, number>;
}

/** Fetch raw measurements for outcome classification. */
export async function fetchOutcomeBase(from: string, to: string): Promise<OutcomeBaseRow[]> {
  const { fromMs, toMs } = dateRangeMs(from, to);
  return prisma.$queryRaw<OutcomeBaseRow[]>`
    SELECT
      strftime('%Y-%m', m.sessionDate/1000, 'unixepoch', 'localtime') AS ym,
      m.posyanduId,
      m.patientId,
      m.category,
      p.gender,
      m.systolic,
      m.diastolic,
      m.hemoglobin,
      m.bloodSugar,
      m.cholesterol,
      m.uricAcid,
      m.visionStatus,
      m.hearingStatus
    FROM Measurement m
    JOIN Patient p ON p.id = m.patientId
    WHERE m.sessionDate >= ${fromMs}
      AND m.sessionDate < ${toMs}
  `;
}

/** Classify raw outcome rows → per-unit + global aggregates. */
export function classifyOutcomes(rows: OutcomeBaseRow[]): {
  byUnit: Map<string, UnitOutcomeAgg[]>;
  totals: { ym: string; total: number; normal: number; abnormal: number; abnormalByIndicator: Record<string, number> }[];
} {
  const unitMap = new Map<string, UnitOutcomeAgg[]>();
  const globalMap = new Map<string, { ym: string; total: number; normal: number; abnormal: number; abnormalByIndicator: Record<string, number> }>();

  function getOrCreateUnit(posId: string, ym: string): UnitOutcomeAgg {
    if (!unitMap.has(posId)) unitMap.set(posId, []);
    let agg = unitMap.get(posId)!.find((a) => a.ym === ym);
    if (!agg) {
      agg = { ym, unitId: posId, unitName: '', total: 0, normal: 0, abnormal: 0, abnormalByIndicator: {} };
      unitMap.get(posId)!.push(agg);
    }
    return agg;
  }

  function getOrCreateGlobal(ym: string) {
    let agg = globalMap.get(ym);
    if (!agg) {
      agg = { ym, total: 0, normal: 0, abnormal: 0, abnormalByIndicator: {} };
      globalMap.set(ym, agg);
    }
    return agg;
  }

  for (const r of rows) {
    const aggU = getOrCreateUnit(r.posyanduId, r.ym);
    const aggG = getOrCreateGlobal(r.ym);
    aggU.total++;
    aggG.total++;

    let hasAbnormal = false;
    for (const ind of INDICATORS) {
      if (checkIndicator(r, ind, r.gender, (r.category as PatientCategory) ?? null)) {
        hasAbnormal = true;
        aggU.abnormalByIndicator[ind.key] = (aggU.abnormalByIndicator[ind.key] ?? 0) + 1;
        aggG.abnormalByIndicator[ind.key] = (aggG.abnormalByIndicator[ind.key] ?? 0) + 1;
      }
    }
    if (hasAbnormal) {
      aggU.abnormal++;
      aggG.abnormal++;
    } else {
      aggU.normal++;
      aggG.normal++;
    }
  }

  return {
    byUnit: unitMap,
    totals: Array.from(globalMap.values()).sort((a, b) => a.ym.localeCompare(b.ym)),
  };
}

/** Aggregate per-posyandu outcomes up to healthCenter level. */
export function outcomesToHealthCenter(
  byUnit: Map<string, UnitOutcomeAgg[]>,
  posyanduInfoMap: Map<string, UnitInfo>,
): UnitOutcomeAgg[] {
  const hcYmMap = new Map<string, UnitOutcomeAgg>();
  for (const [posId, rows] of byUnit) {
    const info = posyanduInfoMap.get(posId);
    const hcId = info?.healthCenterId ?? 'unknown';
    const hcName = info?.healthCenterName ?? 'Tidak Diketahui';
    for (const r of rows) {
      const key = `${hcId}|${r.ym}`;
      let agg = hcYmMap.get(key);
      if (!agg) {
        agg = { ym: r.ym, unitId: hcId, unitName: hcName, total: 0, normal: 0, abnormal: 0, abnormalByIndicator: {} };
        hcYmMap.set(key, agg);
      }
      agg.total += r.total;
      agg.normal += r.normal;
      agg.abnormal += r.abnormal;
      for (const [k, v] of Object.entries(r.abnormalByIndicator)) {
        agg.abnormalByIndicator[k] = (agg.abnormalByIndicator[k] ?? 0) + v;
      }
    }
  }
  return Array.from(hcYmMap.values()).sort((a, b) => a.ym.localeCompare(b.ym));
}
