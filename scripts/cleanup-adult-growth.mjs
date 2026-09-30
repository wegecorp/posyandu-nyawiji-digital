import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "Measurement"
    SET "underweightStatus" = NULL,
        "stuntingStatus" = NULL,
        "wastingStatus" = NULL,
        "zWeightAge" = NULL,
        "zHeightAge" = NULL,
        "zWeightHeight" = NULL,
        "zBmiAge" = NULL,
        "growthRefVersion" = NULL
    WHERE "patientId" IN (
      SELECT id FROM "Patient"
      WHERE "birthDate" <= NOW() - INTERVAL '5 years'
    )
    AND (
      "underweightStatus" IS NOT NULL
      OR "stuntingStatus" IS NOT NULL
      OR "wastingStatus" IS NOT NULL
      OR "zWeightAge" IS NOT NULL
    );
  `);
  console.log(`Berhasil membersihkan ${result} baris pengukuran anomali.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
