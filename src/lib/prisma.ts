import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const globalForSqlite = globalThis as unknown as {
  sqlitePragmas?: Promise<void>;
};

if (!globalForSqlite.sqlitePragmas) {
  globalForSqlite.sqlitePragmas = (async () => {
    try {
      await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
      await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
    } catch (error) {
      console.error('Gagal menerapkan PRAGMA SQLite:', error);
    }
  })();
}
