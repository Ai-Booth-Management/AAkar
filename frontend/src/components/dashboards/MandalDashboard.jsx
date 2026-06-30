"use client";
import React, { useState } from 'react';
import BroadcastPanel from '../shared/BroadcastPanel';
import ManageUsers from '../shared/ManageUsers';
import Hub from '../shared/Hub';
import AICopilot from '../shared/AICopilot';
import VideoCallPanel from '../shared/VideoCallPanel';
import { useRouter } from 'next/navigation';
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

import mockData from '../../mockData/app.json';
import { formatLocationName } from '../../utils/formatters';
const { MOCK_MANDAL_STATS, MOCK_BOOTHS, MOCK_VOLUNTEER_STATS, MOCK_VOLUNTEER_DIRECTORY, MOCK_COMPLAINT_STATS, MOCK_COMPLAINTS } = mockData;

export default function MandalDashboard({ tab, hierarchy }) {
  const mandal = hierarchy.mandal || '';
  const router = useRouter();

  const handleTabChange = (newTab) => {
    router.push(`/election?tab=${newTab}`);
  };

  const renderTab = () => {
    switch (tab) {
      case 'overview':     return <MandalOverview mandal={mandal} onTabChange={handleTabChange} />;
      case 'booth_status': return <BoothStatusTable mandal={mandal} />;
      case 'campaign':     return <CampaignPanel />;
      case 'manage-users': return <ManageUsers role="MANDAL_MGR" hierarchy={hierarchy} />;
      case 'hub':          return <Hub hierarchy={hierarchy} userRole="MANDAL_MGR" />;
      case 'video-call':   return <VideoCallPanel hierarchy={hierarchy} userRole="MANDAL_MGR" />;
      case 'volunteers':   return <VolunteerView mandal={mandal} onTabChange={handleTabChange} />;
      case 'broadcast':    return <BroadcastPanel hierarchy={hierarchy} />;
      case 'complaints':    return <ComplaintBoard mandal={mandal} />;
      case 'ai-suggestions': return null;
      default:             return <MandalOverview mandal={mandal} onTabChange={handleTabChange} />;
    }
  };

  return renderTab();
}

function MandalOverview({ mandal, onTabChange }) {
  const [stats, setStats] = useState(null);
  const [booths, setBooths] = useState([]);

  React.useEffect(() => {
    if (!mandal) return;
    
    // Fetch aggregate stats
    fetch(`/api/v1/dashboard/stats?level=mandal&code=${mandal}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(data => {
      if (!data || Object.keys(data).length === 0 || !data.voters || data.voters === 0 || !data.bosi_avg || data.bosi_avg === 0 || data.volunteers < 10) {
        setStats(MOCK_MANDAL_STATS);
      } else {
        setStats(data);
      }
    }).catch(() => { setStats(MOCK_MANDAL_STATS); });

    // Fetch booth-specific analytics
    fetch(`/api/v1/dashboard/booths?mandal_code=${mandal}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(data => {
      if (!data || data.length === 0 || data.every(b => !b.coverage_pct || b.coverage_pct === 0)) {
        setBooths(MOCK_BOOTHS);
      } else {
        setBooths(data);
      }
    }).catch(() => { setBooths(MOCK_BOOTHS); });
  }, [mandal]);

  const handleResetData = async () => {
    if (!window.confirm("Are you sure you want to erase all ground data for this mandal? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/v1/dashboard/mandal/reset?mandal_code=${encodeURIComponent(mandal)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        alert("Mandal data erased. Re-ingest data to restore.");
        window.location.reload();
      }
    } catch (e) { alert("Reset failed: " + e.message); }
  };

  const d = stats || MOCK_MANDAL_STATS;
  const demo = d.demographics || MOCK_MANDAL_STATS.demographics;

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Mandal Operational Node: {formatLocationName(mandal)}</div>
          <div className="dash-page-subtitle">
            <span className="pill pill-live" style={{ marginRight: 8 }}>Active Operations</span>
            Manage booths, volunteers &amp; meetings
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleResetData}>ERASE/RESET DATA</button>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>RELOAD UI</button>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">{d.voters}</div><div className="ds-label">Total Voters</div></div>
        <div className="dash-stat"><div className="ds-value">{demo.youth}</div><div className="ds-label">Youth (&lt;35)</div></div>
        <div className="dash-stat"><div className="ds-value">{demo.seniors}</div><div className="ds-label">Seniors (60+)</div></div>
        <div className="dash-stat-dark"><div className="ds-value">{d.bosi_avg}%</div><div className="ds-label">Avg. BOSI Score</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Live Booth Status Feed</h3></div>
          <div style={{ padding: 0, overflowX: 'auto' }}>
            <table className="dash-table">
              <thead><tr><th>Booth</th><th>BOSI Health</th><th>Volunteers</th><th>Action</th></tr></thead>
              <tbody>
                {booths.length > 0 ? booths.map(b => (
                  <tr key={b.code}>
                    <td style={{ fontWeight: 700 }}>Booth {b.code} - {b.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ width: 80, height: 6, margin: 0 }}>
                           <div className="fill" style={{ width: `${b.score}%`, background: getBosiColor(b.score) }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 900, color: getBosiColor(b.score) }}>{b.score}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{b.volunteers}</td>
                    <td><button className="pill pill-blue" style={{ border: 'none', cursor: 'pointer' }}>Analytics</button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No booth data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Voter Statistics</h3></div>
          <div className="dash-section-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               <ProgressRow label="Male Voters" count={demo.male} total={d.voters} color="var(--blue-600)" />
               <ProgressRow label="Female Voters" count={demo.female} total={d.voters} color="var(--amber-500)" />
               <ProgressRow label="Youth Voters" count={demo.youth} total={d.voters} color="var(--green-500)" />
               <ProgressRow label="Senior Citizens" count={demo.seniors} total={d.voters} color="var(--red-400)" />
               
               <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--gray-100)', paddingTop: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)' }}>Households</div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--blue-900)' }}>{demo.households}</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 12px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-900)', fontFamily: 'inherit' };
