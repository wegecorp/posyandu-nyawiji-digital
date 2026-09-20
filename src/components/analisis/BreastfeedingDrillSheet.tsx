'use client';

import React, { useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DrillSheet } from './DrillSheet';
import { UnitDrillList, type DrillUnit } from './UnitDrillList';
import { useBackLayer } from '@/lib/back-navigation';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Label bulan pendek dari `YYYY-MM`, mis. "Jan 2026". */
export function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const i = parseInt(m, 10) - 1;
  return `${MONTHS_SHORT[i] ?? m} ${y}`;
}

/** Rentang tanggal penuh satu bulan `YYYY-MM`. */
function monthRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * Drill ASI Eksklusif per peran (berhenti di agregat unit), satu bulan fokus:
 * - DINKES   : peringkat Puskesmas → peringkat Posyandu.
 * - PUSKESMAS: peringkat Posyandu.
 * Bulan mengikuti kartu (latest) dan bisa diganti lewat pemilih bulan.
 */
export function BreastfeedingDrillSheet({
  months,
  initialYm,
  initialHc,
  onClose,
}: {
  /** Daftar bulan yang punya data (`YYYY-MM`), menaik. */
  months: string[];
  /** Bulan yang ditampilkan kartu saat sheet dibuka. */
  initialYm: string;
  /** Buka langsung pada level Posyandu satu puskesmas. */
  initialHc?: { unitId: string; unitName: string };
  onClose: () => void;
}) {
  const { user } = useAuth();
  const role = user?.role;
  const [ym, setYm] = useState(initialYm || months[months.length - 1] || '');
  const [hc, setHc] = useState<DrillUnit | null>(
    initialHc ? { ...initialHc, count: 0, total: 0, percent: 0 } : null,
  );

  const range = ym ? monthRange(ym) : null;
  const base = range
    ? `/api/stats/breastfeeding?from=${range.from}&to=${range.to}`
    : '/api/stats/breastfeeding';

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

  const title = hc?.unitName || 'ASI Eksklusif (Bayi)';
  const subtitle = `${ym ? formatYM(ym) : ''}${
    hc ? ' · Peringkat Posyandu' : role === 'DINKES' ? ' · Peringkat per Puskesmas' : ' · Peringkat per Posyandu'
  }`;
  const onBack = role === 'DINKES' && hc ? () => setHc(null) : undefined;

  useBackLayer(Boolean(onBack), onBack ?? onClose);

  const monthPicker = months.length > 1 && (
    <div className="mb-3">
      <label
        htmlFor="breastfeeding-month"
        className="block text-[10px] font-bold text-[#667781] uppercase tracking-wide mb-1"
      >
        Bulan
      </label>
      <select
        id="breastfeeding-month"
        data-testid="breastfeeding-month"
        value={ym}
        onChange={(e) => setYm(e.target.value)}
        className="w-full bg-white border border-[#e9edef] rounded-xl px-3 py-2 text-xs font-bold text-[#111b21] outline-none focus:border-[#128c7e]"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {formatYM(m)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <DrillSheet title={title} subtitle={subtitle} onClose={onClose} onBack={onBack}>
      {monthPicker}
      {role === 'DINKES' && !hc ? (
        <UnitDrillList
          baseUrl={`${base}&scope=puskesmas`}
          mapRaw={mapRaw}
          onPick={setHc}
          searchPlaceholder="Cari puskesmas..."
          highlightColor="green"
        />
      ) : (
        <UnitDrillList
          key={hc?.unitId ?? 'all'}
          baseUrl={`${base}&scope=posyandu${hc ? `&hcId=${hc.unitId}` : ''}`}
          mapRaw={mapRaw}
          emptyText="Tidak ada data ASI eksklusif pada filter ini."
          searchPlaceholder="Cari posyandu..."
          highlightColor="green"
        />
      )}
    </DrillSheet>
  );
}
