import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const volunteers = JSON.parse(fs.readFileSync(path.join(__dirname, 'volunteers.json'), 'utf-8'));
  
  console.log(`Updating ${volunteers.length} volunteer locations in DB...`);
  
  let updated = 0;
  for (const vol of volunteers) {
    if (!vol.id || vol.lat == null || vol.lng == null) continue;
    
    await prisma.volunteer.update({
      where: { id: vol.id },
      data: { lat: vol.lat, lng: vol.lng },
    });
    updated++;
    
    if (updated % 50 === 0) console.log(`  Updated ${updated}/${volunteers.length}...`);
  }
  
  console.log(`Done! Updated ${updated} volunteers with real building coordinates.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
