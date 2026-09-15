/**
 * Batas ukuran export data — mencegah server ngelag / memori jebol saat kader
 * mengunduh banyak unit sekaligus. Agregat (Ringkasan) tidak dibatasi; batas
 * hanya berlaku bila menyertakan data per pasien (Anggota/Detail/Berisiko).
 */
export const MAX_EXPORT_UNITS = 30;

/** Batas total baris data per pasien (anggota + detail + berisiko). */
export const MAX_EXPORT_ROWS = 20_000;
