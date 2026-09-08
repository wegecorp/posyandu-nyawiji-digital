import { prisma } from './prisma';
import type { UserSession } from './types';

const POSYANDU_INCLUDE = {
  posyandu: {
    include: {
      kalurahan: { include: { kapanewon: true } },
      healthCenter: { include: { kapanewon: true } },
    },
  },
  healthCenter: { include: { kapanewon: true } },
} as const;

/** Ambil user lengkap dari DB berdasarkan cookie session. */
export async function getUserBySession(sessionUserId: string) {
  return prisma.user.findUnique({
    where: { id: sessionUserId },
    include: POSYANDU_INCLUDE,
  });
}

/** Ubah row User (sudah include relasi lokasi) ke bentuk aman utk dikirim ke client. */
export function serializeUser(user: NonNullable<Awaited<ReturnType<typeof getUserBySession>>>): UserSession {
  const base: UserSession = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as UserSession['role'],
  };

  if (user.role === 'POSYANDU' && user.posyandu) {
    const pos = user.posyandu;
    base.posyanduId = pos.id;
    base.posyanduName = pos.name;
    base.posyanduCode = pos.code;
    base.kalurahan = pos.kalurahan.name;
    base.padukuhan = pos.padukuhan || null;
    base.healthCenterId = pos.healthCenterId;
    base.healthCenterName = pos.healthCenter.name;
    base.kapanewon = pos.healthCenter.kapanewon.name;
  } else if (user.healthCenter) {
    base.healthCenterId = user.healthCenter.id;
    base.healthCenterName = user.healthCenter.name;
    base.kapanewon = user.healthCenter.kapanewon.name;
  }

  return base;
}
