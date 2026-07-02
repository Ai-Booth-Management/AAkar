// Geocode all unique booth locations and update the database.

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBezo3YLXmZ0b2EX5MCGribAtI3IOfNV1s';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function geocode(address: string): Promise<{lat: number, lng: number} | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Delhi Cantt, New Delhi')}&key=${API_KEY}`;
  const r = await fetch(url);
  const d = await r.json() as any;
  if (d.status === 'OK' && d.results[0]) {
    return d.results[0].geometry.location;
  }
  return null;
}

async function main() {
  // Get distinct booth names from DB
  const booths = await prisma.booth.findMany({ select: { id: true, name: true, lat: true, lng: true } });

  // Group by name to geocode once per unique station
  const nameMap = new Map<string, {lat: number, lng: number}>();
  const uniqueNames = [...new Set(booths.map(b => b.name))];

  console.log(`Geocoding ${uniqueNames.length} unique polling stations...`);
  for (const name of uniqueNames) {
    const loc = await geocode(name);
    if (loc) {
      nameMap.set(name, loc);
      console.log(`  ✓ ${name} -> ${loc.lat}, ${loc.lng}`);
    } else {
      console.log(`  ✗ FAILED: ${name}`);
    }
    await sleep(200);
  }

  // Update all booths
  let updated = 0;
  for (const booth of booths) {
    const loc = nameMap.get(booth.name);
    if (!loc) continue;
    await prisma.booth.update({
      where: { id: booth.id },
      data: { lat: loc.lat, lng: loc.lng }
    });
    updated++;
  }

  console.log(`\nDone! Updated ${updated} booth records with correct coordinates.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
