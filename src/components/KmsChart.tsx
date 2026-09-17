'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  correctedLengthHeight,
  defaultPosition,
  referenceAt,
  tableFor,
  type GrowthIndex,
  type Sex,
} from '@/lib/growth';
import type { MeasurementData } from '@/lib/types';

interface KmsChartProps {
  measurements: MeasurementData[];
  gender?: string | null;
  /** Indeks KMS: BB/U (berat, default) atau TB/U (tinggi — skrining stunting). */
  index?: GrowthIndex;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Kurva KMS (Permenkes 2/2020): nilai anak vs umur dengan garis SD.
 * BB/U = berat badan (kg); TB/U = tinggi badan (cm, skrining stunting).
 */
export function KmsChart({ measurements, gender, index = 'BB_U' }: KmsChartProps) {
  const sex: Sex = gender === 'P' ? 'P' : 'L';
  const isHeight = index === 'TB_U';
  const unit = isHeight ? 'cm' : 'kg';
  const valueLabel = isHeight ? 'Tinggi anak' : 'Berat anak';

  const { rows, childPoints, maxAge } = useMemo(() => {
    const points = measurements
      .map((m) => {
        const age = m.ageInMonths;
        if (isHeight) {
          if (m.height == null || !Number.isFinite(Number(m.height))) return null;
          const pos =
            m.position === 'TELENTANG' || m.position === 'BERDIRI'
              ? m.position
              : defaultPosition(age);
          return { age, value: correctedLengthHeight(age, pos, Number(m.height)) };
        }
        if (m.weight == null || !Number.isFinite(Number(m.weight))) return null;
        return { age, value: Number(m.weight) };
      })
      .filter((p): p is { age: number; value: number } => p != null)
      .sort((a, b) => a.age - b.age);

    const valueByAge = new Map<number, number>();
    for (const p of points) valueByAge.set(p.age, p.value);

    const topAge = Math.min(60, Math.max(...points.map((p) => p.age), 1));
    const out: Array<{ age: number; median: number; m2: number; m3: number; p2: number; value: number | null }> = [];
    for (let age = 0; age <= topAge; age++) {
      const { table } = tableFor(index, sex, age);
      const ref = referenceAt(table, sex, age);
      out.push({
        age,
        m3: round2(ref[0]),
        m2: round2(ref[1]),
        median: round2(ref[3]),
        p2: round2(ref[5]),
        value: valueByAge.get(age) ?? null,
      });
    }
    return { rows: out, childPoints: points, maxAge: topAge };
  }, [measurements, sex, index, isHeight]);

  if (childPoints.length === 0) {
    return (
      <div className="p-6 text-center bg-white rounded-2xl border border-[#e9edef] text-[#54656f] text-xs font-medium">
        Belum ada data {isHeight ? 'tinggi badan' : 'berat badan'} untuk menggambar kurva KMS.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#e9edef] shadow-xs">
      <div className="mb-2">
        <h4 className="text-sm font-extrabold text-[#111b21]">
          Kurva KMS — {isHeight ? 'Tinggi Badan / Umur' : 'Berat Badan / Umur'}
        </h4>
        <p className="text-[10px] text-[#8696a0] font-medium">
          Standar Permenkes 2/2020. Garis tebal = {isHeight ? 'tinggi' : 'berat'} anak; pita
          abu/kuning/merah = batas normal.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={rows} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9edef" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 10 }}
            stroke="#8696a0"
            unit="bln"
            tickMargin={4}
          />
          <YAxis tick={{ fontSize: 10 }} stroke="#8696a0" unit={unit} width={42} />
          <Tooltip
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                value: valueLabel,
                median: 'Median',
                m2: '−2 SD',
                m3: '−3 SD',
                p2: '+2 SD',
              };
              const key = String(name);
              return [`${value} ${unit}`, labels[key] ?? key];
            }}
            labelFormatter={(age) => `${age} bulan`}
          />
          <Line type="monotone" dataKey="p2" stroke="#bbf7d0" strokeWidth={1} dot={false} connectNulls />
          <Line type="monotone" dataKey="median" stroke="#22c55e" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="m2" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="m3" stroke="#ef4444" strokeWidth={1.5} dot={false} connectNulls />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#075e54"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#075e54' }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[10px] text-[#8696a0] font-medium">
        Rentang grafik 0–{maxAge} bulan. Kurva di bawah garis merah (−3 SD) menandakan{' '}
        {isHeight ? 'sangat pendek (stunting berat)' : 'berat sangat kurang'} — rujuk ke tenaga
        kesehatan.
      </p>
    </div>
  );
}
