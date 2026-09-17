import React from 'react';

export const PatientCardSkeleton: React.FC = () => (
  <div className="p-2.5 sm:p-3 rounded-xl border border-[#e9edef] bg-white flex items-center justify-between gap-2.5 shadow-xs animate-pulse">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {/* Avatar Circle */}
      <div className="w-10 h-10 rounded-full bg-[#f0f2f5] shrink-0" />
      {/* Text Lines */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 bg-[#e9edef] rounded-md" />
          <div className="h-3.5 w-16 bg-[#f0f2f5] rounded-full" />
        </div>
        <div className="h-3 w-20 bg-[#f0f2f5] rounded-md" />
        <div className="h-4 w-40 bg-[#f0f2f5] rounded-full" />
      </div>
    </div>
    {/* Right Chevron placeholder */}
    <div className="w-8 h-8 rounded-full bg-[#f0f2f5] shrink-0" />
  </div>
);

export const PatientListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-2.5" aria-busy="true" aria-label="Memuat daftar pasien">
    {Array.from({ length: count }).map((_, i) => (
      <PatientCardSkeleton key={i} />
    ))}
  </div>
);

export const FormLoadingSkeleton: React.FC = () => (
  <div className="p-4 sm:p-6 bg-white rounded-2xl border border-[#e9edef] space-y-4 animate-pulse shadow-xs" aria-busy="true">
    <div className="flex items-center justify-between">
      <div className="h-5 w-40 bg-[#e9edef] rounded-md" />
      <div className="h-4 w-20 bg-[#f0f2f5] rounded-full" />
    </div>
    <div className="space-y-3 pt-2">
      <div className="h-12 w-full bg-[#f0f2f5] rounded-xl" />
      <div className="h-12 w-full bg-[#f0f2f5] rounded-xl" />
      <div className="h-12 w-full bg-[#f0f2f5] rounded-xl" />
    </div>
    <div className="h-11 w-full bg-[#e9edef] rounded-full mt-4" />
  </div>
);

export const DashboardListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-3" aria-busy="true" aria-label="Memuat data dashboard">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-[20px] border border-[#e9edef] p-4 shadow-xs animate-pulse flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-[#f0f2f5] shrink-0" />
          <div className="space-y-2 min-w-0 flex-1">
            <div className="h-4 w-40 sm:w-56 bg-[#e9edef] rounded-md" />
            <div className="h-3 w-28 bg-[#f0f2f5] rounded-md" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#f0f2f5] shrink-0" />
      </div>
    ))}
  </div>
);

export const ChartCardSkeleton: React.FC<{ height?: string }> = ({ height = 'h-48' }) => (
  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e9edef] shadow-xs animate-pulse space-y-3" aria-busy="true">
    <div className="space-y-1.5">
      <div className="h-4 w-36 bg-[#e9edef] rounded-md" />
      <div className="h-3 w-48 bg-[#f0f2f5] rounded-md" />
    </div>
    <div className={`w-full ${height} bg-[#f0f2f5] rounded-xl flex items-center justify-center`} />
  </div>
);

export const AnalisisPageSkeleton: React.FC = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Memuat analisis statistik">
    {/* Header bar placeholder */}
    <div className="flex items-center justify-between animate-pulse">
      <div className="h-5 w-44 bg-[#e9edef] rounded-md" />
      <div className="h-8 w-32 bg-[#f0f2f5] rounded-full" />
    </div>
    {/* Main large chart card */}
    <ChartCardSkeleton height="h-56" />
    {/* 2-column smaller cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ChartCardSkeleton height="h-40" />
      <ChartCardSkeleton height="h-40" />
    </div>
  </div>
);
