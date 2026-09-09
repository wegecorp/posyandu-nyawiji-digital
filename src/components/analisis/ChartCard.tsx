'use client';

import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border border-[#e9edef] shadow-xs ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-extrabold text-[#111b21]">{title}</h3>
        {subtitle && <p className="text-[11px] text-[#54656f] mt-0.5 font-medium">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
