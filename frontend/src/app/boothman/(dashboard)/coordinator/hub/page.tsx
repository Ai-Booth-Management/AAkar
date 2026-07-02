import React from 'react';
import Hub from '@/components/shared/Hub';
import { getUser } from '@/lib/boothman/auth';
import { prisma } from '@/lib/boothman/prisma';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';

export default async function HubPage() {
  const user = await getUser();
  if (user?.role !== 'COORDINATOR') redirect('/');

  const booth = await prisma.booth.findUnique({
    where: { id: user.id },
  });

  if (!booth) {
    return <div className="p-8">No booth assigned or location data missing.</div>;
  }
  
  // Fetch real stats
  const activeVolunteers = await prisma.volunteer.count({
    where: { assignedBoothId: booth.id, status: 'APPROVED' }
  });

  let boothVoters = [];
  try {
    const votersPath = path.join(process.cwd(), 'prisma', 'voter.json');
    if (fs.existsSync(votersPath)) {
      const allVoters = JSON.parse(fs.readFileSync(votersPath, 'utf8'));
      boothVoters = allVoters.filter((v: any) => v.part_number === booth.partNumber);
    }
  } catch (err) {
    console.error("Failed to load voter.json", err);
  }

  const initialStats = {
    voters: boothVoters.length,
    volunteers: activeVolunteers
  };

  const hierarchy = {
    booth: booth.partNumber,
    mandal: 'ND-NDL-M1', // using mocked values from the system for now
    constituency: 'ND-NDL',
    district: 'ND',
    state: 'DL'
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="header shrink-0">
        <h1>Intel Hub ({booth.partNumber})</h1>
        <div className="header-right">
          <div className="text-sm font-bold text-gray-500 mr-2">Coord</div>
          <div className="w-8 h-8 rounded bg-brand text-aakar-navy flex items-center justify-center font-bold">C</div>
        </div>
      </header>
      
      <main className="content space-y-8 pb-12">
         <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-1" style={{ minHeight: 'calc(100vh - 180px)' }}>
            <Hub hierarchy={hierarchy} userRole="BOOTH_PRESIDENT" initialStats={initialStats} />
         </div>
      </main>
    </div>
  );
}
