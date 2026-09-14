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
