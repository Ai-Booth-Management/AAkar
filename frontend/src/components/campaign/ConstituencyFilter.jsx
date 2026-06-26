import React from 'react';

const navy = '#04122e';

const ConstituencyFilter = ({
  selectedDistrict,
  selectedConstit,
  setSelectedConstit,
  setSelectedWard,
  lockConstituency,
  constitNames,
  distCov,
}) => {
  if (!selectedDistrict) return null;

  return (
    <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 16 }}>
      <h4 style={{ margin: '0 0 10px 0', color: navy, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Constituency Filter
      </h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {!lockConstituency && (
          <button onClick={() => { setSelectedConstit(''); setSelectedWard(''); }} style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 800, borderRadius: 4, border: 'none', cursor: 'pointer',
            background: !selectedConstit ? navy : '#f1f5f9', color: !selectedConstit ? 'white' : '#475569',
          }}>All</button>
        )}
        {constitNames.map(c => {
          const isConstLocked = lockConstituency && lockConstituency !== c;
          if (isConstLocked) return null;
          return (
            <button key={c} onClick={() => { setSelectedConstit(c); setSelectedWard(''); }} style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 800, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: selectedConstit === c ? navy : '#f1f5f9', color: selectedConstit === c ? 'white' : '#475569',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {distCov[c] && <span style={{ color: '#22c55e' }}>✓</span>}
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ConstituencyFilter;
