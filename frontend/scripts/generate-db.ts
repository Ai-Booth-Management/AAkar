import fs from 'fs';
import path from 'path';

const boothsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../prisma/booths.json'), 'utf-8'));

const FIRST_NAMES = ["Amit", "Rahul", "Priya", "Sneha", "Vikram", "Anjali", "Rohan", "Neha", "Karan", "Pooja", "Arjun", "Kavita", "Suresh", "Meena", "Ramesh", "Deepa", "Manish", "Sunita", "Rajesh", "Geeta"];
const LAST_NAMES = ["Sharma", "Singh", "Kumar", "Gupta", "Verma", "Patel", "Das", "Joshi", "Mishra", "Yadav", "Chauhan", "Reddy"];

function getRandomName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f} ${l}`;
}

function getRandomPhone() {
  return "9" + Math.floor(100000000 + Math.random() * 900000000).toString();
}

function getRandomAadhaar() {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

const db: {
  admin: any[];
  booth: any[];
  volunteer: any[];
  task: any[];
  report: any[];
  attendance: any[];
} = {
  admin: [
    {
      id: 1,
      name: 'Delhi Cantt Admin',
      phone: 'admin',
      password: 'password'
    }
  ],
  booth: [],
  volunteer: [],
  task: [],
  report: [],
  attendance: []
};

// 1. Create Booths
for (let i = 0; i < boothsData.length; i++) {
  const jsonBooth = boothsData[i];
  const partNumberStr = `AC38-${jsonBooth.part_number.toString().padStart(3, '0')}`;
  
  const booth = {
    id: i + 1,
    partNumber: partNumberStr,
    name: jsonBooth.polling_station,
    address: jsonBooth.polling_station,
    password: "password123",
    lat: jsonBooth.latitude,
    lng: jsonBooth.longitude,
    requiredVols: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.booth.push(booth);
}

// 2. Load Real Volunteers
if (fs.existsSync(path.join(__dirname, '../prisma/volunteers.json'))) {
  const vols = JSON.parse(fs.readFileSync(path.join(__dirname, '../prisma/volunteers.json'), 'utf-8'));
  for (const v of vols) {
    // Find the booth with matching partNumber
    const booth = db.booth.find(b => b.partNumber === v.partNumber);
    db.volunteer.push({
      id: v.id,
      name: v.name,
      phone: v.phone,
      aadhaar: v.aadhaar,
      password: "password123", // Set a default password
      status: v.status,
      lat: v.lat,
      lng: v.lng,
      assignedBoothId: booth ? booth.id : null,
      createdAt: v.createdAt || new Date().toISOString(),
      updatedAt: v.updatedAt || new Date().toISOString()
    });
  }
}

// 3. Load Real Tasks
if (fs.existsSync(path.join(__dirname, '../prisma/tasks.json'))) {
  const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, '../prisma/tasks.json'), 'utf-8'));
  for (const t of tasks) {
    const booth = db.booth.find(b => b.partNumber === t.partNumber);
    if (booth) {
      db.task.push({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        boothId: booth.id,
        assigneeId: t.assigneeId,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || new Date().toISOString()
      });
    }
  }
}

fs.writeFileSync(path.join(__dirname, '../prisma/db.json'), JSON.stringify(db, null, 2));
console.log('Successfully generated db.json with real data');
