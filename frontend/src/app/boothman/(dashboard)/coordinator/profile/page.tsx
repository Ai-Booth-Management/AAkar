import React from 'react';
import { getUser } from '@/lib/boothman/auth';
import { prisma } from '@/lib/boothman/prisma';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';

export default async function BoothProfilePage() {
  const user = await getUser();
  if (user?.role !== 'COORDINATOR') redirect('/');

  const booth = await prisma.booth.findUnique({
    where: { id: user.id },
  });

  if (!booth) {
    return <div className="p-8">No booth assigned or location data missing.</div>;
  }

  let boothVoters: any[] = [];
  try {
    const votersPath = path.join(process.cwd(), 'prisma', 'voter.json');
    if (fs.existsSync(votersPath)) {
      const allVoters = JSON.parse(fs.readFileSync(votersPath, 'utf8'));
      boothVoters = allVoters.filter((v: any) => v.part_number === booth.partNumber);
    }
  } catch (err) {
    console.error('Failed to load voter.json', err);
  }

  const totalVoters = boothVoters.length;
  const estHouseholds = new Set(boothVoters.map((v: any) => v.house_no)).size;
  
  const maleVoters = boothVoters.filter((v: any) => v.gender === 'Male').length;
  const femaleVoters = boothVoters.filter((v: any) => v.gender === 'Female').length;
  const malePercentage = totalVoters > 0 ? Math.round((maleVoters / totalVoters) * 100) : 0;
  const femalePercentage = totalVoters > 0 ? Math.round((femaleVoters / totalVoters) * 100) : 0;
  
  const seniorCitizens = boothVoters.filter((v: any) => {
    const age = parseInt(v.age);
    return !isNaN(age) && age >= 60;
  }).length;
  
  const youthPower = boothVoters.filter((v: any) => {
    const age = parseInt(v.age);
    return !isNaN(age) && age >= 18 && age <= 30;
  }).length;

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Booth Profile ({booth.partNumber})</div>
          <div className="dash-page-subtitle">
            <span className="pill pill-live">Live Data</span>
          </div>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">{totalVoters}</div><div className="ds-label">Registered Voters</div></div>
        <div className="dash-stat"><div className="ds-value">{estHouseholds}</div><div className="ds-label">Est. Households</div></div>
        <div className="dash-stat"><div className="ds-value">{femaleVoters}</div><div className="ds-label">Female Voters</div></div>
        <div className="dash-stat-dark"><div className="ds-value">{youthPower}</div><div className="ds-label">Youth Power</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Booth Demographics</h3></div>
          <div className="dash-section-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ProgressRow for Male */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 100, fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Male Voters</div>
                <div style={{ flex: 1, height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${malePercentage}%`, height: '100%', background: 'var(--blue-500)' }} />
                </div>
                <div style={{ width: 32, textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--gray-800)' }}>{malePercentage}%</div>
              </div>
              
              {/* ProgressRow for Female */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 100, fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Female Voters</div>
                <div style={{ flex: 1, height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${femalePercentage}%`, height: '100%', background: 'var(--amber-500)' }} />
                </div>
                <div style={{ width: 32, textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--gray-800)' }}>{femalePercentage}%</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div className="dash-stat" style={{ flex: 1, border: 'none', background: 'var(--gray-50)' }}>
                  <div className="ds-value" style={{ fontSize: 20 }}>{seniorCitizens}</div>
                  <div className="ds-label">Senior Citizens</div>
                </div>
                <div className="dash-stat" style={{ flex: 1, border: 'none', background: 'var(--gray-50)' }}>
                  <div className="ds-value" style={{ fontSize: 20 }}>{youthPower}</div>
                  <div className="ds-label">Youth Power</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-head">
            <h3>Top Complaints</h3>
          </div>
          <div className="dash-section-body" style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Complaint 1 */}
              <div style={{ 
                border: '1px solid var(--gray-100)', 
                borderRadius: 8, 
                padding: '12px 14px', 
                background: 'var(--gray-50)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: 9, 
                    fontWeight: 900, 
                    padding: '3px 6px', 
                    background: 'var(--blue-50)', 
                    color: 'var(--blue-600)', 
                    border: '1px solid var(--blue-100)', 
                    borderRadius: 4,
                    textTransform: 'uppercase' 
                  }}>
                    Opposition
                  </span>
                  <span style={{ 
                    fontSize: 9, 
                    fontWeight: 900, 
                    padding: '3px 6px', 
                    background: 'var(--red-50)', 
                    color: 'var(--red-600)', 
                    border: '1px solid var(--red-100)', 
                    borderRadius: 4,
                    textTransform: 'uppercase' 
                  }}>
                    95% Weightage
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-900)' }}>
                  Opposition distributing cash near station
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>
                  <span>Ref: #1024</span>
                  <span style={{ 
                    color: 'var(--amber-500)', 
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber-500)' }} />
                    Open
                  </span>
                </div>
              </div>

              {/* Complaint 2 */}
              <div style={{ 
                border: '1px solid var(--gray-100)', 
                borderRadius: 8, 
                padding: '12px 14px', 
                background: 'var(--gray-50)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: 9, 
                    fontWeight: 900, 
                    padding: '3px 6px', 
                    background: 'var(--blue-50)', 
                    color: 'var(--blue-600)', 
                    border: '1px solid var(--blue-100)', 
                    borderRadius: 4,
                    textTransform: 'uppercase' 
                  }}>
                    EVM
                  </span>
                  <span style={{ 
                    fontSize: 9, 
                    fontWeight: 900, 
                    padding: '3px 6px', 
                    background: 'var(--red-50)', 
                    color: 'var(--red-600)', 
                    border: '1px solid var(--red-100)', 
                    borderRadius: 4,
                    textTransform: 'uppercase' 
                  }}>
                    88% Weightage
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-900)' }}>
                  EVM malfunctioning in Room 3
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>
                  <span>Ref: #1025</span>
                  <span style={{ 
                    color: 'var(--amber-500)', 
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber-500)' }} />
                    Open
                  </span>
                </div>
              </div>

              {/* Complaint 3 */}
              <div style={{ 
                border: '1px solid var(--gray-100)', 
                borderRadius: 8, 
                padding: '12px 14px', 
                background: 'var(--gray-50)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: 9, 
                    fontWeight: 900, 
                    padding: '3px 6px', 
                    background: 'var(--blue-50)', 
                    color: 'var(--blue-600)', 
                    border: '1px solid var(--blue-100)', 
                    borderRadius: 4,
                    textTransform: 'uppercase' 
                  }}>
                    Infrastructure
                  </span>
                  <span style={{ 
                    fontSize: 9, 
                    fontWeight: 900, 
                    padding: '3px 6px', 
                    background: 'var(--amber-50)', 
                    color: 'var(--amber-600)', 
                    border: '1px solid var(--amber-100)', 
                    borderRadius: 4,
                    textTransform: 'uppercase' 
                  }}>
                    72% Weightage
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-900)' }}>
                  Power cut at polling station
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>
                  <span>Ref: #1026</span>
                  <span style={{ 
                    color: 'var(--amber-500)', 
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber-500)' }} />
                    Open
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
