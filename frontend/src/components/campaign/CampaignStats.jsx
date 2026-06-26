import React from 'react';

const navy = '#04122e';

const CampaignStats = ({
  selectedDistrict,
  volunteers,
  delhiStats,
  activeVols,
  pctVols,
  coveredVols,
  constitCovered,
  constitNames,
  DELHI_DISTRICTS,
}) => {
  const stats = [
    {
      label: 'Volunteers',
      val: selectedDistrict ? volunteers.length : delhiStats.totalVols,
      sub: selectedDistrict ? selectedDistrict : 'All Delhi',
      color: '#3b82f6',
      bg: '#eff6ff',
      border: '#bfdbfe'
    },
    {
      label: 'Active Now',
      val: selectedDistrict ? activeVols : delhiStats.activeVols,
      sub: selectedDistrict ? 'Sending location' : 'Delhi-wide active',
      color: '#22c55e',
      bg: '#f0fdf4',
      border: '#bbf7d0'
    },
    {
      label: 'Area Covered',
      val: selectedDistrict ? `${pctVols}%` : `${delhiStats.pct}%`,
      sub: selectedDistrict ? `${coveredVols}/${volunteers.length}` : `${delhiStats.coveredConstit}/${delhiStats.totalConstit} Constituencies`,
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fef3c7'
    },
    {
      label: 'Constituencies',
      val: selectedDistrict ? `${constitCovered}/${constitNames.length}` : `${DELHI_DISTRICTS.length} Districts`,
      sub: selectedDistrict ? 'Constituencies Covered' : 'Delhi-wide districts',
      color: '#8b5cf6',
      bg: '#faf5ff',
      border: '#e9d5ff'
    }
  ];

  return (
    <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map(({ label, val, sub, bg, border }) => (
          <div key={label} style={{
            background: bg, padding: '12px 14px', border: `1px solid ${border}`, borderRadius: 4, textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: navy }}>{val}</div>
            <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignStats;
