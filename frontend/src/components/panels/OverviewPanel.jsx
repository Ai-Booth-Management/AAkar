import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = '/api/v1/admin';

const getDistrictForBooth = (boothId) => {
  const lower = String(boothId).toLowerCase();
  if (lower.includes('northwest') || lower.includes('nw')) return 'North West';
  if (lower.includes('northeast') || lower.includes('ne')) return 'North East';
  if (lower.includes('newdelhi') || lower.includes('nd') || lower.includes('40_004')) return 'New Delhi';
  if (lower.includes('central') || lower.includes('c')) return 'Central';
  if (lower.includes('southwest') || lower.includes('sw')) return 'South West';
  if (lower.includes('southeast') || lower.includes('se')) return 'South East';
  if (lower.includes('south') || lower.includes('s')) return 'South';
  if (lower.includes('north') || lower.includes('n')) return 'North';
  if (lower.includes('east') || lower.includes('e')) return 'East';
  if (lower.includes('west') || lower.includes('w')) return 'West';
  if (lower.includes('shahdara') || lower.includes('sh')) return 'Shahdara';
  
  const districts = [
    "North West", "North", "North East", "Shahdara", "East", "West", 
    "Central", "New Delhi", "South West", "South", "South East"
  ];
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  }
  return districts[Math.abs(hash) % districts.length];
};

