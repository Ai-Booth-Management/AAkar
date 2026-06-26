import React, { useState, useEffect } from 'react';
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

export default function DistrictDashboard({ tab, hierarchy }) {
  const district = hierarchy.district || '';
  switch (tab) {
    case 'overview':      return <DistrictOverview district={district} />;
    case 'constituencies': return <ConstituencyStats district={district} />;
    case 'campaign':      return <CampaignPanel />;
    case 'issues':        return <LocalIssues />;
    case 'volunteers':    return <VolunteerAnalytics />;
    case 'ai-suggestions': return null;
    case 'hub':           return <Hub hierarchy={hierarchy} userRole="DISTRICT_ADMIN" />;
    case 'manage-users':  return <ManageUsers role="DISTRICT_ADMIN" hierarchy={hierarchy} />;
    case 'early_warning': return <EarlyWarning />;
    case 'broadcast':     return <BroadcastPanel hierarchy={hierarchy} />;
    default:              return <DistrictOverview district={district} />;
  }
}

function DistrictOverview({ district }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!district) return;
    fetch(`/api/v1/dashboard/stats?level=district&code=${district}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setStats).catch(() => {});
  }, [district]);

  const d = stats || { constituencies: 0, mandals: 0, booths: 0, volunteers: 0 };

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
        <div className="dash-stat"><div className="ds-value">{d.constituencies}</div><div className="ds-label">Constituencies</div></div>
        <div className="dash-stat"><div className="ds-value">{d.mandals}</div><div className="ds-label">Mandals</div></div>
        <div className="dash-stat"><div className="ds-value">{d.booths}</div><div className="ds-label">Booths</div></div>
        <div className="dash-stat"><div className="ds-value">{d.volunteers}</div><div className="ds-label">Volunteers</div></div>
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

function ConstituencyStats({ district }) {
  const [constits, setConstits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!district) return;
    setLoading(true);
    fetch(`/api/v1/dashboard/constituencies?district_code=${district}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setConstits(data.constituencies || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [district]);

  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Constituency Performance</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>All Constituencies — District View</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>Loading data...</div>
          ) : (
            <table>
              <thead>
                <tr><th>Constituency</th><th>BOSI Score</th><th>Activity Rate</th><th>Volunteers</th><th>Rank</th></tr>
              </thead>
              <tbody>
                {constits.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No constituency data available</td>
                  </tr>
                ) : (
                  constits.map((c, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{c.constituency}</td>
                      <td>{c.bosi_score}</td>
                      <td>{c.activity_rate}</td>
                      <td>{c.volunteers}</td>
                      <td><span className="badge badge-med">{c.rank}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
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
