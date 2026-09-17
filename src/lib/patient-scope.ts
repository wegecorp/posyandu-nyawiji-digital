/**
 * Keputusan cakupan query pasien per peran — FAIL-CLOSED.
 *
 * Sengaja murni (tanpa DB) agar bisa diuji: sesi tanpa cakupan lokasi yang
 * seharusnya ada HARUS ditolak, bukan dikembalikan tanpa filter (yang akan
 * membocorkan seluruh pasien).
 */
export interface ScopeSession {
  role: string;
  posyanduId?: string | null;
  healthCenterId?: string | null;
}

export type ScopePlan =
  | { kind: 'posyandu'; posyanduId: string }
  | { kind: 'healthCenter'; healthCenterId: string }
  | { kind: 'all' }
  | { kind: 'deny' };

export type ReportScope = { ok: true; ids: string[] } | { ok: false };

/**
 * Cakupan unit (posyandu ids) untuk export/rekap multi-unit — FAIL-CLOSED.
 * `ownedIds` = unit yang boleh dilihat peran (PUSKESMAS: binaan; DINKES: semua).
 * `requestedIds` = pilihan user (hanya mengecilkan utk PUSKESMAS).
 * Sesi tanpa cakupan lokasi yang seharusnya ada → { ok:false }, bukan semua unit.
 */
export function resolveReportPosyanduIds(
  session: ScopeSession,
  ownedIds: string[],
  requestedIds: string[] = [],
): ReportScope {
  if (session.role === 'POSYANDU') {
    return session.posyanduId ? { ok: true, ids: [session.posyanduId] } : { ok: false };
  }

  if (session.role === 'PUSKESMAS') {
    if (!session.healthCenterId) return { ok: false };
    if (requestedIds.length === 0) return { ok: true, ids: [...ownedIds] };
    const own = new Set(ownedIds);
    return { ok: true, ids: requestedIds.filter((id) => own.has(id)) };
  }

  if (session.role === 'DINKES') {
    return { ok: true, ids: [...ownedIds] };
  }

  return { ok: false };
}

export function resolvePatientScope(
  session: ScopeSession,
  requestedPosyanduId?: string | null,
): ScopePlan {
  if (session.role === 'POSYANDU') {
    return session.posyanduId ? { kind: 'posyandu', posyanduId: session.posyanduId } : { kind: 'deny' };
  }

  if (session.role === 'PUSKESMAS') {
    if (!session.healthCenterId) return { kind: 'deny' };
    return requestedPosyanduId
      ? { kind: 'posyandu', posyanduId: requestedPosyanduId }
      : { kind: 'healthCenter', healthCenterId: session.healthCenterId };
  }

  if (session.role === 'DINKES') {
    return requestedPosyanduId ? { kind: 'posyandu', posyanduId: requestedPosyanduId } : { kind: 'all' };
  }

  return { kind: 'deny' };
}
