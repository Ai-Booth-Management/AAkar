import React, { useState, useEffect } from 'react';
import { BarChart3, Globe, Radio, FileText, Zap, Map, TrendingUp } from 'lucide-react';
import HeatmapAnalysis from './HeatmapAnalysis';
import BroadcastPanel from '../shared/BroadcastPanel';
import ManageUsers from '../shared/ManageUsers';
import Hub from '../shared/Hub';
import dynamic from 'next/dynamic';

const CampaignPanel = dynamic(() => import('../CampaignPanel'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Loading Campaign Engine...</span>
      </div>
    </div>
  )
});

export default function StateDashboard({ tab, hierarchy }) {
  const stateName = hierarchy.state || '';
  switch (tab) {
    case 'overview':     return <StateOverview state={stateName} />;
    case 'performance':  return <PerformanceAnalytics />;
    case 'rankings':     return <DistrictRankings />;
    case 'heatmap':      return <HeatmapAnalysis level="STATE" hierarchy={hierarchy} />;
    case 'campaign':     return <CampaignPanel />;
    case 'ai-suggestions': return null;
    case 'hub':          return <Hub hierarchy={hierarchy} userRole="STATE_ADMIN" />;
    case 'manage-users': return <ManageUsers role="STATE_ADMIN" hierarchy={hierarchy} />;
    case 'broadcast':    return <BroadcastPanel hierarchy={hierarchy} />;
    case 'reports':      return <ReportsPanel />;
    default:             return <StateOverview state={stateName} />;
  }
}

function StateOverview({ state }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!state) return;
    fetch(`/api/v1/dashboard/stats?level=state&code=${state}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setStats).catch(() => {});
  }, [state]);

  const d = stats || { districts: 0, constituencies: 0, booths: 0, volunteers: 0 };

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
          <div className="ds-value">{d.districts}</div>
          <div className="ds-label">Districts</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">{d.constituencies}</div>
          <div className="ds-label">Constituencies</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">{d.booths}</div>
          <div className="ds-label">Booths</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">{d.volunteers}</div>
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
