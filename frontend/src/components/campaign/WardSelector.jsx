import React from 'react';
import { normConstit, isPointInGeometry } from './campaignUtils';

const navy = '#04122e';
const saffron = '#D4A843';

const WardSelector = ({
  selectedDistrict,
  selectedConstit,
  selectedWard,
  setSelectedWard,
  lockWard,
  wardToConstit,
  volunteers,
  wardsData,
}) => {
  if (!selectedDistrict || !selectedConstit) return null;

  return (
    <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 16 }}>
      <h4 style={{ margin: '0 0 10px 0', color: navy, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Wards in {selectedConstit}</span>
        {selectedWard && !lockWard && (
          <button onClick={() => setSelectedWard('')} style={{ border: 'none', background: 'transparent', fontSize: '9px', fontWeight: '800', color: '#ef4444', cursor: 'pointer' }}>
            [Clear Filter]
          </button>
        )}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
        {wardToConstit
          .filter(w => normConstit(w.Constituency) === normConstit(selectedConstit))
          .map(w => {
            const isWardLocked = lockWard && lockWard !== w.Ward_No;
            if (isWardLocked) return null;
            const wardGeom = (wardsData?.features || []).find(f => f.properties.Ward_No === w.Ward_No)?.geometry;
            const volsInWard = volunteers.filter(v => 
              v.lat && v.lng && isPointInGeometry(v.lng, v.lat, wardGeom)
            );
            const isSel = selectedWard === w.Ward_No;
            return (
              <div 
                key={w.Ward_No}
                onClick={() => {
                  if (lockWard) return;
                  setSelectedWard(isSel ? '' : w.Ward_No);
                }}
                style={{
                  padding: '6px 8px', borderRadius: 4, border: `1px solid ${isSel ? saffron : '#e2e8f0'}`,
                  background: isSel ? '#fef3c7' : 'white', cursor: lockWard ? 'default' : 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.1s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: navy }}>{w.Ward_Name}</div>
                  <div style={{ fontSize: 8, color: '#64748b' }}>Code: {w.Ward_No}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 10, background: volsInWard.length ? '#eff6ff' : '#f1f5f9', color: volsInWard.length ? '#1d4ed8' : '#64748b' }}>
                  {volsInWard.length} Vols
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default WardSelector;
