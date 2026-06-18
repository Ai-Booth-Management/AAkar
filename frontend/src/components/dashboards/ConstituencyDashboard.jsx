"use client";
import React, { useState } from 'react';
import HeatmapAnalysis from './HeatmapAnalysis';

export default function ConstituencyDashboard({ tab, hierarchy }) {
  const lc = hierarchy.constituency || 'LC-01';
  const [activeTab, setActiveTab] = useState(tab || 'overview');
  
  // Use local state if tab prop changes
  React.useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':         return <ConstituencyOverview lc={lc} onSchedule={() => setActiveTab('campaigns')} />;
      case 'booths':           return <BoothRankings />;
      case 'health':           return <BoothHealth />;
      case 'heatmap':          return <HeatmapAnalysis level="CONSTITUENCY" hierarchy={hierarchy} />;
      case 'campaigns':        return <CampaignTracker />;
      case 'ai-suggestions':   return <AIRecommendations />;
      default:                 return <ConstituencyOverview lc={lc} onSchedule={() => setActiveTab('campaigns')} />;
    }
  };

  return renderContent();
}

function ConstituencyOverview({ lc, onSchedule }) {
  return (
    <div className="fade-in">
      <div className="dash-banner">
        <div>
          <div className="dash-banner-title">{lc} — Strategic Command</div>
          <div className="dash-banner-sub">Constituency Management &amp; Booth Optimization</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={onSchedule}>SCHEDULE CAMPAIGN</button>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: 'var(--white)' }}>BROADCAST</button>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">184/210</div><div className="ds-label">Active Booths</div></div>
        <div className="dash-stat"><div className="ds-value">1,120</div><div className="ds-label">Volunteers</div></div>
        <div className="dash-stat"><div className="ds-value">92%</div><div className="ds-label">Coverage</div></div>
        <div className="dash-stat"><div className="ds-value">6</div><div className="ds-label">Mandal Nodes</div></div>
      </div>

      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Campaign Progress</h3></div>
          <div className="dash-section-body">
            <ProgressRow label="Door-to-Door Drive" pct={45} color="green" />
            <ProgressRow label="Volunteer Meet" pct={100} color="green" />
            <ProgressRow label="Youth Outreach" pct={40} color="" />
            <ProgressRow label="Key Leader Visits" pct={70} color="green" />
            <ProgressRow label="Leaflet Distribution" pct={62} color="" />
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Top Concern</h3></div>
          <div className="dash-section-body">
            <div className="alert-card alert-card-warn" style={{ marginBottom: 0 }}>
              <div className="alert-card-title">Irrigation Supply</div>
              <div className="alert-card-desc">Reported across 142 booths (68% of constituency area). Agricultural community meetings recommended.</div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="summary-row"><span className="summary-label">Open Complaints</span><span className="summary-value">284</span></div>
              <div className="summary-row"><span className="summary-label">Resolved This Week</span><span className="summary-value" style={{ color: 'var(--green-500)' }}>198</span></div>
              <div className="summary-row"><span className="summary-label">Avg Resolution Time</span><span className="summary-value">2.4 days</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoothRankings() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Booth Rankings</div></div>
      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-head" style={{ background: 'var(--green-50)', borderBottom: '1px solid var(--green-100)' }}>
            <h3 style={{ color: 'var(--green-500)' }}>Top Performing Booths</h3>
          </div>
          <div className="dash-section-body">
            {[['B100', 94], ['B102', 91], ['B108', 88], ['B116', 86], ['B121', 84]].map(([id, score], i) => (
              <div key={id} className="rank-row">
                <span className="rank-num">#{i + 1}</span>
                <span className="rank-name">{id}</span>
                <div style={{ flex: 2, height: 4, background: 'var(--gray-100)', margin: '0 12px' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: 'var(--green-500)' }} />
                </div>
                <span className="rank-score">{score}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head" style={{ background: 'var(--red-50)', borderBottom: '1px solid var(--red-100)' }}>
            <h3 style={{ color: 'var(--red-500)' }}>Critical Intervention Booths</h3>
          </div>
          <div className="dash-section-body">
            {[['B140', 22], ['B143', 31], ['B149', 38], ['B155', 41], ['B162', 44]].map(([id, score], i) => (
              <div key={id} className="rank-row">
                <span className="rank-num" style={{ color: 'var(--red-500)', fontWeight: 900 }}>!</span>
                <span className="rank-name">{id}</span>
                <div style={{ flex: 2, height: 4, background: 'var(--gray-100)', margin: '0 12px' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: 'var(--red-500)' }} />
                </div>
                <span className="rank-score" style={{ color: 'var(--red-500)' }}>{score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BoothHealth() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Booth Health Scores</div></div>
      <div className="dash-grid-3">
        {[['Organizational Strength', 84, 'green'], ['Volunteer Activity', 62, 'amber'], ['Digital Coverage', 91, 'green'], ['Voter Engagement', 70, ''], ['Issue Response Rate', 77, ''], ['Youth Participation', 48, 'red']].map(([label, score, color]) => (
          <div key={label} className="dash-section" style={{ marginBottom: 0 }}>
            <div className="dash-section-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: color === 'green' ? 'var(--green-500)' : color === 'red' ? 'var(--red-500)' : color === 'amber' ? 'var(--amber-500)' : 'var(--gray-900)', letterSpacing: '-1px' }}>{score}%</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>{label}</div>
              <div className="progress-bar" style={{ marginTop: 12 }}>
                <div className="fill" style={{ width: `${score}%`, background: color === 'green' ? 'var(--green-500)' : color === 'red' ? 'var(--red-500)' : 'var(--amber-500)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConcernMap() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Concern Map</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Geographic Grievance Distribution — LC-01</h3></div>
        <div className="dash-section-body">
          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 16 }}>
              {[62, 45, 88, 34, 71, 55, 92, 28, 60, 84, 41, 77, 53, 69, 38, 80, 47, 91, 22, 66, 75, 44, 58, 82].map((v, i) => (
                <div key={i} title={`Booth Zone ${i+1}: ${v}% concern density`} style={{ height: 36, background: v > 70 ? 'var(--red-500)' : v > 50 ? 'var(--amber-500)' : 'var(--blue-50)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, cursor: 'pointer', color: v > 50 ? 'white' : 'var(--gray-500)' }}>{v}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <Legend color="var(--red-500)" label="High (70%+)" />
              <Legend color="var(--amber-500)" label="Medium (50–70%)" />
              <Legend color="var(--blue-50)" label="Low (below 50%)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignTracker() {
  const [showForm, setShowForm] = useState(false);
  const [campaigns, setCampaigns] = useState([
    { id: 1, title: 'Cluster Rally: Zone 1', zone: 'North Sector', date: 'Dec 21, 2026', rsvps: 842, status: 'On Track' },
    { id: 2, title: 'Youth Outreach: Zone 2', zone: 'Central', date: 'Dec 24, 2026', rsvps: 320, status: 'Confirmed' },
    { id: 3, title: 'Door-to-Door Drive', zone: 'All Mandals', date: 'Ongoing', rsvps: '—', status: 'Active' },
    { id: 4, title: 'Key Leader Coalition Meet', zone: 'Sector Hub', date: 'Dec 26, 2026', rsvps: 45, status: 'Planned' },
  ]);

  const [newCampaign, setNewCampaign] = useState({ title: '', zone: '', date: '', goal: '' });

  const handleSchedule = (e) => {
    e.preventDefault();
    if (!newCampaign.title) return;
    setCampaigns([{ 
      id: Date.now(), 
      ...newCampaign, 
      rsvps: 0, 
      status: 'Planned' 
    }, ...campaigns]);
    setShowForm(false);
    setNewCampaign({ title: '', zone: '', date: '', goal: '' });
  };

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Campaign Tracker</div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'CANCEL' : 'SCHEDULE NEW'}
        </button>
      </div>

      {showForm && (
        <div className="dash-section fade-in" style={{ border: '2px solid var(--blue-500)', background: 'var(--blue-50)' }}>
          <div className="dash-section-head"><h3>Schedule New Campaign</h3></div>
          <div className="dash-section-body">
            <form onSubmit={handleSchedule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Campaign Title</label>
                <input type="text" className="broadcast-area" style={{ padding: 12 }} placeholder="e.g. Farmers Meet" value={newCampaign.title} onChange={e => setNewCampaign({...newCampaign, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Sector / Zone</label>
                <input type="text" className="broadcast-area" style={{ padding: 12 }} placeholder="e.g. Block B" value={newCampaign.zone} onChange={e => setNewCampaign({...newCampaign, zone: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Target Date</label>
                <input type="date" className="broadcast-area" style={{ padding: 12 }} value={newCampaign.date} onChange={e => setNewCampaign({...newCampaign, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Primary Goal</label>
                <input type="text" className="broadcast-area" style={{ padding: 12 }} placeholder="e.g. 500 RSVPs" value={newCampaign.goal} onChange={e => setNewCampaign({...newCampaign, goal: e.target.value})} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>CONFIRM AND SCHEDULE</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dash-section">
        <div className="dash-section-head"><h3>Active &amp; Scheduled Campaigns</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Campaign</th><th>Zone</th><th>Date</th><th>RSVPs</th><th>Status</th></tr></thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.title}</td>
                  <td>{c.zone}</td>
                  <td>{c.date}</td>
                  <td>{c.rsvps}</td>
                  <td>
                    <span className={`badge ${c.status === 'Active' ? 'badge-low' : c.status === 'Confirmed' ? 'badge-med' : 'badge-high'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AIRecommendations() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">AI Recommendations</div></div>
      <div className="alert-card alert-card-info">
        <div className="alert-card-title">Increase Activity in Booth 145</div>
        <div className="alert-card-desc">Volunteer activity in Booth 145 is 20% below neighboring booths. Deploy 2 additional field workers for 48h to close the gap before the next assessment cycle.</div>
      </div>
      <div className="alert-card alert-card-info">
        <div className="alert-card-title">Youth Outreach — Booth 152</div>
        <div className="alert-card-desc">Data shows 150+ first-time voters in this cluster who have not been contacted. A local sector meeting is recommended this Sunday to maximize engagement.</div>
      </div>
      <div className="alert-card alert-card-warn">
        <div className="alert-card-title">Irrigation Issue Messaging Gap</div>
        <div className="alert-card-desc">68% of booths report irrigation as top concern but no campaign messaging addresses it. Recommend issuing targeted scheme-benefit communication to all 142 affected booths.</div>
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

function Legend({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, background: color }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

