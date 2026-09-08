import { prisma } from './prisma';
import { puskesmasUsernameBase } from './names';

/** Password default seragam utk akun baru POSYANDU. */
export function getPosyanduDefaultPassword(): string {
  return process.env.POSYANDU_DEFAULT_PASSWORD || 'posyandu2026';
}

/** Password default khusus akun staf PUSKESMAS (beda dari posyandu). */
export function getPuskesmasDefaultPassword(): string {
  return process.env.PUSKESMAS_DEFAULT_PASSWORD || 'puskesmas2026';
}

/** Password default sesuai role akun. */
export function getDefaultPasswordForRole(role: string): string {
  return role === 'PUSKESMAS' ? getPuskesmasDefaultPassword() : getPosyanduDefaultPassword();
}

/** Kode internal username utk akun posyandu — tidak pernah dipakai kader utk login. */
export function buildPosyanduUsername(posyanduCode: string): string {
  return `posyandu-${posyanduCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/**
 * Username staf puskesmas, diturunkan otomatis dari nama puskesmas — mudah diingat.
 * 'Puskesmas Wonosari I' -> 'pkm_wonosari1' ; 'Puskesmas Semanu II' -> 'pkm_semanu2'
 */
export function buildPuskesmasUsername(healthCenterName: string): string {
  return `pkm_${puskesmasUsernameBase(healthCenterName)}`;
}

/** Username puskesmas unik di DB (fallback suffix _2, _3, ... bila bentrok). */
export async function generateUniquePuskesmasUsername(healthCenterName: string): Promise<string> {
  const base = buildPuskesmasUsername(healthCenterName);
  let candidate = base;
  let n = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${base}_${n}`;
  }
  return candidate;
}

async function uniqueCode(base: string, exists: (code: string) => Promise<boolean>): Promise<string> {
  let code = base;
  let n = 1;
  while (true) {
    if (!(await exists(code))) return code;
    code = `${base}-${String(++n).padStart(2, '0')}`;
  }
}

/** e.g. PKM-WNS-01 ; unik per kapanewon, counter didasarkan data saat ini. */
export async function generateHealthCenterCode(kapanewonCode: string): Promise<string> {
  const prefix = `PKM-${kapanewonCode.toUpperCase()}`;
  const count = await prisma.healthCenter.count({ where: { code: { startsWith: prefix + '-' } } });
  return uniqueCode(`${prefix}-${String(count + 1).padStart(2, '0')}`, async (code) => {
    const found = await prisma.healthCenter.findUnique({ where: { code } });
    return !!found;
  });
}

/** e.g. POS-WNS-01-001 ; unik dalam satu puskesmas. */
export async function generatePosyanduCode(healthCenterCode: string): Promise<string> {
  const hcPart = healthCenterCode.replace(/^PKM-/i, ''); // WNS-01
  const prefix = `POS-${hcPart.toUpperCase()}`;
  const count = await prisma.posyandu.count({ where: { code: { startsWith: prefix + '-' } } });
  return uniqueCode(`${prefix}-${String(count + 1).padStart(3, '0')}`, async (code) => {
    const found = await prisma.posyandu.findUnique({ where: { code } });
    return !!found;
  });
}
