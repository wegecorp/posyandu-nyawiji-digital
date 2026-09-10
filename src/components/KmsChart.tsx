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
import { TABLES, referenceAt, type Sex } from '@/lib/growth';
import type { MeasurementData } from '@/lib/types';

interface KmsChartProps {
  measurements: MeasurementData[];
  gender?: string | null;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Kurva KMS BB/U (Permenkes 2/2020): berat anak vs umur dengan 7 garis SD.
 * Garis referensi = pita baku; garis tebal = pertumbuhan anak.
 */
export function KmsChart({ measurements, gender }: KmsChartProps) {
  const sex: Sex = gender === 'P' ? 'P' : 'L';

  const { rows, childPoints, maxAge } = useMemo(() => {
    const points = measurements
      .filter((m) => m.weight != null && Number.isFinite(Number(m.weight)))
      .map((m) => ({ age: m.ageInMonths, weight: Number(m.weight) }))
      .sort((a, b) => a.age - b.age);

    const weightByAge = new Map<number, number>();
    for (const p of points) weightByAge.set(p.age, p.weight);

    const topAge = Math.min(60, Math.max(...points.map((p) => p.age), 1));
    const out: Array<{ age: number; median: number; m2: number; m3: number; p2: number; weight: number | null }> = [];
    for (let age = 0; age <= topAge; age++) {
      const ref = referenceAt(TABLES['bb-u'], sex, age);
      out.push({
        age,
        m3: round2(ref[0]),
        m2: round2(ref[1]),
        median: round2(ref[3]),
        p2: round2(ref[5]),
        weight: weightByAge.get(age) ?? null,
      });
    }
    return { rows: out, childPoints: points, maxAge: topAge };
  }, [measurements, sex]);

  if (childPoints.length === 0) {
    return (
      <div className="p-6 text-center bg-white rounded-2xl border border-[#e9edef] text-[#54656f] text-xs font-medium">
        Belum ada data berat badan untuk menggambar kurva KMS.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#e9edef] shadow-xs">
      <div className="mb-2">
        <h4 className="text-sm font-extrabold text-[#111b21]">Kurva KMS — Berat Badan / Umur</h4>
        <p className="text-[10px] text-[#8696a0] font-medium">
          Standar Permenkes 2/2020. Garis tebal = berat anak; pita abu/kuning = batas normal.
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
          <YAxis tick={{ fontSize: 10 }} stroke="#8696a0" unit="kg" width={42} />
          <Tooltip
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                weight: 'Berat anak',
                median: 'Median',
                m2: '−2 SD',
                m3: '−3 SD',
                p2: '+2 SD',
              };
              const key = String(name);
              return [`${value} kg`, labels[key] ?? key];
            }}
            labelFormatter={(age) => `${age} bulan`}
          />
          <Line type="monotone" dataKey="p2" stroke="#bbf7d0" strokeWidth={1} dot={false} connectNulls />
          <Line type="monotone" dataKey="median" stroke="#22c55e" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="m2" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="m3" stroke="#ef4444" strokeWidth={1.5} dot={false} connectNulls />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#075e54"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#075e54' }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[10px] text-[#8696a0] font-medium">
        Rentang grafik 0–{maxAge} bulan. Panah/kurva di bawah garis merah (−3 SD) menandakan berat
        sangat kurang — rujuk ke tenaga kesehatan.
      </p>
    </div>
  );
}
