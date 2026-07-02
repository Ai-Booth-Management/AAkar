import { getUser } from '@/lib/boothman/auth';
import { prisma } from '@/lib/boothman/prisma';
import { redirect } from 'next/navigation';
import { Users, MapPin, AlertCircle, FileText } from 'lucide-react';
import MapWrapper from '@/components/boothman/MapWrapper';
import NearestVolunteerFinder from '@/components/boothman/NearestVolunteerFinder';

export default async function AdminDashboard() {
  const user = await getUser();
  if (user?.role !== 'ADMIN') redirect('/');

  const totalVolunteers = await prisma.volunteer.count();
  const pendingRegistrations = await prisma.volunteer.count({ where: { status: 'PENDING' } });
  const totalBooths = await prisma.booth.count();
  const recentReports = await prisma.report.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { author: true, booth: true }
  });

  const booths = await prisma.booth.findMany();
  const volunteers = await prisma.volunteer.findMany();
  const tasks = await prisma.task.findMany({ include: { booth: true } });
  
  const mapBooths = booths.map((b: any) => ({
    id: b.id,
    partNumber: b.partNumber,
    name: b.name,
    lat: b.lat,
    lng: b.lng
  }));

  const mapVolunteers = volunteers.map((v: any) => ({
    id: v.id,
    name: v.name,
    phone: v.phone,
    status: v.status,
    lat: v.lat,
    lng: v.lng
  }));

  const mapTasks = tasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    lat: t.booth.lat,
    lng: t.booth.lng
  }));

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="header shrink-0">
        <h1>Assembly Admin Dashboard</h1>
        <div className="header-right">
          <div className="text-sm font-bold text-gray-500 mr-2">{user.name}</div>
          <div className="w-8 h-8 rounded bg-aakar-navy text-white flex items-center justify-center font-bold">A</div>
        </div>
      </header>

      <main className="content space-y-6">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Users className="text-blue-500" />
            </div>
            <div>
              <span className="label">Total Volunteers</span>
              <span className="value">{totalVolunteers}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-amber-50">
              <AlertCircle className="text-amber-500" />
            </div>
            <div>
              <span className="label">Pending Approvals</span>
              <span className="value">{pendingRegistrations}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-green-50">
              <MapPin className="text-green-500" />
            </div>
            <div>
              <span className="label">Total Booths</span>
              <span className="value">{totalBooths}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-purple-50">
              <FileText className="text-purple-500" />
            </div>
            <div>
              <span className="label">Reports Today</span>
              <span className="value">12</span>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden flex flex-col p-0 border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="m-0 text-sm font-bold text-aakar-navy uppercase tracking-wider flex items-center gap-2"><MapPin size={16} className="text-brand"/> Global Geographic Overview</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-200 px-2 py-1 rounded">Delhi Cantt (AC-38)</span>
          </div>
          <div className="w-full relative">
            <MapWrapper 
              booths={mapBooths} 
              volunteers={mapVolunteers}
              tasks={mapTasks}
              centerLat={28.5961}
              centerLng={77.1324}
              zoom={12}
              height="600px"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
          <div className="card lg:col-span-2">
            <h3>Recent Reports</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Booth</th>
                    <th>Volunteer</th>
                    <th>Report Title</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map(report => (
                    <tr key={report.id}>
                      <td className="font-semibold">{report.booth.partNumber}</td>
                      <td>{report.author.name}</td>
                      <td>{report.title}</td>
                      <td>{report.createdAt.toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {recentReports.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">No reports found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="card-dark">
            <h3>System Status</h3>
            <div className="space-y-4 mt-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-semibold text-white/70">Database Status</span>
                <span className="badge badge-low">Connected</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-semibold text-white/70">Constituency</span>
                <span className="text-sm font-bold text-white">Delhi Cantt</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-semibold text-white/70">Active Coordinators</span>
                <span className="text-sm font-bold text-brand">127 / 127</span>
              </div>
            </div>
            <button className="w-full mt-6 bg-brand text-aakar-navy font-black text-xs uppercase tracking-widest py-3 rounded hover:bg-yellow-400 transition-colors">
              Broadcast Message
            </button>
            </div>
            <NearestVolunteerFinder volunteers={mapVolunteers} />
          </div>
        </div>
      </main>
    </div>
  );
}
