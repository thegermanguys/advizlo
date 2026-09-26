import { PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORY_NAMES } from '../src/categories/default-categories';

const prisma = new PrismaClient();

async function main() {
  for (const name of DEFAULT_CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${DEFAULT_CATEGORY_NAMES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
