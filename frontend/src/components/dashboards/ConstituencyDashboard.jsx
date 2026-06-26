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
import AICopilot from '../shared/AICopilot';

export default function ConstituencyDashboard({ tab, hierarchy }) {
  const lc = hierarchy.constituency || '';
  const [activeTab, setActiveTab ] = useState(tab || 'overview');
  
  React.useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':         return <ConstituencyOverview lc={lc} hierarchy={hierarchy} />;
      case 'booths':           return <BoothStatusDirectory lc={lc} hierarchy={hierarchy} />;
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
      case 'ai-suggestions':   return <AICopilot hierarchy={hierarchy} />;
      default:                 return <ConstituencyOverview lc={lc} hierarchy={hierarchy} />;
    }
  };

  return renderContent();
}

function ConstituencyOverview({ lc, hierarchy }) {
  const [stats, setStats] = useState(null);
  const [mandals, setMandals] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!lc) return;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    
    Promise.all([
      fetch(`/api/v1/dashboard/stats?level=constituency&code=${lc}`, { headers }).then(r => r.json()),
      fetch(`/api/v1/dashboard/mandals?constituency_code=${lc}`, { headers }).then(r => r.json())
    ]).then(([sData, mData]) => {
      setStats(sData);
      setMandals(mData);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [lc]);

  const d = stats || { booths: 0, volunteers: 0, mandals: 0, coverage_pct: 0, bosi_avg: 0 };

  return (
    <div className="fade-in">
      <div className="dash-banner">
        <div>
          <div className="dash-banner-title">{lc} — Strategic Command</div>
          <div className="dash-banner-sub">Constituency Management &amp; Strategic Oversight</div>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat">
          <div className="ds-value">{d.mandals}</div>
          <div className="ds-label">Mandal Nodes</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">{d.booths}</div>
          <div className="ds-label">Active Booths</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value">{d.coverage_pct}%</div>
          <div className="ds-label">Area Covered</div>
        </div>
        <div className="dash-stat-dark">
          <div className="ds-value">{d.bosi_avg}</div>
          <div className="ds-label">Avg BOSI Score</div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head">
          <h3>Mandal Performance Index</h3>
          <div className="pill pill-live">Regional Activity</div>
        </div>
        <div className="dash-section-body" style={{ padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontWeight: 600 }}>Loading Mandal data...</div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Mandal Name</th>
                  <th>Incharge</th>
                  <th>% Area Covered</th>
                  <th>Volunteers</th>
                  <th>BOSI Score</th>
                </tr>
              </thead>
              <tbody>
                {mandals.map(m => (
                  <tr key={m.code}>
                    <td style={{ fontWeight: 700 }}>{m.name}</td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{m.incharge}</td>
                    <td>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                         <div className="progress-track" style={{ width: 60, height: 6 }}>
                           <div className="progress-fill" style={{ width: `${m.coverage_pct}%`, height: '100%' }} />
                         </div>
                         <span style={{ fontSize: 11, fontWeight: 700 }}>{m.coverage_pct}%</span>
                       </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{m.volunteers}</td>
                    <td>
                      <span className={`pill ${m.score > 70 ? 'pill-live' : m.score > 40 ? 'pill-blue' : 'pill-red'}`}>
                        {m.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

function BoothStatusDirectory({ lc }) {
  const [boothData, setBoothData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMandal, setExpandedMandal] = useState(null);

  React.useEffect(() => {
    if (!lc) return;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    fetch(`/api/v1/dashboard/constituency/booths?constituency_code=${lc}`, { headers })
      .then(r => r.json())
      .then(setBoothData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [lc]);

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Booth Status Directory</div>
      </div>

      <div className="dash-section" style={{ marginTop: 24 }}>
        <div className="dash-section-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 80, textAlign: 'center', color: 'var(--gray-400)', fontWeight: 600 }}>Processing booth performance analytics...</div>
          ) : (
            <div className="booth-directory">
              {boothData.map(mb => (
                <div key={mb.mandal_code} className="mandal-group" style={{ 
                  borderBottom: '1px solid var(--navy-800)',
                  background: expandedMandal === mb.mandal_code ? 'var(--navy-900)' : 'transparent'
                }}>
                  <div 
                    className="mandal-header"
                    onClick={() => setExpandedMandal(expandedMandal === mb.mandal_code ? null : mb.mandal_code)}
                    style={{ 
                      padding: '24px 32px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ 
                        fontSize: 18, 
                        fontWeight: 900, 
                        color: expandedMandal === mb.mandal_code ? 'var(--white)' : 'var(--navy-900)', 
                        letterSpacing: '-0.02em' 
                      }}>{mb.mandal_name}</div>
                      <div style={{ 
                        fontSize: 11, 
                        color: expandedMandal === mb.mandal_code ? 'var(--amber-400)' : 'var(--amber-600)', 
                        fontWeight: 800, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em' 
                      }}>
                        {mb.booths.length} Integrated Booths
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                      <div className="perf-summary" style={{ display: 'flex', gap: 24 }}>
                         <div style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: 9, fontWeight: 800, color: expandedMandal === mb.mandal_code ? 'var(--gray-200)' : 'var(--gray-500)', textTransform: 'uppercase' }}>Reliability</div>
                           <div style={{ fontSize: 18, fontWeight: 900, color: expandedMandal === mb.mandal_code ? 'var(--white)' : 'var(--blue-500)' }}>
                             {(mb.booths.reduce((acc, b) => acc + b.score, 0) / (mb.booths.length || 1)).toFixed(1)}
                           </div>
                         </div>
                      </div>
                      <div className="arrow" style={{ 
                        color: expandedMandal === mb.mandal_code ? 'var(--white)' : 'var(--navy-900)',
                        opacity: 0.5,
                        transform: expandedMandal === mb.mandal_code ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.4s ease'
                      }}>▼</div>
                    </div>
                  </div>

                  {expandedMandal === mb.mandal_code && (
                    <div className="mandal-content fade-in" style={{ padding: '0 32px 32px 32px' }}>
                      <table className="dash-table table-professional">
                        <thead>
                          <tr style={{ color: 'var(--gray-300)', textTransform: 'uppercase', fontSize: 10 }}>
                            <th style={{ color: 'inherit' }}>Booth Identifier</th>
                            <th style={{ textAlign: 'right', color: 'inherit' }}>Total Voters</th>
                            <th style={{ textAlign: 'right', color: 'inherit' }}>Households</th>
                            <th style={{ color: 'inherit' }}>Demographic Breakdown</th>
                            <th style={{ color: 'inherit' }}>Ground Coverage</th>
                            <th style={{ color: 'inherit' }}>BOSI Index</th>
                            <th style={{ textAlign: 'center', color: 'inherit' }}>Staffing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mb.booths.map(b => (
                            <tr key={b.code}>
                              <td style={{ fontWeight: 800, color: 'var(--amber-400)' }}>{b.name}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>{b.voters.toLocaleString()}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{b.households.toLocaleString()}</td>
                              <td>
                                <div style={{ fontSize: 11, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                                  <div style={{ color: 'var(--blue-400)' }}><span style={{ opacity: 0.6 }}>Male:</span> {b.male}</div>
                                  <div style={{ color: 'var(--blue-400)' }}><span style={{ opacity: 0.6 }}>Female:</span> {b.female}</div>
                                  <div style={{ color: 'var(--amber-500)' }}><span style={{ opacity: 0.6 }}>Youth:</span> {b.youth}</div>
                                  <div style={{ color: 'var(--amber-500)' }}><span style={{ opacity: 0.6 }}>Seniors:</span> {b.seniors}</div>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div className="prog-track" style={{ width: 60, height: 5, background: 'var(--navy-700)', borderRadius: 2 }}>
                                    <div className="prog-fill" style={{ width: `${b.coverage_pct}%`, height: '100%', background: 'var(--blue-500)', borderRadius: 2 }} />
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 900 }}>{b.coverage_pct}%</span>
                                </div>
                              </td>
                              <td>
                                <span className={`pill ${b.score > 70 ? 'pill-live' : b.score > 40 ? 'pill-blue' : 'pill-red'}`} style={{ fontWeight: 800 }}>
                                  {b.score}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--blue-400)', fontSize: 16 }}>{b.volunteers}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
