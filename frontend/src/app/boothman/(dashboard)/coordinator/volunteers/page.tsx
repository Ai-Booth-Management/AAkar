import { getUser } from '@/lib/boothman/auth';
import { prisma } from '@/lib/boothman/prisma';
import { redirect } from 'next/navigation';
import { Users, UserCheck, Clock, ShieldAlert } from 'lucide-react';

export default async function CoordinatorVolunteersPage() {
  const user = await getUser();
  if (user?.role !== 'COORDINATOR') redirect('/');

  const booth = await prisma.booth.findUnique({
    where: { id: user.id },
    include: {
      volunteers: {
        orderBy: { name: 'asc' }
      }
    }
  });

  if (!booth) {
    return <div className="p-8">No booth assigned.</div>;
  }

  const approvedVols = booth.volunteers.filter((v: any) => v.status === 'APPROVED');
  const pendingVols = booth.volunteers.filter((v: any) => v.status === 'PENDING');

  return (
    <div className="flex flex-col h-full">
      <header className="header">
        <h1>My Volunteers</h1>
        <div className="header-right">
          <div className="text-sm font-bold text-gray-500 mr-2">{booth.name}</div>
        </div>
      </header>

      <main className="content space-y-6">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card flex items-center p-6 gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Users className="text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-aakar-navy">{booth.volunteers.length}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Registered</div>
            </div>
          </div>
          <div className="card flex items-center p-6 gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <UserCheck className="text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-aakar-navy">{approvedVols.length}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active & Approved</div>
            </div>
          </div>
          <div className="card flex items-center p-6 gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-aakar-navy">{pendingVols.length}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Approval</div>
            </div>
          </div>
        </div>

        {/* Volunteer List */}
        <div className="card">
          <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
            <h3 className="mb-0 text-lg font-black text-aakar-navy">Volunteer Roster</h3>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone Number</th>
                  <th>Aadhaar</th>
                  <th>Geo-Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {booth.volunteers.map((vol: any) => (
                  <tr key={vol.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                          {vol.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm">{vol.name}</span>
                      </div>
                    </td>
                    <td className="text-sm">{vol.phone}</td>
                    <td className="text-sm font-mono text-slate-500">
                      {vol.aadhaar ? `XXXX-XXXX-${vol.aadhaar.slice(-4)}` : 'Not Provided'}
                    </td>
                    <td className="text-xs text-slate-400">
                      {vol.lat && vol.lng ? `${vol.lat.toFixed(4)}, ${vol.lng.toFixed(4)}` : 'Unknown'}
                    </td>
                    <td>
                      <span className={`badge ${vol.status === 'APPROVED' ? 'badge-low' : 'bg-amber-100 text-amber-700'}`}>
                        {vol.status}
                      </span>
                    </td>
                    <td>
                      {vol.status === 'PENDING' ? (
                        <button className="text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded hover:bg-green-100 transition-colors">
                          Approve
                        </button>
                      ) : (
                        <button className="text-xs font-bold text-brand hover:text-yellow-600 transition-colors">
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                
                {booth.volunteers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <ShieldAlert className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <div className="text-slate-500 font-semibold">No volunteers assigned to this booth yet.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
