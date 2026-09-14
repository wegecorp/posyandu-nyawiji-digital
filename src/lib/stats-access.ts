/**
 * Aturan akses data tingkat-pasien.
 *
 * Keputusan privasi: identitas pasien (nama/no. registrasi) boleh dilihat semua
 * peran berwenang — POSYANDU (wilayahnya), PUSKESMAS (wilayahnya), dan DINKES
 * (seluruh wilayah, sebagai pemilik data). Ditegakkan di API — bukan hanya
 * menyembunyikan tombol di UI.
 */
export type Role = 'DINKES' | 'PUSKESMAS' | 'POSYANDU';

export function canViewPatientDetail(role: string | null | undefined): boolean {
  return role === 'DINKES' || role === 'PUSKESMAS' || role === 'POSYANDU';
}
