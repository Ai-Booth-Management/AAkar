// Snap volunteer locations to a house that belongs to the booth they are ASSIGNED to.
// This ensures volunteers appear inside their booth's boundary on the map.

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const HOUSES_FILE = path.join(__dirname, 'houses.json');

function distSq(lat1: number, lng1: number, lat2: number, lng2: number) {
  return (lat1 - lat2) ** 2 + (lng1 - lng2) ** 2;
}

async function main() {
  const allHouses: any[] = JSON.parse(fs.readFileSync(HOUSES_FILE, 'utf8'))
    .filter((h: any) => h.lat && h.lng);

  // Group houses by partNumber
  const housesByPart = new Map<string, any[]>();
  for (const h of allHouses) {
    if (!housesByPart.has(h.partNumber)) housesByPart.set(h.partNumber, []);
    housesByPart.get(h.partNumber)!.push(h);
  }

  // Get all booths (id → partNumber)
  const booths = await prisma.booth.findMany({ select: { id: true, partNumber: true, lat: true, lng: true } });
  const boothMap = new Map(booths.map(b => [b.id, b]));

  // Get all volunteers with their assigned booth
  const volunteers = await prisma.volunteer.findMany({
    select: { id: true, lat: true, lng: true, assignedBoothId: true }
  });

  console.log(`Snapping ${volunteers.length} volunteers to their assigned booth's houses...`);

  const houseUsage = new Map<string, number>();
  const partIndex = new Map<string, number>();

  let updated = 0;
  for (const vol of volunteers) {
    if (!vol.assignedBoothId) continue;

    const booth = boothMap.get(vol.assignedBoothId);
    if (!booth) continue;

    const houses = housesByPart.get(booth.partNumber) || [];
    if (houses.length === 0) continue;

    // Round-robin assignment within this booth's houses
    const idx = partIndex.get(booth.partNumber) || 0;
    const house = houses[idx % houses.length];
    partIndex.set(booth.partNumber, idx + 1);

    const key = `${house.lat.toFixed(5)},${house.lng.toFixed(5)}`;
    const usage = houseUsage.get(key) || 0;
    houseUsage.set(key, usage + 1);

    // Tiny jitter only when multiple volunteers share the exact same house
    const newLat = house.lat + usage * 0.000018 * Math.cos(usage * 2.4);
    const newLng = house.lng + usage * 0.000018 * Math.sin(usage * 2.4);

    await prisma.volunteer.update({
      where: { id: vol.id },
      data: { lat: newLat, lng: newLng }
    });
    updated++;
    if (updated % 50 === 0) console.log(`  Updated ${updated}/${volunteers.length}...`);
  }

  console.log(`\nDone! ${updated} volunteers are now inside their assigned booth's boundary.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
