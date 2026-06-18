import React, { useState, useEffect } from 'react';
import HeatmapAnalysis from './HeatmapAnalysis';

export default function DistrictDashboard({ tab, hierarchy }) {
  const district = hierarchy.district || 'LUCKNOW';
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
        <div className="dash-stat"><div className="ds-value">9</div><div className="ds-label">Constituencies</div></div>
        <div className="dash-stat"><div className="ds-value">42</div><div className="ds-label">Mandals</div></div>
        <div className="dash-stat"><div className="ds-value">2,410</div><div className="ds-label">Booths</div></div>
        <div className="dash-stat"><div className="ds-value">12,403</div><div className="ds-label">Volunteers</div></div>
        <div className="dash-stat-dark"><div className="ds-value">88%</div><div className="ds-label">BOSI Index</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Constituency Coverage Saturation</h3></div>
          <div className="dash-section-body">
            {[['LC-Cantt', 95, 'green'], ['LC-Central', 84, 'green'], ['LC-East', 72, ''], ['LC-North', 61, 'amber'], ['LC-West', 44, 'red']].map(([name, pct, color]) => (
              <ProgressRow key={name} label={name} pct={pct} color={color} />
            ))}
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>District Summary</h3></div>
          <div className="dash-section-body">
            <div className="summary-row"><span className="summary-label">Active Booths</span><span className="summary-value">2,198 / 2,410</span></div>
            <div className="summary-row"><span className="summary-label">Available Volunteers</span><span className="summary-value">10,840</span></div>
            <div className="summary-row"><span className="summary-label">Issues Logged</span><span className="summary-value">1,204</span></div>
            <div className="summary-row"><span className="summary-label">Resolved</span><span className="summary-value" style={{ color: 'var(--green-500)' }}>986 (82%)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConstituencyStats() {
  const data = [
    { name: 'LC-Cantt', bosi: 92, activity: 88, volunteers: 1400 },
    { name: 'LC-Central', bosi: 86, activity: 82, volunteers: 1220 },
    { name: 'LC-East', bosi: 78, activity: 74, volunteers: 980 },
    { name: 'LC-North', bosi: 65, activity: 61, volunteers: 840 },
    { name: 'LC-West', bosi: 54, activity: 48, volunteers: 660 },
    { name: 'LC-South', bosi: 88, activity: 90, volunteers: 1100 },
  ];
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
              {data.map((d, i) => (
                <tr key={d.name}>
                  <td style={{ fontWeight: 700 }}>{d.name}</td>
                  <td><span className={`badge ${d.bosi >= 80 ? 'badge-low' : d.bosi >= 65 ? 'badge-med' : 'badge-high'}`}>{d.bosi}%</span></td>
                  <td>{d.activity}%</td>
                  <td>{d.volunteers.toLocaleString()}</td>
                  <td style={{ fontWeight: 900, color: 'var(--gray-400)', fontSize: 16 }}>#{i + 1}</td>
                </tr>
              ))}
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
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue-100)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>GIS Coverage Grid — District {'{'}Lucknow{'}'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4, width: '100%' }}>
              {[95,88,72,82,64,90,55,78,84,88,92,60,74,88,42,91,80,68,76,85,58,66,90,80,72,88,94].map((v, i) => (
                <div key={i} title={`Constituency Sector ${i+1}: ${v}%`} style={{ height: 40, background: v >= 80 ? 'var(--green-500)' : v >= 60 ? 'var(--amber-500)' : 'var(--red-500)', opacity: 0.7 + (v / 300), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white' }}>{v}%</div>
              ))}
            </div>
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
            <div className="issue-row"><span className="issue-name">Water Crisis (Zone 4)</span><span className="issue-vol issue-vol-high">High</span><span className="badge badge-high">Critical</span></div>
            <div className="issue-row"><span className="issue-name">Sewerage — Central Ward</span><span className="issue-vol issue-vol-high">High</span><span className="badge badge-high">Critical</span></div>
            <div className="issue-row"><span className="issue-name">Street Lighting — North</span><span className="issue-vol issue-vol-med">Moderate</span><span className="badge badge-med">Active</span></div>
            <div className="issue-row"><span className="issue-name">Unemployment — South</span><span className="issue-vol issue-vol-med">Moderate</span><span className="badge badge-med">Active</span></div>
            <div className="issue-row"><span className="issue-name">Electricity Fluctuation</span><span className="issue-vol">Low</span><span className="badge badge-low">Stable</span></div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Constituency Hotspot Count</h3></div>
          <div className="dash-section-body">
            {[['LC-01', 48], ['LC-02', 32], ['LC-03', 21], ['LC-04', 61], ['LC-05', 14]].map(([lc, count]) => (
              <ProgressRow key={lc} label={lc} pct={Math.min(count, 100)} color={count > 50 ? 'red' : count > 30 ? 'amber' : 'green'} />
            ))}
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
        <div className="dash-stat"><div className="ds-value">12,403</div><div className="ds-label">Total Enrolled</div></div>
        <div className="dash-stat"><div className="ds-value">10,840</div><div className="ds-label">Active Today</div><div className="ds-delta ds-delta-up">+340 vs yesterday</div></div>
        <div className="dash-stat"><div className="ds-value">87.4%</div><div className="ds-label">Check-in Rate</div></div>
        <div className="dash-stat-dark"><div className="ds-value">1.8/booth</div><div className="ds-label">District Density</div></div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Constituency-wise Volunteer Density</h3></div>
        <div className="dash-section-body">
          {[['LC-Cantt', 1400, 89], ['LC-Central', 1220, 80], ['LC-East', 980, 64], ['LC-North', 840, 52], ['LC-West', 660, 43], ['LC-South', 1100, 72]].map(([name, count, pct]) => (
            <ProgressRow key={name} label={`${name} — ${count.toLocaleString()} vols`} pct={pct} color={pct >= 70 ? 'green' : pct >= 50 ? 'amber' : 'red'} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EarlyWarning() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Early Warning System</div></div>
      <div className="alert-card">
        <div className="alert-card-title">Low Activity — Constituency LC-04</div>
        <div className="alert-card-desc">Activity dropped below 40% threshold for 3 consecutive days. Field team responsiveness at 28% of required pace. Recommend immediate mandal meeting and supervisor deployment.</div>
      </div>
      <div className="alert-card alert-card-warn">
        <div className="alert-card-title">BOSI Decline — North Mandal</div>
        <div className="alert-card-desc">Booth strength showing 12% loyalty attrition among 18–25 age group. Social media sentiment analysis indicates messaging gap on education issues.</div>
      </div>
      <div className="alert-card alert-card-warn">
        <div className="alert-card-title">Sentiment Shift — Urban Clusters</div>
        <div className="alert-card-desc">Unexpected rise in domestic gas price mentions across all urban booths. Engagement on this issue recommended to pre-empt opposition messaging.</div>
      </div>
      <div className="alert-card alert-card-info">
        <div className="alert-card-title">Opportunity — LC-Cantt Youth Cluster</div>
        <div className="alert-card-desc">First-time voter registration drive in LC-Cantt generated 1,240 new entries. Recommend immediate personalized outreach to all registered youth.</div>
      </div>
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
