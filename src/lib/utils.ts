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

  // Kategori siklus hidup Posyandu, batas BULAN PENUH.
  const { totalMonths } = calculateAge(birthDateString, targetDate);

  if (totalMonths < 6) return 'BAYI'; // 0-5 bln (6 bln 1 hari sudah bukan bayi)
  if (totalMonths < 84) return 'BALITA_APRAS'; // 6 bln - 6 th 11 bln
  if (totalMonths < 216) return 'REMAJA'; // 7 - 17 th
  if (totalMonths < 720) return 'DEWASA'; // 18 - 59 th
  return 'LANSIA'; // 60 th ke atas
}


export function getCategoryBadge(category: PatientCategory) {
  switch (category) {
    case 'BAYI':
      return { label: 'Bayi (0-5 bln)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'BALITA_APRAS':
      return { label: 'Balita & Apras (6 bln-6 th)', color: 'bg-teal-100 text-teal-800 border-teal-300' };
    case 'REMAJA':
      return { label: 'Remaja (7-17 th)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'BUMIL':
      return { label: 'Ibu Hamil', color: 'bg-pink-100 text-pink-800 border-pink-300' };
    case 'DEWASA':
      return { label: 'Dewasa (18-59 th)', color: 'bg-purple-100 text-purple-800 border-purple-300' };
    case 'LANSIA':
      return { label: 'Lansia (60+ th)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
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
