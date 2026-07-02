import { getUser } from '@/lib/boothman/auth';
import { prisma } from '@/lib/boothman/prisma';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import CampaignBoard from './CampaignBoard';
import { Megaphone } from 'lucide-react';

export default async function CampaignsPage() {
  const user = await getUser();
  if (user?.role !== 'COORDINATOR') redirect('/');

  const booth = await prisma.booth.findUnique({
    where: { id: user.id },
    include: {
      volunteers: {
        where: { status: 'APPROVED' }
      },
      tasks: true
    }
  });

  if (!booth) {
    return <div className="p-8">Booth not found</div>;
  }

  // Parse voter.json for houses
  const filePath = path.join(process.cwd(), 'prisma', 'voter.json');
  let houses: { house_no: string; section: string; voterCount: number }[] = [];
  
  if (fs.existsSync(filePath)) {
    const votersData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const boothVoters = votersData.filter((v: any) => v.part_number === booth.partNumber);
    
    const houseMap = new Map<string, { house_no: string; section: string; voterCount: number }>();
    boothVoters.forEach((v: any) => {
      const houseNo = (v.house_no || 'Unknown').toString().trim();
      if (!houseMap.has(houseNo)) {
        houseMap.set(houseNo, {
          house_no: houseNo,
          section: v.section || 'Unknown Section',
          voterCount: 0
        });
      }
      houseMap.get(houseNo)!.voterCount += 1;
    });

    houses = Array.from(houseMap.values()).sort((a, b) => {
      const numA = parseInt(a.house_no);
      const numB = parseInt(b.house_no);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.house_no.localeCompare(b.house_no);
    });
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="header shrink-0">
        <h1 className="flex items-center gap-3"><Megaphone className="text-brand" size={28} /> Door-to-Door Campaigns</h1>
      </header>

      <main className="content space-y-6 pb-8">
        <div style={{ backgroundColor: 'rgba(239,246,255,0.5)', border: '1px solid #dbeafe', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ color: '#1e3a8a', fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>Campaign Outreach Manager</h2>
          <p style={{ color: 'rgba(29,78,216,0.8)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            Assign your available volunteers to specific households for door-to-door campaigning. 
            Select a house from the list below to create a targeted outreach task.
          </p>
        </div>
        
        <CampaignBoard 
          houses={houses} 
          volunteers={booth.volunteers} 
          boothId={booth.id} 
          tasks={booth.tasks}
        />
      </main>
    </div>
  );
}