const OverviewPanel = () => {
  const { currentUser } = useAuth();
  const [overview, setOverview] = useState(null);
  const [booths, setBooths] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const safeJson = async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      };
      const [o, b, r] = await Promise.all([
        fetch(`${API_BASE}/overview`).then(safeJson),
        fetch(`${API_BASE}/booths`).then(safeJson),
        fetch(`${API_BASE}/recommendations`).then(safeJson),
      ]);
      setOverview(o);
      setBooths(b);
      setRecommendations(r);
    } catch (e) {
      console.error(e);
      if (!silent) setError('Failed to load dashboard data. Is the backend running?');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const badge = (level) => {
    const cls = level === 'High' ? 'badge-high' : level === 'Medium' ? 'badge-med' : 'badge-low';
    return <span className={`badge ${cls}`}>{level}</span>;
  };

  const isDM = currentUser?.role?.toUpperCase() === 'DM';
  const dmDistrict = currentUser?.displayName || '';

  const displayBooths = isDM 
    ? booths.filter(b => getDistrictForBooth(b.booth_id) === dmDistrict) 
    : booths;

  const displayRecs = isDM 
    ? recommendations.filter(r => getDistrictForBooth(r.booth_id) === dmDistrict) 
    : recommendations;

  let totalComplaints = 0;
  let openComplaints = 0;
  let resolvedComplaints = 0;
  
  displayBooths.forEach(b => {
    totalComplaints += b.complaint_count || 0;
    openComplaints += b.open_count || 0;
    resolvedComplaints += b.resolved_count || 0;
  });

  const estimatedVoters = overview?.total_booths > 0 && overview?.total_voters
    ? Math.round((overview.total_voters / overview.total_booths) * displayBooths.length)
    : 0;

  const displayOverview = isDM ? {
    total_voters: estimatedVoters,
    total_booths: displayBooths.length,
    total_complaints: totalComplaints,
    total_resolved_complaints: resolvedComplaints,
    total_open_complaints: openComplaints,
    avg_open_ratio: totalComplaints > 0 ? (openComplaints / totalComplaints) : 0
  } : overview;

  const hasComplaints = displayOverview?.total_complaints > 0;
  const resolutionRate = hasComplaints
    ? ((1 - (displayOverview.avg_open_ratio ?? 0)) * 100).toFixed(0)
    : '—';

  return (
    <div className="fade-in">
      {/* ── Stat Cards ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <StatCard label="TOTAL VOTERS" value={displayOverview?.total_voters ?? '—'} />
        <StatCard label="TOTAL BOOTHS" value={displayOverview?.total_booths ?? '—'} />
        <StatCard label="TOTAL COMPLAINTS" value={displayOverview?.total_complaints ?? '—'} />
        <StatCard label="RESOLVED" value={displayOverview?.total_resolved_complaints ?? '—'} />
        <StatCard
          label="OPEN CASES"
          value={displayOverview?.total_open_complaints ?? '—'}
          valueStyle={{ color: 'var(--amber-500)' }}
        />
      </div>

      {/* ── Error Banner ── */}
      {error && <div className="error-msg">{error}</div>}

      {/* ── Loading ── */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          Loading data...
        </div>
      ) : (
        <>
          <div className="grid-2col">
            {/* ── Booth Risk Table ── */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ margin: 0 }}>Booth Risk Analysis</h3>
                <button className="btn" onClick={() => fetchData(false)} style={{ fontSize: 12 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Booth</th>
                    <th>Risk</th>
                    <th>Complaints</th>
                    <th>Open</th>
                    <th>Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {displayBooths.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state" style={{ height: 120 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="7" height="7" rx="1.5" />
                            <rect x="14" y="3" width="7" height="7" rx="1.5" />
                            <rect x="14" y="14" width="7" height="7" rx="1.5" />
                            <rect x="3" y="14" width="7" height="7" rx="1.5" />
                          </svg>
                          <p>No booth data yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayBooths.map(b => (
                      <tr key={b.booth_id}>
                        <td style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Booth {b.booth_id}</td>
                        <td>{badge(b.risk_level)}</td>
                        <td>{b.complaint_count}</td>
                        <td>{b.open_count}</td>
                        <td>{b.resolved_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Right Column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Resolution Rate */}
              <div className="card">
                <h3>Resolution Rate</h3>
                <div className="rate-value">{resolutionRate}{hasComplaints ? '%' : ''}</div>
                <div className="rate-label">complaints resolved</div>
                <div className="progress-bar" style={{ marginTop: 14 }}>
                  <div className="fill" style={{ width: hasComplaints ? `${resolutionRate}%` : '0%' }} />
                </div>
              </div>

              {/* Intelligence Stats */}
              <div className="card card-dark" style={{ flex: 1 }}>
                <h3 style={{ color: 'var(--white)', opacity: 0.9 }}>BOOTH RISK SUMMARY</h3>
                <div className="summary-stats">
                  <div className="summary-row dark-row">
                    <span className="summary-label dark-label">High-Risk Booths</span>
                    <span className="summary-value" style={{ color: 'var(--amber-500)' }}>
                      {String(displayBooths.filter(b => b.risk_level === 'High').length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="summary-row dark-row">
                    <span className="summary-label dark-label">Medium-Risk Booths</span>
                    <span className="summary-value" style={{ color: 'var(--blue-100)' }}>
                      {String(displayBooths.filter(b => b.risk_level === 'Medium').length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="summary-row dark-row">
                    <span className="summary-label dark-label">Low-Risk Booths</span>
                    <span className="summary-value" style={{ color: 'var(--green-500)' }}>
                      {String(displayBooths.filter(b => b.risk_level === 'Low').length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="summary-row dark-row">
                    <span className="summary-label dark-label">Recommendations</span>
                    <span className="summary-value" style={{ color: 'var(--amber-500)' }}>
                      {String(displayRecs.length).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Full-Width Recommendations Section ── */}
          <div className="section-full" style={{ marginTop: 24 }}>
            <div className="card">
              <div className="section-header">
                <div className="section-title-group">
                  <div className="section-icon" style={{ background: 'var(--amber-50)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--amber-500)" strokeWidth="2">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>Booth Recommendations</h3>
                    <p className="section-subtitle">Action items generated by risk analysis</p>
                  </div>
                </div>
                <span className="section-count">{displayRecs.length} active</span>
              </div>

              {displayRecs.length === 0 ? (
                <div className="empty-state" style={{ height: 140 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p>All clear — no action needed</p>
                </div>
              ) : (
                <div className="rec-grid">
                  {displayRecs.map((r, i) => (
                    <div className="rec-card" key={i}>
                      <div className="rec-card-header">
                        <span className="rec-booth">Booth {r.booth_id}</span>
                        {badge(r.risk_level)}
                      </div>
                      <p className="rec-text">{r.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ── Stat Card Helper ── */
function StatCard({ label, value, valueStyle = {} }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="label">{label}</p>
        <p className="value" style={valueStyle}>{value}</p>
      </div>
    </div>
  );
}

export default OverviewPanel;
