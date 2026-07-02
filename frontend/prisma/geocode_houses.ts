const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyBezo3YLXmZ0b2EX5MCGribAtI3IOfNV1s';
const VOTER_FILE = path.join(__dirname, 'voter.json');
const OUT_FILE = path.join(__dirname, 'houses.json');

async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].geometry.location;
    }
    console.log(`Failed for ${address}: ${data.status}`);
    return null;
  } catch (error) {
    console.error(`Error for ${address}:`, error.message);
    return null;
  }
}

async function run() {
  console.log('Loading voter data...');
  const voters = JSON.parse(fs.readFileSync(VOTER_FILE, 'utf8'));
  
  // Extract unique households
  const houseMap = new Map();
  voters.forEach(v => {
    if (!v.house_no || !v.section) return;
    
    // Create a unique key per house
    const key = `${v.part_number}|${v.house_no}|${v.section}`;
    if (!houseMap.has(key)) {
      houseMap.set(key, {
        partNumber: v.part_number,
        houseNo: v.house_no,
        section: v.section,
        address: `House No. ${v.house_no}, ${v.section}, Delhi Cantt, New Delhi, India`,
        voterCount: 0
      });
    }
    houseMap.get(key).voterCount++;
  });

  const houses = Array.from(houseMap.values());
  console.log(`Found ${houses.length} unique households. Beginning geocoding...`);

  const results = [];
  
  // Process in small chunks to avoid hitting limits too hard, but 700 is small enough.
  for (let i = 0; i < houses.length; i++) {
    const house = houses[i];
    
    // print progress every 50
    if (i % 50 === 0) console.log(`Processed ${i}/${houses.length}...`);
    
    const location = await geocodeAddress(house.address);
    if (location) {
      results.push({
        ...house,
        lat: location.lat,
        lng: location.lng
      });
    } else {
      results.push({
        ...house,
        lat: null,
        lng: null
      });
    }
    
    // Tiny delay to be safe
    await new Promise(r => setTimeout(r, 20));
  }

  console.log('Geocoding complete. Saving to houses.json...');
  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
  console.log('Done!');
}

run();
