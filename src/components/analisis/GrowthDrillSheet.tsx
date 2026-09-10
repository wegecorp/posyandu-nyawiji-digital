'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DrillSheet } from './DrillSheet';
import { UnitDrillList, type DrillUnit } from './UnitDrillList';
import { PatientDrillList } from './PatientDrillList';

/**
 * Drill status gizi per peran:
 * - POSYANDU : daftar pasien (nama) langsung.
 * - PUSKESMAS: peringkat Posyandu → daftar pasien (nama).
 * - DINKES   : peringkat Puskesmas → peringkat Posyandu (agregat, tanpa nama).
 */
export function GrowthDrillSheet({
  indicator,
  categoryKey,
  categoryLabel,
  indicatorLabel,
  from,
  to,
  onClose,
}: {
  indicator: string;
  categoryKey: string;
  categoryLabel: string;
  indicatorLabel: string;
  from: string;
  to: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const role = user?.role;
  const [hc, setHc] = useState<DrillUnit | null>(null);
  const [posyandu, setPosyandu] = useState<DrillUnit | null>(null);

  const base = `/api/stats/growth-units?indicator=${indicator}&category=${categoryKey}&from=${from}&to=${to}`;
  const patientBase = `/api/stats/growth-patients?indicator=${indicator}&category=${categoryKey}&from=${from}&to=${to}`;

  const title = posyandu?.unitName ?? hc?.unitName ?? categoryLabel;
  const subtitle = indicatorLabel;
  const onBack =
    role === 'DINKES'
      ? posyandu
        ? () => setPosyandu(null)
        : hc
          ? () => setHc(null)
          : undefined
      : role === 'PUSKESMAS'
        ? posyandu
          ? () => setPosyandu(null)
          : undefined
        : undefined;

  return (
    <DrillSheet title={title} subtitle={subtitle} onClose={onClose} onBack={onBack}>
      {role === 'POSYANDU' ? (
        <PatientDrillList baseUrl={patientBase} emptyText="Tidak ada balita pada kategori ini." />
      ) : posyandu ? (
        <PatientDrillList
          key={posyandu.unitId}
          baseUrl={`${patientBase}&posyanduId=${posyandu.unitId}`}
          emptyText="Tidak ada balita pada kategori ini."
        />
      ) : role === 'PUSKESMAS' ? (
        <UnitDrillList
          baseUrl={`${base}&scope=posyandu`}
          onPick={(u) => setPosyandu(u)}
          searchPlaceholder="Cari posyandu..."
        />
      ) : hc ? (
        <UnitDrillList
          key={hc.unitId}
          baseUrl={`${base}&scope=posyandu&hcId=${hc.unitId}`}
          onPick={setPosyandu}
          searchPlaceholder="Cari posyandu..."
        />
      ) : (
        <UnitDrillList
          baseUrl={`${base}&scope=puskesmas`}
          onPick={setHc}
          searchPlaceholder="Cari puskesmas..."
        />
      )}
    </DrillSheet>
  );
}
