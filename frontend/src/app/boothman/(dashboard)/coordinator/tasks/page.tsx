import { getUser } from '@/lib/boothman/auth';
import { prisma } from '@/lib/boothman/prisma';
import { redirect } from 'next/navigation';
import TaskBoard from '@/components/boothman/TaskBoard';

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

export default async function CoordinatorTasksPage() {
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

  if (!booth) {
    return <div className="p-8">No booth assigned or location data missing.</div>;
  }

  const allAvailableVolunteers = await prisma.volunteer.findMany({
    where: { 
      status: 'APPROVED',
      lat: { not: null },
      lng: { not: null }
    }
  });

  const volunteersWithDistance = allAvailableVolunteers.map((v: any) => ({
    ...v,
    distanceKm: getDistance(booth.lat!, booth.lng!, v.lat!, v.lng!)
  }));

  const nearestVolunteers = volunteersWithDistance
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 20);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <header className="header shrink-0">
        <h1>Task Management</h1>
      </header>
      <main className="content flex-1 overflow-hidden py-6">
        <div className="max-w-4xl mx-auto h-full">
          <TaskBoard tasks={booth.tasks} volunteers={nearestVolunteers} />
        </div>
      </main>
    </div>
  );
}
