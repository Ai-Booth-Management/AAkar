"use client";
import React, { useState } from 'react';
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

const BOSIDashboard = dynamic(() => import('./BOSIDashboard'), { ssr: false });
const ReadinessDashboard = dynamic(() => import('./ReadinessDashboard'), { ssr: false });
const TurnoutDashboard = dynamic(() => import('./TurnoutDashboard'), { ssr: false });
const WhatsAppOS = dynamic(() => import('./WhatsAppOS'), { ssr: false });
const RelocatedCampaignTracker = dynamic(() => import('./CampaignTracker'), { ssr: false });

export default function ConstituencyDashboard({ tab, hierarchy }) {
  const lc = hierarchy.constituency || '';
  const [activeTab, setActiveTab] = useState(tab || 'overview');
  
  React.useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':         return <ConstituencyOverview lc={lc} onSchedule={() => setActiveTab('campaign')} />;
      case 'booths':           return <BoothRankings />;
      case 'health':           return <BoothHealth />;
      case 'bosi':             return <BOSIDashboard hierarchy={hierarchy} />;
      case 'readiness':        return <ReadinessDashboard hierarchy={hierarchy} />;
      case 'turnout':          return <TurnoutDashboard hierarchy={hierarchy} />;
      case 'campaigns':
      case 'campaign':         return <CampaignPanel />;
      case 'campaign_tracker': return <RelocatedCampaignTracker hierarchy={hierarchy} />;
      case 'hub':              return <Hub hierarchy={hierarchy} userRole="CONSTITUENCY_MGR" />;
      case 'whatsapp_os':      return <WhatsAppOS hierarchy={hierarchy} />;
      case 'broadcast':        return <BroadcastPanel hierarchy={hierarchy} />;
      case 'manage-users':     return <ManageUsers role="CONSTITUENCY_MGR" hierarchy={hierarchy} />;
      case 'ai-suggestions':   return <AIRecommendations />;
      default:                 return <ConstituencyOverview lc={lc} onSchedule={() => setActiveTab('campaign')} />;
    }
  };

  return renderContent();
}

function ConstituencyOverview({ lc, onSchedule }) {
  const [stats, setStats] = useState(null);
  React.useEffect(() => {
    if (!lc) return;
    fetch(`/api/v1/dashboard/stats?level=constituency&code=${lc}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setStats).catch(() => {});
  }, [lc]);

  const d = stats || { booths: 0, volunteers: 0, mandals: 0 };

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
        <div className="dash-stat"><div className="ds-value">{d.booths}</div><div className="ds-label">Active Booths</div></div>
        <div className="dash-stat"><div className="ds-value">{d.volunteers}</div><div className="ds-label">Volunteers</div></div>
        <div className="dash-stat"><div className="ds-value">0%</div><div className="ds-label">Coverage</div></div>
        <div className="dash-stat"><div className="ds-value">{d.mandals ?? 0}</div><div className="ds-label">Mandal Nodes</div></div>
      </div>

      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Campaign Progress</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No campaign data available</div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Top Concern</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No concerns reported</div>
            <div style={{ marginTop: 16 }}>
              <div className="summary-row"><span className="summary-label">Open Complaints</span><span className="summary-value">0</span></div>
              <div className="summary-row"><span className="summary-label">Resolved This Week</span><span className="summary-value" style={{ color: 'var(--green-500)' }}>0</span></div>
              <div className="summary-row"><span className="summary-label">Avg Resolution Time</span><span className="summary-value">0</span></div>
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
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No booth ranking data available</div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head" style={{ background: 'var(--red-50)', borderBottom: '1px solid var(--red-100)' }}>
            <h3 style={{ color: 'var(--red-500)' }}>Critical Intervention Booths</h3>
          </div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No critical booth data available</div>
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
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600, gridColumn: '1 / -1' }}>No health score data available</div>
      </div>
    </div>
  );
}

function CampaignTracker() {
  const [showForm, setShowForm] = useState(false);
  const [campaigns, setCampaigns] = useState([]);

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
              {campaigns.length > 0 ? campaigns.map(c => (
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
              )) : (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>No campaigns scheduled</td></tr>
              )}
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
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No recommendations at this time</div>
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
