import React, { useState, useEffect } from 'react';
import { BarChart3, Globe, Radio, FileText, Zap, Map, TrendingUp } from 'lucide-react';
import HeatmapAnalysis from './HeatmapAnalysis';

export default function StateDashboard({ tab, hierarchy }) {
  const stateName = hierarchy.state || 'UTTAR PRADESH';
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
          <div className="ds-value">75</div>
          <div className="ds-label">Districts</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">403</div>
          <div className="ds-label">Constituencies</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">1,42,850</div>
          <div className="ds-label">Booths</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">8.2L</div>
          <div className="ds-label">Volunteers</div>
        </div>
        <div className="dash-stat-dark">
          <div className="ds-value">88%</div>
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
            <ProgressRow label="Lucknow" pct={95} color="green" />
            <ProgressRow label="Varanasi" pct={88} color="green" />
            <ProgressRow label="Agra" pct={72} color="" />
            <ProgressRow label="Meerut" pct={61} color="amber" />
            <ProgressRow label="Gorakhpur" pct={44} color="red" />
            <ProgressRow label="Allahabad" pct={78} color="" />
          </div>
        </div>

        <div className="dash-section-dark">
          <div className="dash-section-head">
            <h3>State BOSI Index</h3>
          </div>
          <div className="dash-section-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: 'var(--amber-500)', letterSpacing: '-2px', lineHeight: 1 }}>88</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--blue-100)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>/ 100 STRENGTH INDEX</div>
            <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 11, color: 'var(--blue-100)', fontWeight: 600 }}>Optimal ground strength across 75 districts</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Top Issues Across State</h3></div>
          <div className="dash-section-body">
            <div className="issue-row"><span className="issue-name">Water Supply</span><span className="issue-vol issue-vol-high">High Vol</span><span className="badge badge-high">Critical</span></div>
            <div className="issue-row"><span className="issue-name">Unemployment</span><span className="issue-vol issue-vol-high">High Vol</span><span className="badge badge-high">Critical</span></div>
            <div className="issue-row"><span className="issue-name">Road Conditions</span><span className="issue-vol issue-vol-med">Med Vol</span><span className="badge badge-med">Moderate</span></div>
            <div className="issue-row"><span className="issue-name">Healthcare Access</span><span className="issue-vol issue-vol-med">Med Vol</span><span className="badge badge-med">Moderate</span></div>
            <div className="issue-row"><span className="issue-name">Electricity</span><span className="issue-vol">Low Vol</span><span className="badge badge-low">Stable</span></div>
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-head"><h3>Month-on-Month Trend</h3></div>
          <div className="dash-section-body">
            <div className="summary-row"><span className="summary-label">Volunteer Growth</span><span className="summary-value" style={{ color: 'var(--green-500)' }}>+12%</span></div>
            <div className="summary-row"><span className="summary-label">Booth Coverage</span><span className="summary-value" style={{ color: 'var(--green-500)' }}>+8%</span></div>
            <div className="summary-row"><span className="summary-label">Campaign Completion</span><span className="summary-value">74%</span></div>
            <div className="summary-row"><span className="summary-label">Issue Resolution</span><span className="summary-value" style={{ color: 'var(--green-500)' }}>+18%</span></div>
            <div className="summary-row"><span className="summary-label">Complaint Backlog</span><span className="summary-value" style={{ color: 'var(--red-500)' }}>+3%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceAnalytics() {
  const districts = ['Lucknow', 'Varanasi', 'Agra', 'Meerut', 'Gorakhpur', 'Allahabad', 'Kanpur', 'Bareilly'];
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
              {districts.map((d, i) => (
                <tr key={d}>
                  <td style={{ fontWeight: 700 }}>{d}</td>
                  <td>{90 - i * 4}%</td>
                  <td>{88 - i * 3}%</td>
                  <td>{85 - i * 6}%</td>
                  <td>{(1.4 - i * 0.1).toFixed(1)}/booth</td>
                  <td><span className={`badge ${i < 3 ? 'badge-low' : i < 6 ? 'badge-med' : 'badge-high'}`}>{i < 3 ? 'Strong' : i < 6 ? 'Moderate' : 'At Risk'}</span></td>
                </tr>
              ))}
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
            {['Lucknow', 'Varanasi', 'Agra', 'Mathura', 'Noida'].map((d, i) => (
              <div key={d} className="rank-row">
                <span className="rank-num">#{i + 1}</span>
                <span className="rank-name">{d}</span>
                <span className="rank-score">{94 - i * 2}%</span>
                <span className="badge badge-low" style={{ marginLeft: 8 }}>Strong</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head" style={{ background: 'var(--red-50)', borderBottom: '1px solid var(--red-100)' }}>
            <h3 style={{ color: 'var(--red-500)' }}>Weak Districts — Intervention Required</h3>
          </div>
          <div className="dash-section-body">
            {['Mirzapur', 'Sonbhadra', 'Chitrakoot', 'Ballia', 'Siddharthnagar'].map((d, i) => (
              <div key={d} className="rank-row">
                <span className="rank-num" style={{ color: 'var(--red-500)' }}>!</span>
                <span className="rank-name">{d}</span>
                <span className="rank-score" style={{ color: 'var(--red-500)' }}>{38 + i * 3}%</span>
                <span className="badge badge-high" style={{ marginLeft: 8 }}>Weak</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueHeatmap() {
  const issues = [
    { name: 'Water Supply', high: 22, med: 18, total: 40 },
    { name: 'Unemployment', high: 18, med: 25, total: 43 },
    { name: 'Roads & Infrastructure', high: 12, med: 30, total: 42 },
    { name: 'Healthcare', high: 10, med: 20, total: 30 },
    { name: 'Electricity', high: 8, med: 15, total: 23 },
  ];
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
              {issues.map(issue => (
                <tr key={issue.name}>
                  <td style={{ fontWeight: 700 }}>{issue.name}</td>
                  <td><span className="badge badge-high">{issue.high} Districts</span></td>
                  <td><span className="badge badge-med">{issue.med} Districts</span></td>
                  <td style={{ fontWeight: 800 }}>{issue.total * 120}+ Booths</td>
                </tr>
              ))}
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
      <div className="alert-card">
        <div className="alert-card-title">Volunteer Activity Declining — District Gorakhpur</div>
        <div className="alert-card-desc">Field activity has dropped 28% below monthly average in 14 booths. Recommend deploying 50 additional volunteers from Lucknow reserve pool.</div>
      </div>
      <div className="alert-card alert-card-warn">
        <div className="alert-card-title">Increasing Complaints — District Mirzapur</div>
        <div className="alert-card-desc">Water supply grievances up 42% in last 7 days. Constituency meetings scheduled; escalation to district commissioner recommended.</div>
      </div>
      <div className="alert-card alert-card-warn">
        <div className="alert-card-title">Weak Organizational Growth — Constituency Ballia East</div>
        <div className="alert-card-desc">BOSI below 40% for 3 consecutive weeks. No mandal meetings logged. Immediate oversight required.</div>
      </div>
      <div className="alert-card alert-card-info">
        <div className="alert-card-title">Positive Sentiment Spike — Lucknow Central</div>
        <div className="alert-card-desc">Youth outreach campaign generating 3x expected engagement. Model for replication in Agra and Meerut districts.</div>
      </div>
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
          <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Message reaches all 75 districts, 403 constituencies and 8.2L volunteers</div>
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
      <div className="dash-grid-3">
        {['State Summary Report', 'District Performance Report', 'Issue Resolution Report', 'Volunteer Activity Log', 'BOSI Index Report', 'Campaign Analytics'].map(r => (
          <div key={r} className="dash-section" style={{ marginBottom: 0, cursor: 'pointer' }}>
            <div className="dash-section-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{r}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-400)', marginTop: 4, textTransform: 'uppercase' }}>Updated: Jun 17, 2026</div>
              </div>
              <button className="btn">EXPORT</button>
            </div>
          </div>
        ))}
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
