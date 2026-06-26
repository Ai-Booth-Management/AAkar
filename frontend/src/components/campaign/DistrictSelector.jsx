import React from 'react';

const navy = '#04122e';
const saffron = '#D4A843';

const DistrictSelector = ({
  selectedDistrict,
  handleDistrictClick,
  lockDistrict,
  coverageMap,
  DELHI_DISTRICTS,
  CONSTITUENCIES,
  constitCovered,
  constitNames,
}) => {
  return (
    <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: navy, fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}>
          {selectedDistrict ? `${selectedDistrict} District` : "NCT of Delhi"}
        </h3>
        <span style={{
          fontSize: '10px',
          fontWeight: '800',
          padding: '2px 8px',
          background: selectedDistrict ? '#eff6ff' : '#f0fdf4',
          color: selectedDistrict ? '#1d4ed8' : '#166534',
          borderRadius: 2
        }}>
          {selectedDistrict ? `${constitCovered}/${constitNames.length} Covered` : 'OVERVIEW'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {DELHI_DISTRICTS.map(d => {
          const dc = coverageMap[d] || {};
          const dcn = CONSTITUENCIES[d] || [];
          const pct = dcn.length ? Math.round(dcn.filter(c => dc[c]).length / dcn.length * 100) : 0;
          const isLocked = lockDistrict && lockDistrict !== d;
          const isSel = d === selectedDistrict;
          return (
            <button key={d} onClick={() => handleDistrictClick(d)} disabled={isLocked} style={{
              padding: '6px 8px', borderRadius: 4, border: `1px solid ${isSel ? saffron : '#e2e8f0'}`,
              background: isSel ? '#fef3c7' : 'white',
              cursor: isLocked ? 'not-allowed' : 'pointer', textAlign: 'left',
              opacity: isLocked ? 0.4 : 1,
              transition: 'all 0.1s ease',
            }}>
              <div style={{ fontSize: 11, fontWeight: isSel ? 800 : 500, color: isSel ? '#92400e' : navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <div style={{ flex: 1, height: 3, borderRadius: 99, background: '#e2e8f0' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: pct === 100 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#ef4444', width: `${pct}%` }} />
                </div>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#64748b' }}>{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DistrictSelector;
