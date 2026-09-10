import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PatientCategory } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAge(birthDateString: string | Date, targetDate: Date = new Date()) {
  const birth = new Date(birthDateString);
  let months = (targetDate.getFullYear() - birth.getFullYear()) * 12 + (targetDate.getMonth() - birth.getMonth());
  if (targetDate.getDate() < birth.getDate()) {
    months--;
  }
  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  let display = '';
  if (years === 0) {
    display = `${months} Bulan`;
  } else if (remainingMonths === 0) {
    display = `${years} Tahun`;
  } else {
    display = `${years} Th ${remainingMonths} Bln`;
  }

  return {
    totalMonths: months,
    years,
    remainingMonths,
    display,
  };
}

export function getPatientCategory(
  birthDateString: string | Date,
  isPregnant: boolean = false,
  gender?: string | null,
  targetDate: Date = new Date()
): PatientCategory {
  if (isPregnant && gender !== 'L') return 'BUMIL';

  const { years } = calculateAge(birthDateString, targetDate);

  if (years < 5) return 'BALITA';
  if (years >= 5 && years < 10) return 'ANAK';
  if (years >= 10 && years < 18) return 'REMAJA';
  return 'DEWASA_LANSIA';
}


export function getCategoryBadge(category: PatientCategory) {
  switch (category) {
    case 'BALITA':
      return { label: 'Balita (<5 th)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'ANAK':
      return { label: 'Anak (5-9 th)', color: 'bg-teal-100 text-teal-800 border-teal-300' };
    case 'REMAJA':
      return { label: 'Remaja (10-17 th)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'BUMIL':
      return { label: 'Ibu Hamil', color: 'bg-pink-100 text-pink-800 border-pink-300' };
    case 'DEWASA_LANSIA':
      return { label: 'Dewasa / Lansia', color: 'bg-purple-100 text-purple-800 border-purple-300' };
    default:
      return { label: 'Umum', color: 'bg-slate-100 text-slate-800 border-slate-300' };
  }
}

/**
 * Tanggal hari ini dalam format 'YYYY-MM-DD' menurut waktu LOKAL perangkat.
 * Jangan pakai `new Date().toISOString()` — itu UTC, sehingga di WIB (+7)
 * setelah pukul 17:00 menghasilkan tanggal "besok".
 */
export function todayLocalISODate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatIndoDate(dateString: string | Date) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