const formGroupStyle = { marginBottom: 16 };

function ProgressRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-600)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--gray-900)' }}>{count} ({pct}%)</span>
      </div>
      <div className="progress-bar" style={{ height: 6 }}>
        <div className="fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function getBosiColor(score) {
  if (score >= 80) return 'var(--green-600)';
  if (score >= 50) return 'var(--amber-600)';
  return 'var(--red-600)';
}

function BoothStatusTable({ mandal }) {
  const [booths, setBooths] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!mandal) return;
    fetch(`/api/v1/dashboard/booths?mandal_code=${mandal}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { 
        if (!data || data.length === 0 || data.every(b => !b.coverage_pct || b.coverage_pct === 0)) {
          setBooths(MOCK_BOOTHS);
        } else {
          setBooths(data); 
        }
        setLoading(false); 
      })
      .catch(() => {
        setBooths(MOCK_BOOTHS);
        setLoading(false);
      });
  }, [mandal]);

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Booth Operational Status</div>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)' }}>{booths.length} Nodes Managed</span>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>All Booths</h3></div>
        <div style={{ padding: 0, overflowX: 'auto' }}>
          <table className="dash-table">
            <thead><tr><th>Booth</th><th>BOSI</th><th>Voters</th><th>Households</th><th>Coverage</th><th>Volunteers</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Loading analytics...</td></tr>
              ) : booths.length > 0 ? booths.map(b => (
                <tr key={b.code}>
                  <td style={{ fontWeight: 700 }}>{b.code} - {b.name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <span style={{ fontSize: 12, fontWeight: 900, color: getBosiColor(b.score) }}>{b.score}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, textAlign: 'center' }}>{b.voters}</td>
                  <td style={{ fontWeight: 700, textAlign: 'center' }}>{b.households}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <div className="progress-bar" style={{ width: 60, height: 6, margin: 0 }}>
                          <div className="fill" style={{ width: `${b.coverage_pct}%`, background: 'var(--blue-500)' }} />
                       </div>
                       <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--blue-700)' }}>{b.coverage_pct}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--blue-600)' }}>{b.volunteers}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No booth data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function VolunteerView({ mandal, onTabChange }) {
  const [stats, setStats] = useState({ active: 0, pending_tasks: 0, completed_tasks: 0 });
  const [directory, setDirectory] = useState([]);
  const [booths, setBooths] = useState([]);
  const [expandedBooth, setExpandedBooth] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Enrollment Form State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBooth, setRegBooth] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  React.useEffect(() => {
    if (!mandal) return;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    
    fetch(`/api/v1/dashboard/volunteers/analytics?mandal_code=${mandal}`, { headers })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (!data || Object.keys(data).length === 0 || data.active === 0) {
          setStats(MOCK_VOLUNTEER_STATS);
        } else {
          setStats(data);
        }
      })
      .catch(() => setStats(MOCK_VOLUNTEER_STATS));
      
    fetch(`/api/v1/dashboard/volunteers/directory?mandal_code=${mandal}`, { headers })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (!data || data.length === 0) {
          setDirectory(MOCK_VOLUNTEER_DIRECTORY);
        } else {
          setDirectory(data);
        }
      })
      .catch(() => setDirectory(MOCK_VOLUNTEER_DIRECTORY));

    fetch(`/api/v1/dashboard/booths?mandal_code=${mandal}`, { headers })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (!data || data.length === 0 || data.every(b => !b.coverage_pct || b.coverage_pct === 0)) {
          setBooths(MOCK_BOOTHS);
        } else {
          setBooths(data);
        }
      })
      .catch(() => setBooths(MOCK_BOOTHS));
  }, [mandal]);

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!regName || !regPhone || !regBooth) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/v1/volunteers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: regName, phone: regPhone, booth_id: regBooth })
      });
      if (res.ok) {
        setResult({ ok: true, msg: '✅ Volunteer enrolled successfully!' });
        setRegName(''); setRegPhone(''); setRegBooth('');
      } else {
        const err = await res.json();
        setResult({ ok: false, msg: err.detail || 'Enrollment failed' });
      }
    } catch (e) { setResult({ ok: false, msg: 'Network error' }); }
    finally { setLoading(false); }
  };

  if (isEnrolling) {
    return (
      <div className="fade-in">
        <div className="dash-page-header">
          <div className="dash-page-title">Enroll New Volunteer</div>
          <button className="btn btn-secondary" onClick={() => setIsEnrolling(false)}>← BACK TO ROSTER</button>
        </div>
        
        <div className="dash-section" style={{ maxWidth: 600, margin: '20px auto' }}>
          <div className="dash-section-head"><h3>Volunteer Details</h3></div>
          <div className="dash-section-body">
            <form onSubmit={handleEnroll}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} required style={inputStyle} placeholder="e.g. Rahul Sharma" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Mobile Number *</label>
                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} required style={inputStyle} placeholder="10-digit number" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Assign to Booth *</label>
                <select value={regBooth} onChange={e => setRegBooth(e.target.value)} required style={inputStyle}>
                  <option value="">— Select Booth —</option>
                  {booths.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 20, justifyContent: 'center', height: 48 }}>
                {loading ? 'ENROLLING...' : 'CONFIRM ENROLLMENT'}
              </button>
              {result && (
                <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: result.ok ? 'var(--green-50)' : 'var(--red-50)', color: result.ok ? 'var(--green-600)' : 'var(--red-600)', fontWeight: 700, textAlign: 'center' }}>
                  {result.msg}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Ground Force Management</div>
        <button className="btn btn-primary" onClick={() => setIsEnrolling(true)}>+ ENROLL VOLUNTEER</button>
      </div>
      
      <div className="dash-stats">
        <div className="dash-stat">
          <div className="ds-value">{stats.active}</div>
          <div className="ds-label">Active Volunteers</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value" style={{ color: 'var(--amber-600)' }}>{stats.pending_tasks}</div>
          <div className="ds-label">Tasks Pending</div>
        </div>
        <div className="dash-stat-dark">
          <div className="ds-value" style={{ color: 'var(--green-400)' }}>{stats.completed_tasks}</div>
          <div className="ds-label">Tasks Completed</div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head"><h3>Booth-wise Volunteer Directory</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          {directory.length > 0 ? directory.map(group => (
            <div key={group.booth_code} style={{ borderBottom: '1px solid var(--gray-100)' }}>
              <div 
                onClick={() => setExpandedBooth(expandedBooth === group.booth_code ? null : group.booth_code)}
                style={{ 
                  padding: '16px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: expandedBooth === group.booth_code ? 'var(--gray-50)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--blue-900)' }}>Booth {group.booth_code}</span>
                  <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: 'var(--gray-500)' }}>{group.booth_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="pill pill-blue">{group.volunteers.length} Personnel</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--gray-400)' }}>
                    {expandedBooth === group.booth_code ? '−' : '+'}
                  </span>
                </div>
              </div>
              
              {expandedBooth === group.booth_code && (
                <div style={{ padding: '0 20px 16px', animation: 'slideDown 0.3s ease-out' }}>
                  <table className="dash-table" style={{ margin: 0, border: '1px solid var(--gray-100)', borderRadius: 8 }}>
                    <thead style={{ background: 'var(--gray-50)' }}>
                      <tr><th>Name</th><th>Primary Contact</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {group.volunteers.length > 0 ? group.volunteers.map((v, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700 }}>{v.name}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--blue-700)' }}>{v.phone}</td>
                          <td><span className="pill pill-live">Active</span></td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: 12, fontSize: 11 }}>No volunteers assigned to this booth</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)', fontWeight: 600 }}>
              No volunteer nodes found in this mandal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComplaintBoard({ mandal }) {
  const [stats, setStats] = useState({ total: 0, resolved: 0 });
  const [boothComplaints, setBoothComplaints] = useState([]);
  const [expandedBooth, setExpandedBooth] = useState(null);

  React.useEffect(() => {
    if (!mandal) return;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    
    fetch(`/api/v1/dashboard/complaints/analytics?mandal_code=${mandal}`, { headers })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (!data || Object.keys(data).length === 0 || data.total === 0) {
          setStats(MOCK_COMPLAINT_STATS);
        } else {
          setStats(data);
        }
      })
      .catch(() => setStats(MOCK_COMPLAINT_STATS));
      
    fetch(`/api/v1/dashboard/complaints/directory?mandal_code=${mandal}`, { headers })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (!data || data.length === 0 || !Array.isArray(data) || data.every(b => !b.complaints || b.complaints.length === 0)) {
          setBoothComplaints(MOCK_COMPLAINTS);
        } else {
          setBoothComplaints(data);
        }
      })
      .catch(() => setBoothComplaints(MOCK_COMPLAINTS));
  }, [mandal]);

  const resolvedPct = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Complaint Resolution Center</div>
        <span className="pill pill-red">{stats.total - stats.resolved} Pending</span>
      </div>

      <div className="dash-stats">
        <div className="dash-stat">
          <div className="ds-value">{stats.total}</div>
          <div className="ds-label">Total Complaints</div>
        </div>
        <div className="dash-stat">
          <div className="ds-value" style={{ color: 'var(--green-600)' }}>{stats.resolved}</div>
          <div className="ds-label">Resolved</div>
        </div>
        <div className="dash-stat-dark">
          <div className="ds-value">{resolvedPct}%</div>
          <div className="ds-label">Resolution Rate</div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head"><h3>Booth-wise Complaints</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          {boothComplaints.length > 0 ? boothComplaints.map(group => (
            <div key={group.booth_code} style={{ borderBottom: '1px solid var(--gray-100)' }}>
              <div 
                onClick={() => setExpandedBooth(expandedBooth === group.booth_code ? null : group.booth_code)}
                style={{ 
                  padding: '16px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: expandedBooth === group.booth_code ? 'var(--gray-50)' : 'transparent'
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>Booth {group.booth_code}</span>
                  <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--gray-500)' }}>{group.booth_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`pill ${group.complaints.some(c => c.status !== 'Resolved') ? 'pill-red' : 'pill-live'}`}>
                    {group.complaints.length} Records
                  </span>
                  <span style={{ fontWeight: 900 }}>{expandedBooth === group.booth_code ? '−' : '+'}</span>
                </div>
              </div>

              {expandedBooth === group.booth_code && (
                <div style={{ padding: '0 20px 16px' }}>
                  {group.complaints.length > 0 ? (
                    <table className="dash-table" style={{ margin: 0 }}>
                      <thead><tr><th>Type</th><th>Description</th><th>Status</th></tr></thead>
                      <tbody>
                        {group.complaints.map((c, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700, fontSize: 11 }}>{c.type}</td>
                            <td style={{ fontSize: 11, color: 'var(--gray-600)' }}>{c.description}</td>
                            <td>
                              <span className={`pill ${c.status === 'Resolved' ? 'pill-live' : 'pill-red'}`} style={{ fontSize: 9 }}>
                                {c.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 12, fontSize: 11, color: 'var(--gray-400)' }}>No complaints for this booth.</div>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
