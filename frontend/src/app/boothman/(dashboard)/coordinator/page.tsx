import { getUser } from '@/lib/boothman/auth';
import { prisma } from '@/lib/boothman/prisma';
import { redirect } from 'next/navigation';
import { Users, CheckSquare, Clock, MapPin } from 'lucide-react';
import fs from 'fs';
import path from 'path';
import MapWrapper from '@/components/boothman/MapWrapper';
import TaskBoard from '@/components/boothman/TaskBoard';
import QuickAssignButton from '@/components/boothman/QuickAssignButton';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

export default async function CoordinatorDashboard() {
  const user = await getUser();
  if (user?.role !== 'COORDINATOR') redirect('/');

  const booth = await prisma.booth.findUnique({
    where: { id: user.id },
    include: {
      volunteers: true,
      tasks: {
        include: { assignee: true },
        orderBy: { createdAt: 'desc' }
      },
    }
  });

  if (!booth || !booth.lat || !booth.lng) {
    return <div className="p-8">No booth assigned or location data missing.</div>;
  }

  const activeVolunteers = booth.volunteers.filter((v: any) => v.status === 'APPROVED');
  const pendingTasks = booth.tasks.filter((t: any) => t.status !== 'COMPLETED');

  const allAvailableVolunteers = await prisma.volunteer.findMany({
    where: { 
      status: 'APPROVED',
      lat: { not: null },
      lng: { not: null }
    }
  });

  // Calculate distance for all volunteers
  const volunteersWithDistance = allAvailableVolunteers.map((v: any) => ({
    ...v,
    distanceKm: getDistance(booth.lat!, booth.lng!, v.lat!, v.lng!)
  }));

  // Sort by distance and take top 20 for the local map visualization
  const nearestVolunteers = volunteersWithDistance
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 20);

  // Transform data for map
  const mapBooths = [{
    id: booth.id,
    partNumber: booth.partNumber,
    name: booth.name,
    lat: booth.lat,
    lng: booth.lng
  }];

  let mapHouses: any[] = [];
  try {
    const housesPath = path.join(process.cwd(), 'prisma', 'houses.json');
    if (fs.existsSync(housesPath)) {
      const housesData = JSON.parse(fs.readFileSync(housesPath, 'utf8'));
      mapHouses = housesData.filter((h: any) => h.partNumber === booth.partNumber);
    }
  } catch (err) {
    console.error("Failed to load houses.json", err);
  }

  const mapVolunteers = activeVolunteers.map((v: any, idx: number) => {
    let lat = v.lat;
    let lng = v.lng;
    
    // Snap volunteers to house locations since they live in these houses
    if (mapHouses.length > 0) {
      const house = mapHouses[idx % mapHouses.length];
      lat = house.lat;
      lng = house.lng;
    }
    
    return {
      id: v.id,
      name: v.name,
      phone: v.phone,
      status: v.status,
      lat,
      lng
    };
  });

  // Build a volunteer id -> location lookup using active volunteers assigned to this booth
  const volLocationMap = new Map(mapVolunteers.map((v: any) => [v.id, { lat: v.lat, lng: v.lng }]));

  const mapTasks = booth.tasks.map((t: any, idx: number) => {
    // Use the assignee's real location if available
    const assigneeLoc = t.assigneeId ? volLocationMap.get(t.assigneeId) : null;
    
    // If unassigned, place the task at a random house within the booth's boundary
    let fallbackLat = booth.lat!;
    let fallbackLng = booth.lng!;
    if (mapHouses.length > 0) {
      const randomHouse = mapHouses[idx % mapHouses.length];
      fallbackLat = randomHouse.lat;
      fallbackLng = randomHouse.lng;
    }

    const lat = (assigneeLoc as any)?.lat ?? fallbackLat;
    const lng = (assigneeLoc as any)?.lng ?? fallbackLng;
    
    // Tiny jitter to avoid hiding under the house/volunteer pin
    const finalLat = lat + 0.00003 * Math.cos(idx * 2.4);
    const finalLng = lng + 0.00003 * Math.sin(idx * 2.4);

    return { id: t.id, title: t.title, status: t.status, lat: finalLat, lng: finalLng };
  });


  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="header shrink-0">
        <h1>{booth.name} ({booth.partNumber})</h1>
        <div className="header-right">
          <div className="text-sm font-bold text-gray-500 mr-2">{booth.partNumber} Coord</div>
          <div className="w-8 h-8 rounded bg-brand text-aakar-navy flex items-center justify-center font-bold">C</div>
        </div>
      </header>

      <main className="content space-y-6 pb-8">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon bg-blue-50">
              <Users className="text-blue-500" />
            </div>
            <div>
              <span className="label">Assigned / Total</span>
              <span className="value">{activeVolunteers.length} / {booth.volunteers.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-amber-50">
              <CheckSquare className="text-amber-500" />
            </div>
            <div>
              <span className="label">Pending Tasks</span>
              <span className="value">{pendingTasks.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-green-50">
              <Clock className="text-green-500" />
            </div>
            <div>
              <span className="label">Checked In Today</span>
              <span className="value">0</span>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden flex flex-col p-0 border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="m-0 text-sm font-bold text-aakar-navy uppercase tracking-wider flex items-center gap-2"><MapPin size={16} className="text-brand"/> Local Geographic Overview</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-200 px-2 py-1 rounded">Booth {booth.partNumber}</span>
          </div>
          <div className="w-full relative">
            <MapWrapper 
              booths={mapBooths} 
              volunteers={mapVolunteers}
              tasks={mapTasks}
              houses={mapHouses}
              centerLat={booth.lat}
              centerLng={booth.lng}
              zoom={14}
              height="600px"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="card">
              <div className="flex justify-between items-center mb-5">
                <h3 className="mb-0">Assigned Volunteers</h3>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeVolunteers.map((vol: any) => (
                      <tr key={vol.id}>
                        <td className="font-semibold">{vol.name}</td>
                        <td>{vol.phone}</td>
                        <td>
                          <span className="badge badge-low">Active</span>
                        </td>
                      </tr>
                    ))}
                    {activeVolunteers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-4 text-gray-500">No volunteers assigned</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-dark" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, padding: 0, border: 'none', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <MapPin size={16} /> Nearest Available Volunteers
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {nearestVolunteers.slice(0, 5).map((vol: any) => {
                  const isAssigned = vol.assignedBoothId === booth.id;
                  return (
                    <div key={vol.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px 24px', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background-color 0.2s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '13px', letterSpacing: '0.05em' }}>
                          {vol.name.substring(0,2).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {vol.name}
                            {isAssigned && <span style={{ backgroundColor: '#fefce8', color: '#D4AF37', fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Assigned Here</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} /> {vol.distanceKm.toFixed(2)} km away
                          </div>
                        </div>
                      </div>
                      <QuickAssignButton assigneeId={vol.id} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card p-0 bg-transparent border-0 shadow-none">
            <TaskBoard 
              tasks={booth.tasks} 
              volunteers={nearestVolunteers} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}
