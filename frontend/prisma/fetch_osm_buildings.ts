// Fetch real buildings from OpenStreetMap Overpass API for each section center,
// then assign voter households to those real building coordinates.

const fs = require('fs');
const path = require('path');

const HOUSES_FILE = path.join(__dirname, 'houses.json');
const OUT_FILE = path.join(__dirname, 'houses.json');

// Section centers from geocoding
const SECTION_CENTERS = [
  { section: '4-ARMYPUBLICSCHOOLDELHICANTT', lat: 28.6009482, lng: 77.1254453, radius: 800 },
  { section: '2-KENDRIYAVIDYALAYANARAINA',   lat: 28.6160253, lng: 77.1371917, radius: 800 },
  { section: '1-CB NARAINA DELHI CANTT',     lat: 28.6730426, lng: 77.1294782, radius: 800 },
  { section: '3-SADARBAZARDELHICANTT',       lat: 28.5936557, lng: 77.1179459, radius: 700 },
  { section: '1-V-BLOCKOLDNANGALDELHICANTT', lat: 28.6091182, lng: 77.1160266, radius: 700 },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchBuildings(lat: number, lng: number, radius: number): Promise<{lat: number, lng: number}[]> {
  // Overpass query: get all buildings (nodes, ways, relations) in radius
  const query = `
[out:json][timeout:25];
(
  node["building"](around:${radius},${lat},${lng});
  node["amenity"="house"](around:${radius},${lat},${lng});
  way["building"~"residential|house|apartments|yes"](around:${radius},${lat},${lng});
  way["landuse"="residential"](around:${radius},${lat},${lng});
);
out center;
  `.trim();

  const url = `https://overpass-api.de/api/interpreter`;
  const body = new URLSearchParams();
  body.append('data', query);
  
  const response = await fetch(url, {
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

  return points;
}

async function run() {
  const houses = JSON.parse(fs.readFileSync(HOUSES_FILE, 'utf8'));

  // Group houses by section
  const sectionMap = new Map<string, any[]>();
  houses.forEach((h: any) => {
    if (!sectionMap.has(h.section)) sectionMap.set(h.section, []);
    sectionMap.get(h.section)!.push(h);
  });

  for (const sec of SECTION_CENTERS) {
    const group = sectionMap.get(sec.section) || [];
    if (group.length === 0) continue;

    console.log(`Fetching buildings for ${sec.section} (need ${group.length} coords, radius ${sec.radius}m)...`);

    let buildings: {lat: number, lng: number}[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        buildings = await fetchBuildings(sec.lat, sec.lng, sec.radius);
        console.log(`  Got ${buildings.length} buildings from OSM`);
        break;
      } catch (e: any) {
        console.error(`  Attempt ${attempt} failed: ${e.message}`);
        if (attempt < 3) {
          console.log(`  Retrying in 5s...`);
          await sleep(5000);
        }
      }
    }

    // Deduplicate buildings (round to 4 decimal places)
    const seen = new Set<string>();
    buildings = buildings.filter(b => {
      const key = `${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`  ${buildings.length} unique building coords`);

    if (buildings.length === 0) {
      console.log(`  No buildings found, keeping grid layout for this section.`);
      continue;
    }

    // Assign real building coords to households.
    // If we have more houses than buildings, cycle through buildings.
    group.forEach((house, idx) => {
      const building = buildings[idx % buildings.length];
      // Add a tiny jitter (< 5m) to avoid exact stacking when cycling
      const cycle = Math.floor(idx / buildings.length);
      house.lat = building.lat + (cycle * 0.00003 * Math.cos(idx * 2.4));
      house.lng = building.lng + (cycle * 0.00003 * Math.sin(idx * 2.4));
    });
    
    // Cooldown between sections to avoid rate limiting
    await sleep(3000);
  }

  // Write updated file
  fs.writeFileSync(OUT_FILE, JSON.stringify(houses, null, 2));
  console.log('\nDone! houses.json updated with real building coordinates.');
}

run().catch(console.error);

export {};
