const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dinkesUsername = process.env.DINKES_ADMIN_USERNAME || 'dinkes_gk';
  const dinkesPassword = process.env.DINKES_ADMIN_PASSWORD || 'adminposyandu123';

  console.log(`Seeding initial Dinkes Super Admin account (${dinkesUsername})...`);

  await prisma.user.upsert({
    where: { username: dinkesUsername.toLowerCase().trim() },
    update: {
      password: dinkesPassword,
    },
    create: {
      username: dinkesUsername.toLowerCase().trim(),
      password: dinkesPassword,
      name: 'Dinas Kesehatan Kabupaten Gunungkidul',
      role: 'DINKES',
    },
  });

  console.log('Seeding initial Dinkes Super Admin completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
