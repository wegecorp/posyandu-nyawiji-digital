import { prisma } from './prisma';

/**
 * Password default seragam untuk akun baru (posyandu & puskesmas).
 * Akun wajib mengganti password saat aktivasi pertama (mustChangePassword).
 */
export function getDefaultPassword(): string {
  return process.env.POSYANDU_DEFAULT_PASSWORD || 'posyandu2026';
}

/** Kode internal username utk akun posyandu — tidak pernah dipakai kader utk login. */
export function buildPosyanduUsername(posyanduCode: string): string {
  return `posyandu-${posyanduCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/** Kode internal username utk akun puskesmas staf — dipakai login staf. */
export function buildPuskesmasUsername(healthCenterCode: string): string {
  return `puskesmas-${healthCenterCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

async function uniqueCode(base: string, exists: (code: string) => Promise<boolean>): Promise<string> {
  let code = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
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
