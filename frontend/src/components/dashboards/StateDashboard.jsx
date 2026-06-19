import React, { useState, useEffect } from 'react';
import { BarChart3, Globe, Radio, FileText, Zap, Map, TrendingUp } from 'lucide-react';
import HeatmapAnalysis from './HeatmapAnalysis';

export default function StateDashboard({ tab, hierarchy }) {
  const stateName = hierarchy.state || '';
  switch (tab) {
    case 'overview':     return <StateOverview state={stateName} />;
    case 'performance':  return <PerformanceAnalytics />;
    case 'rankings':     return <DistrictRankings />;
    case 'heatmap':      return <HeatmapAnalysis level="STATE" hierarchy={hierarchy} />;
    case 'ai-suggestions': return null;
    case 'broadcast':    return <BroadcastPanel hierarchy={hierarchy} />;
    case 'reports':      return <ReportsPanel />;
    default:             return <StateOverview state={stateName} />;
  }
}

function StateOverview({ state }) {
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">State Control: {state}</div>
          <div className="dash-page-subtitle">Full State Monitoring — All Districts Active</div>
        </div>
        <div className="dash-action-row">
          <span className="pill pill-live">Live Telemetry</span>
          <span className="pill pill-blue">Secured Feed</span>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat">
          <div className="ds-value">0</div>
          <div className="ds-label">Districts</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">0</div>
          <div className="ds-label">Constituencies</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">0</div>
          <div className="ds-label">Booths</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">0</div>
          <div className="ds-label">Volunteers</div>
        </div>
        <div className="dash-stat-dark">
          <div className="ds-value">0%</div>
          <div className="ds-label">Avg BOSI Score</div>
        </div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head">
            <h3>District-wise Coverage Saturation</h3>
            <span className="pill pill-live">Live</span>
          </div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No district data available</div>
          </div>
        </div>

        <div className="dash-section-dark">
          <div className="dash-section-head">
            <h3>State BOSI Index</h3>
          </div>
          <div className="dash-section-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: 'var(--amber-500)', letterSpacing: '-2px', lineHeight: 1 }}>0</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--blue-100)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>/ 100 STRENGTH INDEX</div>
            <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 11, color: 'var(--blue-100)', fontWeight: 600 }}>No data available</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Top Issues Across State</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No issues reported</div>
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-head"><h3>Month-on-Month Trend</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No trend data available</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceAnalytics() {
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Performance Analytics</div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>District-wise Performance Matrix</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>District</th>
                <th>BOSI</th>
                <th>Org. Strength</th>
                <th>Activity %</th>
                <th>Volunteer Density</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No performance data available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DistrictRankings() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">District Rankings</div></div>
      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Top Performing Districts</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No ranking data available</div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head" style={{ background: 'var(--red-50)', borderBottom: '1px solid var(--red-100)' }}>
            <h3 style={{ color: 'var(--red-500)' }}>Weak Districts — Intervention Required</h3>
          </div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No intervention data available</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueHeatmap() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Issue Heatmap — State Level</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Issue Distribution by Severity</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Issue Category</th><th>High Volume Districts</th><th>Med Volume Districts</th><th>Total Impacted Booths</th></tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No issue data available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AIAlerts() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">AI Strategy Alerts</div></div>
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No AI alerts at this time</div>
    </div>
  );
}

function BroadcastPanel({ hierarchy }) {
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
          target_type: 'STATE',
          target_id: hierarchy.state_id || hierarchy.state
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
      <div className="dash-page-header"><div className="dash-page-title">State Broadcast Channel</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Compose Message — State-wide Broadcast</h3></div>
        <div className="dash-section-body">
          <textarea 
            className="broadcast-area" 
            rows={6} 
            placeholder="Compose your state-wide directive here..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleBroadcast} disabled={loading}>
              {loading ? 'SENDING...' : 'BROADCAST NOW'}
            </button>
            <button className="btn">SCHEDULE</button>
            <button className="btn">SAVE DRAFT</button>
          </div>
        </div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Recent Broadcasts</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Message</th><th>Target</th><th>Sent</th><th>Level</th></tr></thead>
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

function ReportsPanel() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Final Reports & Export</div></div>
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No reports available</div>
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
