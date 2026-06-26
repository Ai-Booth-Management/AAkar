import React from 'react';

const navy = '#04122e';

const CoverageTable = ({
  selectedDistrict,
  handleDistrictClick,
  handleMarkAllCovered,
  constitNames,
  distCov,
  coverageMap,
  DELHI_DISTRICTS,
  CONSTITUENCIES,
}) => {
  return (
    <div>
      {selectedDistrict ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: navy }}>{selectedDistrict} Coverage</span>
            <button onClick={handleMarkAllCovered} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 800, background: '#16a34a', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}>
              ✓ Mark All
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>Constituency</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {constitNames.map((c, i) => (
                <tr key={c} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '7px 8px', color: navy, fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>{c}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 2, background: distCov[c] ? '#dcfce7' : '#fee2e2', color: distCov[c] ? '#166534' : '#991b1b' }}>
                      {distCov[c] ? '✓ COVERED' : 'NOT STARTED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 700, color: navy }}>Delhi — All Districts Coverage</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['District', 'Covered', 'Total', '%'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DELHI_DISTRICTS.map((d, i) => {
                const dc = coverageMap[d] || {};
                const dcn = CONSTITUENCIES[d] || [];
                const cnt = dcn.filter(c => dc[c]).length;
                const pct = dcn.length ? Math.round(cnt / dcn.length * 100) : 0;
                return (
                  <tr key={d} onClick={() => handleDistrictClick(d)} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', cursor: 'pointer', transition: 'background 0.1s' }}>
                    <td style={{ padding: '7px 8px', color: navy, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{d}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#22c55e' }}>{cnt}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{dcn.length}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 2, background: pct === 100 ? '#dcfce7' : pct > 50 ? '#fef9c3' : '#fee2e2', color: pct === 100 ? '#166534' : pct > 50 ? '#92400e' : '#991b1b' }}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CoverageTable;
