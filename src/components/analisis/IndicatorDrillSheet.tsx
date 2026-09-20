'use client';

import React, { useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DrillSheet } from './DrillSheet';
import { UnitDrillList, type DrillUnit } from './UnitDrillList';
import { PatientDrillList } from './PatientDrillList';
import { useBackLayer } from '@/lib/back-navigation';

/**
 * Detail per-indikator, sadar peran:
 * - DINKES   : peringkat Puskesmas → peringkat Posyandu (agregat, tanpa nama).
 * - PUSKESMAS: peringkat Posyandu → daftar pasien (nama).
 * - POSYANDU : daftar pasien (nama) langsung.
 */
export function IndicatorDrillSheet({
  indicator,
  label,
  from,
  to,
  onClose,
  hcId,
  hcName,
}: {
  indicator: string;
  label: string;
  from: string;
  to: string;
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

  const unitsBase = `/api/stats/indicator-units?indicator=${indicator}&from=${from}&to=${to}`;
  const patientBase = `/api/stats/abnormal-patients?indicator=${indicator}&from=${from}&to=${to}`;

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

  const title = posyandu?.unitName ?? hc?.unitName ?? `Temuan: ${label}`;
  const subtitle = posyandu || hc ? label : role === 'DINKES' ? 'Peringkat per Puskesmas' : 'Peringkat per Posyandu';
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
