import React, { useState, useEffect } from 'react';
import HeatmapAnalysis from './HeatmapAnalysis';

export default function DistrictDashboard({ tab, hierarchy }) {
  const district = hierarchy.district || '';
  switch (tab) {
    case 'overview':      return <DistrictOverview district={district} />;
    case 'constituencies': return <ConstituencyStats />;
    case 'heatmap':       return <HeatmapAnalysis level="DISTRICT" hierarchy={hierarchy} />;
    case 'coverage':      return <HeatmapAnalysis level="DISTRICT" hierarchy={hierarchy} />;
    case 'issues':        return <LocalIssues />;
    case 'volunteers':    return <VolunteerAnalytics />;
    case 'ai-suggestions': return null;
    case 'early_warning': return <EarlyWarning />;
    case 'broadcast':     return <DistrictBroadcast hierarchy={hierarchy} />;
    default:              return <DistrictOverview district={district} />;
  }
}

function DistrictOverview({ district }) {
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Intelligence Node: {district}</div>
          <div className="dash-page-subtitle">District-level Telemetry &amp; Field Operations</div>
        </div>
        <span className="pill pill-live">Live Feed</span>
      </div>

      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Constituencies</div></div>
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Mandals</div></div>
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Booths</div></div>
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Volunteers</div></div>
        <div className="dash-stat-dark"><div className="ds-value">0%</div><div className="ds-label">BOSI Index</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Constituency Coverage Saturation</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No constituency data available</div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>District Summary</h3></div>
          <div className="dash-section-body">
            <div className="summary-row"><span className="summary-label">Active Booths</span><span className="summary-value">0</span></div>
            <div className="summary-row"><span className="summary-label">Available Volunteers</span><span className="summary-value">0</span></div>
            <div className="summary-row"><span className="summary-label">Issues Logged</span><span className="summary-value">0</span></div>
            <div className="summary-row"><span className="summary-label">Resolved</span><span className="summary-value" style={{ color: 'var(--green-500)' }}>0 (0%)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConstituencyStats() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Constituency Performance</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>All Constituencies — District View</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Constituency</th><th>BOSI Score</th><th>Activity Rate</th><th>Volunteers</th><th>Rank</th></tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No constituency data available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CoverageMap() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Coverage Map</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Geographic Coverage Matrix</h3></div>
        <div className="dash-section-body">
          <div style={{ background: 'var(--blue-600)', padding: 32, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue-100)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>GIS Coverage Grid</div>
            <div style={{ textAlign: 'center', color: 'var(--blue-200)', fontSize: 12, fontWeight: 600 }}>No coverage data available</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <MapLegend color="var(--green-500)" label="80%+ Coverage" />
              <MapLegend color="var(--amber-500)" label="60–80%" />
              <MapLegend color="var(--red-500)" label="Below 60%" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalIssues() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Local Issues — District View</div></div>
      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Top Issues by Volume</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No issues reported</div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Constituency Hotspot Count</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No hotspot data available</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VolunteerAnalytics() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Volunteer Analytics</div></div>
      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Total Enrolled</div></div>
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Active Today</div></div>
        <div className="dash-stat"><div className="ds-value">0%</div><div className="ds-label">Check-in Rate</div></div>
        <div className="dash-stat-dark"><div className="ds-value">0</div><div className="ds-label">District Density</div></div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Constituency-wise Volunteer Density</h3></div>
        <div className="dash-section-body">
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No volunteer data available</div>
        </div>
      </div>
    </div>
  );
}

function EarlyWarning() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Early Warning System</div></div>
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No early warnings at this time</div>
    </div>
  );
}

function DistrictBroadcast({ hierarchy }) {
  const [message, setMessage] = useState('');
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBroadcasts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/broadcasts/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setBroadcasts(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchBroadcasts(); }, []);

  const handleBroadcast = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/broadcasts/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          target_type: 'DISTRICT',
          target_id: hierarchy.district_id || hierarchy.district
        })
      });
      if (res.ok) {
        setMessage('');
        fetchBroadcasts();
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">District Broadcast</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Compose — Reaches all Constituencies & Volunteers</h3></div>
        <div className="dash-section-body">
          <textarea 
            className="broadcast-area" 
            rows={5} 
            placeholder="Compose your district directive here..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleBroadcast} disabled={loading}>
              {loading ? 'SENDING...' : 'BROADCAST'}
            </button>
            <button className="btn">SCHEDULE</button>
          </div>
        </div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Recent Broadcasts</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Message</th><th>Target</th><th>Sent</th><th>From</th></tr></thead>
            <tbody>
              {broadcasts.length > 0 ? broadcasts.map((b, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>"{b.message}"</td>
                  <td>{b.target_type === 'GLOBAL' ? 'Global' : b.target_id}</td>
                  <td>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td><span className="badge badge-low">{b.sender_role}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>No broadcasts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, pct, color }) {
  const fillClass = color === 'green' ? 'progress-fill-green' : color === 'red' ? 'progress-fill-red' : color === 'amber' ? 'progress-fill-amber' : 'progress-fill';
  return (
    <div className="progress-row">
      <span className="progress-label">{label}</span>
      <div className="progress-track"><div className={`progress-fill ${fillClass}`} style={{ width: `${pct}%` }} /></div>
      <span className="progress-pct">{pct}%</span>
    </div>
  );
}

function MapLegend({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 12, height: 12, background: color }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue-100)', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}
