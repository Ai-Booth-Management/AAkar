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
  selectedConstit,
  setSelectedConstit,
  volunteers,
  wardsData,
  wardToConstit,
  handleMarkWardCovered,
  voterDemoMap,
  filterActive,
}) => {
  const getDemoData = (cName) => {
    if (!voterDemoMap || !voterDemoMap.constituencies || !cName) return null;
    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = norm(cName);
    const key = Object.keys(voterDemoMap.constituencies).find(k => norm(k) === target);
    return key ? voterDemoMap.constituencies[key] : null;
  };

  const getWardDemoData = (wNum) => {
    if (!voterDemoMap || !voterDemoMap.wards || !wNum) return null;
    const key = Object.keys(voterDemoMap.wards).find(k => k === wNum);
    return key ? voterDemoMap.wards[key] : null;
  };

  return (
    <div>
      {selectedDistrict && selectedConstit ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: navy }}>{selectedConstit} Wards</span>
            <button onClick={() => setSelectedConstit('')} style={{ padding: '2px 8px', fontSize: 10, fontWeight: 800, background: navy, color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}>
              ← Back
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>Ward</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>
                  {filterActive ? 'Voters' : 'Vols'}
                </th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>
                  {filterActive ? '% Match' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                if (!wardToConstit || !wardToConstit.length) {
                  return (
                    <tr>
                      <td colSpan={3} style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>Loading ward mapping...</td>
                    </tr>
                  );
                }
                const constituencyWards = wardToConstit
                  .filter(w => w.Constituency.toLowerCase() === selectedConstit.toLowerCase())
                  .map(w => String(w.Ward_No));
                  
                const WardsList = (wardsData?.features || [])
                  .filter(f => constituencyWards.includes(String(f.properties.Ward_No)))
                  .map(f => ({
                    no: String(f.properties.Ward_No),
                    name: f.properties.Ward_Name
                  }));
                  
                if (WardsList.length === 0) {
                  return (
                    <tr>
                      <td colSpan={3} style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>No wards found</td>
                    </tr>
                  );
                }
                
                return WardsList.map((w, idx) => {
                  if (filterActive) {
                    const demoData = getWardDemoData(w.no);
                    const total = demoData ? demoData.total : 0;
                    const matching = demoData ? demoData.matching : 0;
                    const pct = total ? Math.round((matching / total) * 100) : 0;
                    return (
                      <tr key={w.no} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding: '7px 8px', color: navy, fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
                          {w.name} ({w.no})
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: navy, fontWeight: 700, borderBottom: '1px solid #f1f5f9' }}>
                          {matching.toLocaleString()} / {total.toLocaleString()}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 2, background: pct >= 60 ? '#dcfce7' : pct >= 30 ? '#fef9c3' : '#fee2e2', color: pct >= 60 ? '#166534' : pct >= 30 ? '#92400e' : '#991b1b' }}>
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  } else {
                    const volsInWard = volunteers.filter(v => 
                      (v.block && v.block.toLowerCase() === w.name.toLowerCase()) ||
                      (v.area_name && v.area_name.toLowerCase() === w.name.toLowerCase())
                    );
                    const isCovered = volsInWard.some(v => v.task_status === 'completed' || v.coverage_status === 'covered');
                    return (
                      <tr key={w.no} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding: '7px 8px', color: navy, fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
                          {w.name} ({w.no})
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: navy, fontWeight: 700, borderBottom: '1px solid #f1f5f9' }}>
                          {volsInWard.length}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                          {isCovered ? (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 2, background: '#dcfce7', color: '#166534' }}>
                              ✓ COVERED
                            </span>
                          ) : volsInWard.length > 0 ? (
                            <button 
                              onClick={() => handleMarkWardCovered(w.name)}
                              style={{ padding: '2px 6px', fontSize: 9, fontWeight: 800, background: '#ef4444', color: 'white', border: 'none', borderRadius: 2, cursor: 'pointer' }}
                            >
                              PENDING
                            </button>
                          ) : (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 2, background: '#fee2e2', color: '#991b1b' }}>
                              PENDING
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                });
              })()}
            </tbody>
          </table>
        </>
      ) : selectedDistrict ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: navy }}>
              {filterActive ? `${selectedDistrict} Demographics` : `${selectedDistrict} Coverage`}
            </span>
            {!filterActive && (
              <button onClick={handleMarkAllCovered} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 800, background: '#16a34a', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}>
                ✓ Mark All
              </button>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>Constituency</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>
                  {filterActive ? 'Voters' : 'Status'}
                </th>
                {filterActive && (
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>% Match</th>
                )}
              </tr>
            </thead>
            <tbody>
              {constitNames.map((c, i) => {
                if (filterActive) {
                  const demoData = getDemoData(c);
                  const total = demoData ? demoData.total : 0;
                  const matching = demoData ? demoData.matching : 0;
                  const pct = total ? Math.round((matching / total) * 100) : 0;
                  return (
                    <tr key={c} onClick={() => setSelectedConstit(c)} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#f8fafc'}>
                      <td style={{ padding: '7px 8px', color: navy, fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>{c}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', color: navy, fontWeight: 700, borderBottom: '1px solid #f1f5f9' }}>
                        {matching.toLocaleString()} / {total.toLocaleString()}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 2, background: pct >= 60 ? '#dcfce7' : pct >= 30 ? '#fef9c3' : '#fee2e2', color: pct >= 60 ? '#166534' : pct >= 30 ? '#92400e' : '#991b1b' }}>{pct}%</span>
                      </td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={c} onClick={() => setSelectedConstit(c)} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#f8fafc'}>
                      <td style={{ padding: '7px 8px', color: navy, fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>{c}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 2, background: distCov[c] ? '#dcfce7' : '#fee2e2', color: distCov[c] ? '#166534' : '#991b1b' }}>
                          {distCov[c] ? '✓ COVERED' : 'NOT STARTED'}
                        </span>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </>
      ) : (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 700, color: navy }}>
            {filterActive ? 'Delhi — Districts Demographics' : 'Delhi — All Districts Coverage'}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>District</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>
                  {filterActive ? 'Voters' : 'Covered'}
                </th>
                {!filterActive && (
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>Total</th>
                )}
                <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>
                  {filterActive ? '% Match' : '%'}
                </th>
              </tr>
            </thead>
            <tbody>
              {DELHI_DISTRICTS.map((d, i) => {
                if (filterActive) {
                  const dcNames = CONSTITUENCIES[d] || [];
                  const dcVoterData = dcNames.map(c => getDemoData(c)).filter(Boolean);
                  const distTotal = dcVoterData.reduce((s, x) => s + x.total, 0);
                  const distMatch = dcVoterData.reduce((s, x) => s + x.matching, 0);
                  const pct = distTotal ? Math.round((distMatch / distTotal) * 100) : 0;
                  return (
                    <tr key={d} onClick={() => handleDistrictClick(d)} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#f8fafc'}>
                      <td style={{ padding: '7px 8px', color: navy, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{d}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: navy }}>
                        {distMatch.toLocaleString()} / {distTotal.toLocaleString()}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 2, background: pct >= 60 ? '#dcfce7' : pct >= 30 ? '#fef9c3' : '#fee2e2', color: pct >= 60 ? '#166534' : pct >= 30 ? '#92400e' : '#991b1b' }}>{pct}%</span>
                      </td>
                    </tr>
                  );
                } else {
                  const dc = coverageMap[d] || {};
                  const dcn = CONSTITUENCIES[d] || [];
                  const cnt = dcn.filter(c => dc[c]).length;
                  const pct = dcn.length ? Math.round(cnt / dcn.length * 100) : 0;
                  return (
                    <tr key={d} onClick={() => handleDistrictClick(d)} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#f8fafc'}>
                      <td style={{ padding: '7px 8px', color: navy, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{d}</td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#22c55e', textAlign: 'center' }}>{cnt}</td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{dcn.length}</td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 2, background: pct === 100 ? '#dcfce7' : pct > 50 ? '#fef9c3' : '#fee2e2', color: pct === 100 ? '#166534' : pct > 50 ? '#92400e' : '#991b1b' }}>{pct}%</span>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CoverageTable;
