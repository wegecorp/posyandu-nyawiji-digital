/**
 * Aturan akses data tingkat-pasien.
 *
 * Keputusan privasi: identitas pasien (nama/no. registrasi) hanya untuk
 * POSYANDU (wilayahnya) dan PUSKESMAS (wilayahnya). DINKES hanya menerima
 * agregat per unit. Ditegakkan di API — bukan hanya menyembunyikan tombol di UI.
 */
export type Role = 'DINKES' | 'PUSKESMAS' | 'POSYANDU';

export function canViewPatientDetail(role: string | null | undefined): boolean {
  return role === 'PUSKESMAS' || role === 'POSYANDU';
}
