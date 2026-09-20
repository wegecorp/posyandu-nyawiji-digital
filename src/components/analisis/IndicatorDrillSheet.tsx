'use client';

import React, { useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DrillSheet } from './DrillSheet';
import { UnitDrillList, type DrillUnit } from './UnitDrillList';
import { PatientDrillList } from './PatientDrillList';
import { useBackLayer } from '@/lib/back-navigation';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const i = parseInt(m, 10) - 1;
  return `${MONTHS_SHORT[i] ?? m} ${y}`;
}

function monthDateRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * Detail per-indikator, sadar peran:
 * - DINKES   : peringkat Puskesmas → peringkat Posyandu (agregat, tanpa nama).
 * - PUSKESMAS: peringkat Posyandu → daftar pasien (nama).
 * - POSYANDU : daftar pasien (nama) langsung.
 */
export function IndicatorDrillSheet({
  indicator,
  label,
  month,
  from: propFrom,
  to: propTo,
  onClose,
  hcId,
  hcName,
}: {
  indicator: string;
  label: string;
  /** Bulan aktif (YYYY-MM) agar query fokus pada bulan tersebut */
  month?: string;
  from?: string;
  to?: string;
  onClose: () => void;
  /** Bila dibuka dari konteks drill HC, langsung tampilkan posyandu HC ini. */
  hcId?: string;
  hcName?: string;
}) {
  const { user } = useAuth();
  const role = user?.role;
  const [hc, setHc] = useState<DrillUnit | null>(
    hcId ? { unitId: hcId, unitName: hcName ?? '', count: 0, total: 0, percent: 0 } : null,
  );
  const [posyandu, setPosyandu] = useState<DrillUnit | null>(null);

  const range = month ? monthDateRange(month) : null;
  const from = range ? range.from : (propFrom ?? '');
  const to = range ? range.to : (propTo ?? '');

  const unitsBase = `/api/stats/indicator-units?indicator=${indicator}&from=${from}&to=${to}`;
  const patientBase = `/api/stats/abnormal-patients?indicator=${indicator}&from=${from}&to=${to}${month ? `&ym=${month}` : ''}`;

  const mapRaw = useCallback((r: Record<string, unknown>): DrillUnit => {
    const abnormal = Number(r.count ?? r.abnormal ?? 0);
    const assessed = Number(r.total ?? r.assessed ?? 0);
    const rawPct = r.percent ?? r.prevalence;
    const percent =
      typeof rawPct === 'number' && Number.isFinite(rawPct)
        ? rawPct
        : assessed > 0
          ? abnormal / assessed
          : 0;
    return {
      unitId: String(r.unitId ?? ''),
      unitName: String(r.unitName ?? ''),
      count: abnormal,
      total: assessed,
      percent,
      smallSample: Boolean(r.smallSample ?? assessed < 5),
    };
  }, []);

  const monthLabel = month ? formatYM(month) : '';
  const title = posyandu?.unitName ?? hc?.unitName ?? `Temuan: ${label}`;
  const subtitle = posyandu || hc
    ? `${label}${monthLabel ? ` · Bulan ${monthLabel}` : ''}`
    : `${role === 'DINKES' ? 'Peringkat per Puskesmas' : 'Peringkat per Posyandu'}${monthLabel ? ` · Bulan ${monthLabel}` : ''}`;
  const onBack =
    role === 'DINKES'
      ? hcId
        ? undefined
        : hc
          ? () => setHc(null)
          : undefined
      : posyandu
        ? () => setPosyandu(null)
        : undefined;

  // Back OS saat sudah masuk level unit (hc/posyandu) — naik satu tingkat.
  useBackLayer(Boolean(onBack), onBack ?? onClose);

  return (
    <DrillSheet title={title} subtitle={subtitle} onClose={onClose} onBack={onBack}>
      {role === 'POSYANDU' ? (
        <PatientDrillList baseUrl={patientBase} emptyText="Tidak ada temuan pada filter ini." />
      ) : posyandu ? (
        <PatientDrillList
          key={posyandu.unitId}
          baseUrl={`${patientBase}&unitId=${posyandu.unitId}&unitLevel=posyandu`}
          emptyText="Tidak ada temuan pada unit ini."
        />
      ) : role === 'PUSKESMAS' ? (
        <UnitDrillList
          baseUrl={`${unitsBase}&scope=posyandu`}
          mapRaw={mapRaw}
          onPick={(u) => setPosyandu(u)}
          searchPlaceholder="Cari posyandu..."
        />
      ) : hc ? (
        // DINKES berhenti di agregat Posyandu (tanpa nama pasien) — §9b.
        <UnitDrillList
          key={hc.unitId}
          baseUrl={`${unitsBase}&scope=posyandu&hcId=${hc.unitId}`}
          mapRaw={mapRaw}
          searchPlaceholder="Cari posyandu..."
        />
      ) : (
        <UnitDrillList
          baseUrl={`${unitsBase}&scope=puskesmas`}
          mapRaw={mapRaw}
          onPick={setHc}
          searchPlaceholder="Cari puskesmas..."
        />
      )}
    </DrillSheet>
  );
}
