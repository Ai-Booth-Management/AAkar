import React from 'react';

const formatCurrency = (value) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
};

const DrishtiStats = ({ totalAllocated, totalReleased, totalUtilized, totalRemaining }) => {
  return (
    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <span className="label" style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL ALLOCATED</span>
        <span className="value" style={{ fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>{formatCurrency(totalAllocated)}</span>
      </div>
      <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <span className="label" style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL RELEASED</span>
        <span className="value" style={{ fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>{formatCurrency(totalReleased)}</span>
      </div>
      <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <span className="label" style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL UTILIZED</span>
        <span className="value" style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-600)' }}>{formatCurrency(totalUtilized)}</span>
      </div>
      <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <span className="label" style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL REMAINING</span>
        <span className="value" style={{ fontSize: 24, fontWeight: 900, color: 'var(--amber-500)' }}>{formatCurrency(totalRemaining)}</span>
      </div>
    </div>
  );
};

export default DrishtiStats;
