'use client';

import React, { useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DrillSheet } from './DrillSheet';
import { UnitDrillList, type DrillUnit } from './UnitDrillList';
import { useBackLayer } from '@/lib/back-navigation';

/**
 * Drill ASI Eksklusif per peran (berhenti di agregat unit):
 * - DINKES   : peringkat Puskesmas → peringkat Posyandu.
 * - PUSKESMAS: peringkat Posyandu.
 * - POSYANDU : tidak dipakai (satu unit).
 */
export function BreastfeedingDrillSheet({
  from,
  to,
  onClose,
}: {
  from: string;
  to: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const role = user?.role;
  const [hc, setHc] = useState<DrillUnit | null>(null);

  const base = `/api/stats/breastfeeding?from=${from}&to=${to}`;

  const mapRaw = useCallback(
    (r: Record<string, unknown>): DrillUnit => {
      const exclusive = Number(r.exclusive ?? 0);
      const assessed = Number(r.assessed ?? 0);
      return {
        unitId: String(r.unitId ?? ''),
        unitName: String(r.unitName ?? ''),
        count: exclusive,
        total: assessed,
        percent: assessed > 0 ? exclusive / assessed : 0,
        smallSample: assessed < 5,
      };
    },
    [],
  );

  const title = hc?.unitName ?? 'ASI Eksklusif (Bayi)';
  const subtitle = hc
    ? 'Peringkat Posyandu'
    : role === 'DINKES'
      ? 'Peringkat per Puskesmas'
      : 'Peringkat per Posyandu';
  const onBack = role === 'DINKES' && hc ? () => setHc(null) : undefined;

  useBackLayer(Boolean(onBack), onBack ?? onClose);

  return (
    <DrillSheet title={title} subtitle={subtitle} onClose={onClose} onBack={onBack}>
      {role === 'DINKES' && !hc ? (
        <UnitDrillList
          baseUrl={`${base}&scope=puskesmas`}
          mapRaw={mapRaw}
          onPick={setHc}
          searchPlaceholder="Cari puskesmas..."
        />
      ) : (
        <UnitDrillList
          key={hc?.unitId ?? 'all'}
          baseUrl={`${base}&scope=posyandu${hc ? `&hcId=${hc.unitId}` : ''}`}
          mapRaw={mapRaw}
          emptyText="Tidak ada data ASI eksklusif pada filter ini."
          searchPlaceholder="Cari posyandu..."
        />
      )}
    </DrillSheet>
  );
}
