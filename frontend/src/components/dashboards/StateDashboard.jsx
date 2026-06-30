import React, { useState, useEffect } from 'react';
import { BarChart3, Globe, Radio, FileText, Zap, TrendingUp, Download, FileSpreadsheet, Users, AlertCircle } from 'lucide-react';
import BroadcastPanel from '../shared/BroadcastPanel';
import ManageUsers from '../shared/ManageUsers';
import Hub from '../shared/Hub';
import VideoCallPanel from '../shared/VideoCallPanel';
import ComplaintsPanel from '../panels/ComplaintsPanel';
import dynamic from 'next/dynamic';

const CampaignPanel = dynamic(() => import('../panels/CampaignPanel'), {
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
    case 'analytics':    return <DistrictAnalytics state={stateName} />;
    case 'campaign':     return <CampaignPanel />;
    case 'complaints':   return <ComplaintsPanel />;
    case 'ai-suggestions': return null;
    case 'hub':          return <Hub hierarchy={hierarchy} userRole="STATE_ADMIN" />;
    case 'video-call':   return <VideoCallPanel hierarchy={hierarchy} userRole="STATE_ADMIN" />;
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
    fetch(`/api/v1/dashboard/stats?level=state&code=${encodeURIComponent(state)}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setStats).catch(() => {});
  }, [state]);

  const d = stats || { districts: 0, constituencies: 0, booths: 0, volunteers: 0, coverage_pct: 0, bosi_avg: 0, complaints: { total: 0, resolved: 0 } };

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
        <div className="dash-stat" style={{ borderLeft: '4px solid var(--blue-500)' }}>
          <div className="ds-value" style={{ color: 'var(--navy-900)' }}>{d.booths}</div>
          <div className="ds-label">Total Booths</div>
        </div>
        <div className="dash-stat" style={{ borderLeft: '4px solid var(--amber-500)' }}>
          <div className="ds-value" style={{ color: 'var(--navy-900)' }}>{d.volunteers}</div>
          <div className="ds-label">Personnel</div>
        </div>
        <div className="dash-stat-dark" style={{ background: 'linear-gradient(135deg, var(--navy-900), var(--navy-800))', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <div className="ds-value" style={{ color: 'var(--amber-500)' }}>{d.bosi_avg}</div>
          <div className="ds-label" style={{ color: 'var(--blue-100)' }}>Avg Strength Index</div>
        </div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head">
            <h3>% Houses Visited</h3>
            <span className="pill pill-live">District Density</span>
          </div>
          <div className="dash-section-body" style={{ padding: '32px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
               <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--navy-800)" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--blue-500)" strokeWidth="3" strokeDasharray={`${d.coverage_pct}, 100`} />
                  </svg>
                  <div style={{ position: 'absolute', fontSize: 24, fontWeight: 900, color: 'var(--navy-900)' }}>{d.coverage_pct}%</div>
               </div>
               <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>State-wide Ground Saturation</div>
             </div>
          </div>
        </div>

        <div className="dash-section-dark" style={{ background: 'var(--navy-900)', borderRadius: 'var(--radius-md)', padding: 20 }}>
          <div className="dash-section-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
            <h3 style={{ color: 'var(--amber-500)', fontSize: 14 }}>State Command Summary</h3>
          </div>
          <div className="dash-section-body">
            <div className="summary-row" style={{ color: 'var(--blue-100)', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="summary-label">Active Districts</span>
              <span className="summary-value" style={{ fontWeight: 800 }}>{d.districts}</span>
            </div>
            <div className="summary-row" style={{ color: 'var(--blue-100)', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="summary-label">Field Volunteers</span>
              <span className="summary-value" style={{ fontWeight: 800 }}>{d.volunteers}</span>
            </div>
            <div className="summary-row" style={{ color: 'var(--blue-100)', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="summary-label">Critical Issues</span>
              <span className="summary-value" style={{ color: '#ef4444', fontWeight: 800 }}>{d.complaints?.critical || 0}</span>
            </div>
            <div className="summary-row" style={{ color: 'var(--blue-100)', padding: '12px 0' }}>
              <span className="summary-label">Resolution Rate</span>
              <span className="summary-value" style={{ color: 'var(--green-500)', fontWeight: 800 }}>
                {d.complaints?.total > 0 ? Math.round((d.complaints.resolved / d.complaints.total) * 100) : 0}%
              </span>
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
          <div className="dash-section-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}>
              <Zap size={18} fill="#dc2626" />
              Critical Districts (Priority 1)
            </h3>
          </div>
          <div className="dash-section-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats?.districts_scores?.filter(d => d.score < 40 || d.coverage_pct < 30).slice(0, 3).map(d => (
                <div key={d.code} style={{ padding: 12, background: 'rgba(220, 38, 38, 0.05)', border: '1px solid rgba(220, 38, 38, 0.1)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, color: 'var(--navy-900)' }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#dc2626' }}>IMMEDIATE INTERVENTION</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', display: 'flex', gap: 12 }}>
                    <span>Coverage: <b style={{ color: d.coverage_pct < 30 ? '#dc2626' : 'inherit' }}>{d.coverage_pct}%</b></span>
                    <span>Strength: <b style={{ color: d.score < 40 ? '#dc2626' : 'inherit' }}>{d.score}</b></span>
                  </div>
                </div>
              ))}
              {(!stats?.districts_scores || stats.districts_scores.filter(d => d.score < 40 || d.coverage_pct < 30).length === 0) && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12 }}>All districts performing above critical thresholds</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DistrictAnalytics({ state }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [districtData, setDistrictData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDistrict, setExpandedDistrict] = useState(null);
  const [constituencyCache, setConstituencyCache] = useState({});
  const [constituencyLoading, setConstituencyLoading] = useState(false);
  
  useEffect(() => {
    if (!state) return;
    setLoading(true);
    fetch(`/api/v1/dashboard/districts?state_code=${encodeURIComponent(state)}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setDistrictData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [state]);

  const toggleDistrict = async (code) => {
    if (expandedDistrict === code) {
      setExpandedDistrict(null);
      return;
    }
    setExpandedDistrict(code);
    if (!constituencyCache[code]) {
      setConstituencyLoading(true);
      try {
        const r = await fetch(`/api/v1/dashboard/district/constituencies?district_code=${encodeURIComponent(code)}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await r.json();
        setConstituencyCache(prev => ({ ...prev, [code]: data }));
      } catch (e) {
        console.error(e);
      } finally {
        setConstituencyLoading(false);
      }
    }
  };

  const filteredDistricts = districtData.filter(d => (d.name || d.code).toLowerCase().includes(searchTerm.toLowerCase()));
  const sortedByBosi = [...districtData].sort((a, b) => b.score - a.score);
  const topPerformers = sortedByBosi.slice(0, 3);
  const lowPerformers = sortedByBosi.slice(-3).reverse();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '64px' }}><Zap className="spin" style={{ color: 'var(--amber-500)' }} /></div>;
  }

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">District Performance & Rankings</div>
          <div className="dash-page-subtitle">Unified Analytics: Real-time Metrics for {state}</div>
        </div>
      </div>

      {districtData.length === 0 ? (
        <div className="admin-form-card" style={{ textAlign: 'center', padding: '64px' }}>
          <Globe size={48} style={{ color: 'var(--gray-200)', marginBottom: 16 }} />
          <div style={{ color: 'var(--gray-400)', fontWeight: 800 }}>No district data found for {state}</div>
        </div>
      ) : (
        <>
          {/* RANKINGS ROW */}
          <div className="dash-grid-2" style={{ marginBottom: 24 }}>
            <div className="dash-section" style={{ borderTop: '4px solid #059669' }}>
              <div className="dash-section-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065f46' }}>
                  <TrendingUp size={18} />
                  Top Districts
                </h3>
              </div>
              <div className="dash-section-body">
                {topPerformers.map((d, index) => (
                  <div key={d.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: index < topPerformers.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--gray-200)' }}>{index + 1}</span>
                      <span style={{ fontWeight: 800, color: 'var(--navy-900)' }}>{d.name}</span>
                    </div>
                    <div className="admin-badge" style={{ background: '#05966915', color: '#059669', borderColor: '#05966930' }}>{d.score}% Strength</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dash-section" style={{ borderTop: '4px solid #ef4444' }}>
              <div className="dash-section-head">
                <h3 style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Radio size={18} />
                  Priority Intervention
                </h3>
              </div>
              <div className="dash-section-body">
                {lowPerformers.map((d, index) => (
                  <div key={d.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: index < lowPerformers.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--gray-200)' }}>{districtData.length - index}</span>
                      <span style={{ fontWeight: 800, color: 'var(--navy-900)' }}>{d.name}</span>
                    </div>
                    <div className="admin-badge" style={{ background: '#dc262615', color: '#dc2626', borderColor: '#dc262630' }}>{d.score}% Strength</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PERFORMANCE MATRIX TABLE */}
          <div className="dash-section">
            <div className="dash-section-head" style={{ justifyContent: 'space-between' }}>
              <h3>District Performance Matrix</h3>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Filter by district..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ padding: '6px 12px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontSize: 12, width: 200 }}
                />
              </div>
            </div>
            <div className="dash-section-body" style={{ padding: 0 }}>
              <table className="admin-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>District Name</th>
                    <th>Incharge</th>
                    <th>BOSI Index</th>
                    <th>Voter Coverage</th>
                    <th>Volunteers</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDistricts.map((d) => (
                    <React.Fragment key={d.code}>
                      <tr 
                        onClick={() => toggleDistrict(d.code)}
                        style={{ cursor: 'pointer', background: expandedDistrict === d.code ? 'var(--gray-50)' : 'transparent' }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 10, transition: 'transform 0.2s', display: 'inline-block', transform: expandedDistrict === d.code ? 'rotate(90deg)' : 'none' }}>▶</span>
                        </td>
                        <td style={{ fontWeight: 900, color: 'var(--navy-900)' }}>{d.name || d.code}</td>
                        <td style={{ fontWeight: 700, color: '#4b5563' }}>{d.incharge}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ height: 6, background: 'var(--gray-100)', flex: 1, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${d.score}%`, background: d.score > 70 ? '#059669' : d.score > 50 ? 'var(--amber-500)' : '#dc2626' }}></div>
                            </div>
                            <span style={{ fontWeight: 800 }}>{d.score}%</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{d.coverage_pct}% visited</td>
                        <td style={{ fontWeight: 700 }}>{d.volunteers} Active</td>
                        <td>
                          <span className="pill" style={{ 
                            backgroundColor: d.incharge === 'Not Assigned' ? '#dc262615' : '#05966915',
                            color: d.incharge === 'Not Assigned' ? '#dc2626' : '#059669',
                            fontSize: 10, padding: '2px 8px'
                          }}>
                            {d.incharge === 'Not Assigned' ? 'Not Active' : 'Active'}
                          </span>
                        </td>
                      </tr>
                      {expandedDistrict === d.code && (
                        <tr>
                          <td colSpan={7} style={{ padding: '0 0 24px 40px', background: 'var(--gray-50)' }}>
                            <div className="dash-section" style={{ margin: 0, boxShadow: 'none', border: '1px solid var(--gray-200)' }}>
                              <div className="dash-section-head" style={{ padding: '8px 16px' }}>
                                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--navy-700)' }}>Constituency Performance: {d.name}</h4>
                              </div>
                              <div className="dash-section-body" style={{ padding: 0 }}>
                                {constituencyLoading ? (
                                  <div style={{ padding: 24, textAlign: 'center' }}><Zap className="spin" size={20} style={{ color: 'var(--amber-500)' }} /></div>
                                ) : (
                                  <table className="admin-table" style={{ fontSize: 12 }}>
                                    <thead>
                                      <tr>
                                        <th>Name</th>
                                        <th>Incharge</th>
                                        <th>BOSI</th>
                                        <th>Coverage</th>
                                        <th>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {constituencyCache[d.code]?.map(c => (
                                        <tr key={c.code}>
                                          <td style={{ fontWeight: 800 }}>{c.name}</td>
                                          <td style={{ fontWeight: 600 }}>{c.incharge}</td>
                                          <td style={{ fontWeight: 800 }}>{c.score}%</td>
                                          <td>{c.coverage_pct}%</td>
                                          <td>
                                            <span className="pill" style={{ 
                                              backgroundColor: c.incharge === 'Not Assigned' ? '#dc262615' : '#05966915',
                                              color: c.incharge === 'Not Assigned' ? '#dc2626' : '#059669',
                                              fontSize: 9, padding: '1px 6px'
                                            }}>
                                              {c.incharge === 'Not Assigned' ? 'Not Active' : 'Active'}
                                            </span>
                                          </td>
                                        </tr>
                                      )) || <tr><td colSpan={5} style={{ textAlign: 'center', padding: 12 }}>No data</td></tr>}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
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
  const [downloading, setDownloading] = useState(null);

  const handleDownload = async (type, filename) => {
    try {
      setDownloading(type);
      const res = await fetch(`/api/v1/export/${type}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error("Failed to export");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(`Error exporting ${type}`);
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    { id: 'complaints', title: 'Complaint Resolution Log', icon: AlertCircle, filename: 'complaints_export.csv', desc: 'Raw dump of all filed issues, resolutions, and status.' },
    { id: 'volunteers', title: 'Volunteer Roster & Metrics', icon: Users, filename: 'volunteers_export.csv', desc: 'Performance scores, assignments, and contact details.' },
    { id: 'coverage', title: 'Campaign Coverage Report', icon: FileSpreadsheet, filename: 'coverage_export.csv', desc: 'Constituency level statistics and targets.' },
  ];

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Final Reports & Export</div>
      </div>
      
      <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {reports.map(r => (
          <div key={r.id} style={{
            background: 'var(--navy-900)',
            border: '1px solid var(--gray-700)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-400)' }}>
                <r.icon size={20} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>{r.title}</h3>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--gray-400)', margin: 0, lineHeight: 1.5, flex: 1 }}>
              {r.desc}
            </p>

            <button
              className="btn btn-primary"
              disabled={downloading === r.id}
              onClick={() => handleDownload(r.id, r.filename)}
              style={{
                background: 'var(--blue-600)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: downloading === r.id ? 'not-allowed' : 'pointer',
                opacity: downloading === r.id ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              <Download size={16} />
              {downloading === r.id ? 'Generating...' : 'Download CSV'}
            </button>
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
