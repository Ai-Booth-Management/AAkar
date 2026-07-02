// Assign each volunteer to an actual house in their part number.
// Volunteers live in the area their booth covers, so pick houses from their partNumber.

const fs = require('fs');
const path = require('path');

const VOLUNTEERS_FILE = path.join(__dirname, 'volunteers.json');
const HOUSES_FILE = path.join(__dirname, 'houses.json');

async function run() {
  const volunteers = JSON.parse(fs.readFileSync(VOLUNTEERS_FILE, 'utf8'));
  const allHouses = JSON.parse(fs.readFileSync(HOUSES_FILE, 'utf8'))
    .filter((h: any) => h.lat && h.lng);

  // Group houses by partNumber
  const housesByPart = new Map<string, any[]>();
  for (const h of allHouses) {
    if (!housesByPart.has(h.partNumber)) housesByPart.set(h.partNumber, []);
    housesByPart.get(h.partNumber)!.push(h);
  }

  console.log(`Assigning ${volunteers.length} volunteers to actual houses...`);

  // Track how many vols are at each house to apply jitter
  const houseUsage = new Map<string, number>();
  // Track index per partNumber for round-robin assignment
  const partIndex = new Map<string, number>();

  for (const vol of volunteers) {
    const partNum = vol.partNumber;
    const houses = housesByPart.get(partNum) || [];

    if (houses.length === 0) continue;

    // Round-robin: each volunteer gets the next house in the list
    const idx = partIndex.get(partNum) || 0;
    const house = houses[idx % houses.length];
    partIndex.set(partNum, idx + 1);

    const key = `${house.lat.toFixed(5)},${house.lng.toFixed(5)}`;
    const usage = houseUsage.get(key) || 0;
    houseUsage.set(key, usage + 1);

    // Apply tiny jitter only if multiple volunteers share the same house
    vol.lat = house.lat + usage * 0.000018 * Math.cos(usage * 2.4);
    vol.lng = house.lng + usage * 0.000018 * Math.sin(usage * 2.4);
  }

  fs.writeFileSync(VOLUNTEERS_FILE, JSON.stringify(volunteers, null, 2));
  console.log('Done! Every volunteer is now placed at a house in their booth area.');
}

run().catch(console.error);
