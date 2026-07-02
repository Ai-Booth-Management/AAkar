import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const booth = await prisma.booth.findUnique({
    where: { partNumber: 'AC38-019' }
  });
  console.log(booth);
}

main().finally(() => prisma.$disconnect());
