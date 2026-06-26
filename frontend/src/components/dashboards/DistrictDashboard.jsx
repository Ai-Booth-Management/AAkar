import React, { useState, useEffect } from 'react';
import HeatmapAnalysis from './HeatmapAnalysis';
import BroadcastPanel from '../shared/BroadcastPanel';
import ManageUsers from '../shared/ManageUsers';
import Hub from '../shared/Hub';

export default function DistrictDashboard({ tab, hierarchy }) {
  const district = hierarchy.district || '';
  switch (tab) {
    case 'overview':       return <DistrictOverview district={district} />;
    case 'constituencies': return <ConstituencyStats district={district} />;
    case 'heatmap':       return <HeatmapAnalysis level="DISTRICT" hierarchy={hierarchy} />;
    case 'coverage':      return <HeatmapAnalysis level="DISTRICT" hierarchy={hierarchy} />;
    case 'issues':        return <LocalIssues />;
    case 'ai-suggestions': return null;
    case 'hub':           return <Hub hierarchy={hierarchy} userRole="DISTRICT_ADMIN" />;
    case 'manage-users':  return <ManageUsers role="DISTRICT_ADMIN" hierarchy={hierarchy} />;
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

  const d = stats || { constituencies: 0, mandals: 0, booths: 0, volunteers: 0, coverage_pct: 0, bosi_avg: 0, complaints: { total: 0, resolved: 0 } };

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
        <div className="dash-stat-dark"><div className="ds-value">{d.bosi_avg}</div><div className="ds-label">Avg. BOSI Score</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>% Houses Visited</h3></div>
          <div className="dash-section-body" style={{ padding: '32px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
               <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--navy-800)" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--blue-500)" strokeWidth="3" strokeDasharray={`${d.coverage_pct}, 100`} />
                  </svg>
                  <div style={{ position: 'absolute', fontSize: 24, fontWeight: 900, color: 'var(--navy-900)' }}>{d.coverage_pct}%</div>
               </div>
               <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>District-wide Coverage Density</div>
             </div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>District Summary</h3></div>
          <div className="dash-section-body">
            <div className="summary-row"><span className="summary-label">Active Booths</span><span className="summary-value">{d.booths}</span></div>
            <div className="summary-row"><span className="summary-label">Available Volunteers</span><span className="summary-value">{d.volunteers}</span></div>
            <div className="summary-row"><span className="summary-label">Issues Logged</span><span className="summary-value">{d.complaints?.total || 0}</span></div>
            <div className="summary-row"><span className="summary-label">Resolved</span><span className="summary-value" style={{ color: 'var(--green-500)' }}>{d.complaints?.resolved || 0} ({d.complaints?.total > 0 ? Math.round((d.complaints.resolved / d.complaints.total) * 100) : 0}%)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConstituencyStats({ district }) {
  const [constituencies, setConstituencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCode, setExpandedCode] = useState(null);
  const [mandalCache, setMandalCache] = useState({});
  const [mandalLoading, setMandalLoading] = useState(false);

  useEffect(() => {
    if (!district) return;
    fetch(`/api/v1/dashboard/district/constituencies?district_code=${district}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json())
      .then(data => { setConstituencies(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [district]);

  const handleToggle = async (code) => {
    if (expandedCode === code) {
      setExpandedCode(null);
      return;
    }
    setExpandedCode(code);
    if (!mandalCache[code]) {
      setMandalLoading(true);
      try {
        const res = await fetch(`/api/v1/dashboard/mandals?constituency_code=${code}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        setMandalCache(prev => ({ ...prev, [code]: data }));
      } catch (e) { console.error(e); }
      finally { setMandalLoading(false); }
    }
  };

  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Constituency Performance</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>All Constituencies — District View</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Constituency</th>
                <th>Incharge</th>
                <th>BOSI Score</th>
                <th>% Houses Visited</th>
                <th>Volunteers</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading results...</td></tr>
              ) : constituencies.length > 0 ? constituencies.map(c => (
                <React.Fragment key={c.code}>
                  <tr 
                    style={{ cursor: 'pointer', background: expandedCode === c.code ? 'var(--gray-50)' : 'transparent' }}
                    onClick={() => handleToggle(c.code)}
                  >
                    <td style={{ textAlign: 'center', fontSize: 16, fontWeight: 900, color: 'var(--gray-400)' }}>
                      {expandedCode === c.code ? '−' : '+'}
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--navy-900)' }}>{c.name}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{c.incharge}</td>
                    <td><span className={`pill ${c.score > 70 ? 'pill-live' : c.score > 40 ? 'pill-blue' : 'pill-red'}`}>{c.score}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <div className="progress-track" style={{ width: 60, height: 6 }}>
                           <div className="progress-fill" style={{ width: `${c.coverage_pct}%`, height: '100%' }} />
                         </div>
                         <span style={{ fontSize: 11, fontWeight: 900 }}>{c.coverage_pct}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.volunteers}</td>
                    <td>
                      <span className={`pill ${c.incharge === 'Not Assigned' ? 'pill-red' : 'pill-live'}`}>
                        {c.incharge === 'Not Assigned' ? 'Not Active' : 'Active'}
                      </span>
                    </td>
                  </tr>
                  {expandedCode === c.code && (
                    <tr>
                      <td colSpan={7} style={{ padding: '0 0 24px 40px', background: 'var(--gray-50)' }}>
                        <div className="fade-in" style={{ borderLeft: '3px solid var(--blue-500)', paddingLeft: 20 }}>
                          <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 12 }}>Mandal Nodes Metrics</h4>
                          {mandalLoading ? (
                             <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>Loading mandal telemetry...</div>
                          ) : mandalCache[c.code] && mandalCache[c.code].length > 0 ? (
                            <table className="dash-table" style={{ margin: 0, background: 'white', borderRadius: 8, border: '1px solid var(--gray-100)' }}>
                              <thead style={{ background: 'var(--gray-50)' }}>
                                <tr style={{ fontSize: 10 }}>
                                  <th>Mandal Name</th>
                                  <th>Mandal Incharge</th>
                                  <th>BOSI</th>
                                  <th>Coverage</th>
                                  <th>Volunteers</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mandalCache[c.code].map(m => (
                                  <tr key={m.code} style={{ fontSize: 12 }}>
                                    <td style={{ fontWeight: 700 }}>{m.name}</td>
                                    <td style={{ fontWeight: 600 }}>{m.incharge}</td>
                                    <td><span style={{ fontWeight: 900, color: m.score > 70 ? 'var(--green-600)' : m.score > 40 ? 'var(--blue-600)' : 'var(--red-600)' }}>{m.score}</span></td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 40, height: 4, background: 'var(--gray-100)', borderRadius: 2 }}>
                                          <div style={{ width: `${m.coverage_pct}%`, height: '100%', background: 'var(--blue-500)', borderRadius: 2 }} />
                                        </div>
                                        <span style={{ fontWeight: 800 }}>{m.coverage_pct}%</span>
                                      </div>
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{m.volunteers}</td>
                                    <td>
                                      <span className={`pill ${m.incharge === 'Not Assigned' ? 'pill-red' : 'pill-live'}`} style={{ fontSize: 9 }}>
                                        {m.incharge === 'Not Assigned' ? 'Not Active' : 'Active'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>No mandal data found for this constituency</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No constituency data available</td>
                </tr>
              )}
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
