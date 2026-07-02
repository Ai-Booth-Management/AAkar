// Snap volunteer locations to the nearest real OSM building in Delhi Cantt.
// Updates prisma/volunteers.json then re-seeds the database.

const fs = require('fs');
const path = require('path');

const VOLUNTEERS_FILE = path.join(__dirname, 'volunteers.json');

// Bounding box covering all of Delhi Cantt (from our section centers)
// lat: 28.58 - 28.68, lng: 77.10 - 77.15
const BBOX = { south: 28.58, north: 28.68, west: 77.10, east: 77.15 };

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchAllBuildings(): Promise<{lat: number, lng: number}[]> {
  const query = `
[out:json][timeout:60];
(
  way["building"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  node["building"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out center;
  `.trim();

  const body = new URLSearchParams();
  body.append('data', query);

  console.log('Fetching all buildings in Delhi Cantt from OSM...');
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'boothman-research/1.0 (educational project)',
    },
    body: body.toString(),
  });

  if (!response.ok) throw new Error(`Overpass error: ${response.status}`);

  const data = await response.json() as any;
  const points: {lat: number, lng: number}[] = [];

  for (const el of data.elements) {
    if (el.type === 'node' && el.lat) {
      points.push({ lat: el.lat, lng: el.lon });
    } else if (el.type === 'way' && el.center) {
      points.push({ lat: el.center.lat, lng: el.center.lon });
    }
  }

  // Deduplicate at 4 decimal places (~11m)
  const seen = new Set<string>();
  return points.filter(p => {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function distanceSq(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = lat1 - lat2;
  const dlng = lng1 - lng2;
  return dlat * dlat + dlng * dlng;
}

function findNearest(lat: number, lng: number, buildings: {lat: number, lng: number}[]): {lat: number, lng: number} {
  let best = buildings[0];
  let bestDist = distanceSq(lat, lng, best.lat, best.lng);
  for (const b of buildings) {
    const d = distanceSq(lat, lng, b.lat, b.lng);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

async function run() {
  let buildings: {lat: number, lng: number}[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      buildings = await fetchAllBuildings();
      console.log(`Fetched ${buildings.length} unique building locations from OSM.`);
      break;
    } catch (e: any) {
      console.error(`Attempt ${attempt} failed: ${e.message}`);
      if (attempt < 3) { await sleep(5000); }
      else { process.exit(1); }
    }
  }

  const volunteers = JSON.parse(fs.readFileSync(VOLUNTEERS_FILE, 'utf8'));
  console.log(`Snapping ${volunteers.length} volunteers to nearest buildings...`);

  // Track used buildings to avoid putting too many volunteers at exact same spot
  const usageCount = new Map<string, number>();

  volunteers.forEach((vol: any) => {
    if (!vol.lat || !vol.lng) return;
    
    const nearest = findNearest(vol.lat, vol.lng, buildings);
    const key = `${nearest.lat.toFixed(4)},${nearest.lng.toFixed(4)}`;
    const count = usageCount.get(key) || 0;
    usageCount.set(key, count + 1);

    // Add tiny jitter if multiple volunteers share the same building
    vol.lat = nearest.lat + count * 0.00004 * Math.cos(count * 2.1);
    vol.lng = nearest.lng + count * 0.00004 * Math.sin(count * 2.1);
  });

  fs.writeFileSync(VOLUNTEERS_FILE, JSON.stringify(volunteers, null, 2));
  console.log('volunteers.json updated with real building coordinates.');
  console.log('Run `npx tsx prisma/seed.ts` to re-seed the database.');
}

run().catch(console.error);
