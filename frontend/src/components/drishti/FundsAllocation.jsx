import React from 'react';

const formatCurrency = (value) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
};

const FundsAllocation = ({ deptStats, totalAllocated, totalUtilized }) => {
  const overallRatio = totalAllocated > 0 ? ((totalUtilized / totalAllocated) * 100).toFixed(0) : 0;

  return (
    <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
      {/* ── Left Side: Department Breakdown Table ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ margin: 0 }}>Departmental Fund Monitoring</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px' }}>Department</th>
              <th style={{ padding: '12px' }}>Allocated</th>
              <th style={{ padding: '12px' }}>Released</th>
              <th style={{ padding: '12px' }}>Utilized</th>
              <th style={{ padding: '12px' }}>Remaining</th>
              <th style={{ padding: '12px' }}>Util. %</th>
            </tr>
          </thead>
          <tbody>
            {deptStats.map(dept => {
              const utilPercent = dept.allocated > 0 ? ((dept.utilized / dept.allocated) * 100).toFixed(0) : 0;
              return (
                <tr key={dept.name} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--gray-900)' }}>{dept.name}</td>
                  <td style={{ padding: '14px 12px', color: 'var(--gray-800)' }}>{formatCurrency(dept.allocated)}</td>
                  <td style={{ padding: '14px 12px', color: 'var(--gray-800)' }}>{formatCurrency(dept.released)}</td>
                  <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--blue-600)' }}>{formatCurrency(dept.utilized)}</td>
                  <td style={{ padding: '14px 12px', color: 'var(--gray-600)' }}>{formatCurrency(dept.remaining)}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: 'var(--gray-200)', borderRadius: 0, overflow: 'hidden' }}>
                        <div style={{ width: `${utilPercent}%`, height: '100%', background: 'var(--blue-500)' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-800)' }}>{utilPercent}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Right Side: Funding Health Summary ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ margin: 0 }}>Utilization Analysis</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800, display: 'block', marginBottom: 4 }}>OVERALL UTILIZATION RATIO</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 10, background: 'var(--gray-200)', borderRadius: 0, overflow: 'hidden' }}>
                <div style={{ width: `${overallRatio}%`, height: '100%', background: 'var(--green-500)' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{overallRatio}%</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 14 }}>
            <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800, display: 'block', marginBottom: 6 }}>DEPT PERFORMANCE FLAG</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deptStats.map(dept => {
                const ratio = dept.allocated > 0 ? (dept.utilized / dept.allocated) : 0;
                let statusText = 'Optimal';
                let badgeCls = 'badge-low';
                if (ratio < 0.3) {
                  statusText = 'Underutilized';
                  badgeCls = 'badge-high';
                } else if (ratio > 0.85) {
                  statusText = 'High Burn';
                  badgeCls = 'badge-med';
                }
                return (
                  <div key={dept.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{dept.name}</span>
                    <span className={`badge ${badgeCls}`} style={{ fontSize: 9 }}>{statusText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundsAllocation;
