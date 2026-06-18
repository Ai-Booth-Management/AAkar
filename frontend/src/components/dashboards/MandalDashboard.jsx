"use client";
import React from 'react';

export default function MandalDashboard({ tab, hierarchy }) {
  const mandal = hierarchy.mandal || 'CENTRAL';
  switch (tab) {
    case 'overview':     return <MandalOverview mandal={mandal} />;
    case 'booth_status': return <BoothStatusTable />;
    case 'volunteers':   return <VolunteerView />;
    case 'meetings':     return <MeetingTracker />;
    case 'ai-suggestions': return null;
    case 'issues':       return <IssueBoard />;
    default:             return <MandalOverview mandal={mandal} />;
  }
}

function MandalOverview({ mandal }) {
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Mandal Operational Node: {mandal}</div>
          <div className="dash-page-subtitle">
            <span className="pill pill-live" style={{ marginRight: 8 }}>Active Operations</span>
            Manage booths, volunteers &amp; meetings
          </div>
        </div>
        <button className="btn btn-primary">ASSIGN TASKS</button>
      </div>

      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">32</div><div className="ds-label">Total Booths</div></div>
        <div className="dash-stat"><div className="ds-value">28</div><div className="ds-label">Active Booths</div></div>
        <div className="dash-stat"><div className="ds-value">142</div><div className="ds-label">Volunteers</div></div>
        <div className="dash-stat-dark"><div className="ds-value">88.4%</div><div className="ds-label">Coverage</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Live Booth Status Feed</h3></div>
          <BoothTableBody />
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Recent Reports</h3></div>
          <div className="dash-section-body">
            {[['Booth 102', '10m ago', true], ['Booth 115', '1h ago', false], ['Booth 124', '3h ago', true], ['Booth 109', '5h ago', true]].map(([name, time, done]) => (
              <div key={name} className="vol-card">
                <span className={`booth-status-dot ${done ? 'dot-green' : 'dot-amber'}`} />
                <div style={{ flex: 1 }}>
                  <div className="vol-name">{name}</div>
                  <div className="vol-status" style={{ color: done ? 'var(--green-500)' : 'var(--amber-500)' }}>{done ? 'Report Submitted' : 'Pending Review'}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BoothTableBody() {
  const booths = [
    { id: 'B102', sector: 'Sector North', critical: false },
    { id: 'B104', sector: 'Sector North', critical: false },
    { id: 'B106', sector: 'Sector South', critical: true },
    { id: 'B108', sector: 'Sector South', critical: false },
    { id: 'B110', sector: 'Sector South', critical: true },
  ];
  return (
    <div style={{ padding: 0 }}>
      <table>
        <thead><tr><th>Booth</th><th>Health</th><th>Activity</th><th>Staff</th></tr></thead>
        <tbody>
          {booths.map(b => (
            <tr key={b.id}>
              <td>
                <div style={{ fontWeight: 700 }}>{b.id}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{b.sector}</div>
              </td>
              <td>
                <span className={`booth-status-dot ${b.critical ? 'dot-red' : 'dot-green'}`} />
                <span className={`badge ${b.critical ? 'badge-high' : 'badge-low'}`}>{b.critical ? 'Critical' : 'Optimal'}</span>
              </td>
              <td>
                <div className="progress-bar" style={{ width: 80 }}>
                  <div className="fill" style={{ width: b.critical ? '30%' : '85%', background: b.critical ? 'var(--red-500)' : 'var(--green-500)' }} />
                </div>
              </td>
              <td style={{ fontSize: 12, fontWeight: 700 }}>{b.critical ? 4 + Math.floor(Math.random()*2) : 8 + Math.floor(Math.random()*4)} Workers</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoothStatusTable() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Booth Operational Status</div><span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)' }}>32 Nodes Managed</span></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>All Booths — Mandal Central</h3></div>
        <table>
          <thead><tr><th>Booth</th><th>Sector</th><th>Health</th><th>Activity</th><th>Staff Count</th><th>Action</th></tr></thead>
          <tbody>
            {[102,104,106,108,110,112,114,116,118,120].map((id, i) => (
              <tr key={id}>
                <td style={{ fontWeight: 800 }}>B{id}</td>
                <td>{id > 110 ? 'South' : 'North'}</td>
                <td><span className={`badge ${i % 3 === 0 ? 'badge-high' : 'badge-low'}`}>{i % 3 === 0 ? 'Critical' : 'Optimal'}</span></td>
                <td>
                  <div className="progress-bar" style={{ width: 60 }}>
                    <div className="fill" style={{ width: `${i % 3 === 0 ? 30 : 85}%`, background: i % 3 === 0 ? 'var(--red-500)' : 'var(--green-500)' }} />
                  </div>
                </td>
                <td>{4 + (i % 7)} Field Workers</td>
                <td><button className="btn" style={{ padding: '4px 10px', fontSize: 11 }}>VIEW</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VolunteerView() {
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Volunteer Management</div>
        <button className="btn btn-primary">+ ADD VOLUNTEER</button>
      </div>
      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">142</div><div className="ds-label">Total Enrolled</div></div>
        <div className="dash-stat"><div className="ds-value">128</div><div className="ds-label">Checked-in Today</div></div>
        <div className="dash-stat-dark"><div className="ds-value">84.2%</div><div className="ds-label">Productivity Index</div></div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Ground Team Check-ins</h3></div>
        <div className="dash-section-body">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="vol-card">
              <div className="vol-avatar">V{i < 10 ? '0' + i : i}</div>
              <div style={{ flex: 1 }}>
                <div className="vol-name">Volunteer {i}</div>
                <div className="vol-status">Active · {10 + i * 2} Visits Today · Booth B{100 + i * 2}</div>
              </div>
              <span className="badge badge-low">On route</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeetingTracker() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Meeting Tracker</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Scheduled &amp; Completed Meetings</h3></div>
        <div className="dash-section-body">
          {[
            { title: 'Mandal Sector Meeting 1', time: 'Today, 05:00 PM', location: 'Sector Hub 1', done: false },
            { title: 'Mandal Sector Meeting 2', time: 'Today, 06:30 PM', location: 'Sector Hub 2', done: false },
            { title: 'Booth President Sync', time: 'Yesterday, 04:00 PM', location: 'HQ Room A', done: true },
            { title: 'Weekly Volunteer Assembly', time: 'Dec 14, 10:00 AM', location: 'Community Center', done: true },
          ].map((m, i) => (
            <div key={i} className="meeting-item">
              <div style={{ flex: 1 }}>
                <div className="meeting-title">{m.title}</div>
                <div className="meeting-meta">{m.time} · {m.location}</div>
              </div>
              {m.done
                ? <span className="badge badge-low">Completed</span>
                : <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" style={{ padding: '5px 12px', fontSize: 11 }}>EDIT</button>
                    <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 11 }}>DONE</button>
                  </div>
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IssueBoard() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Issue Board</div></div>
      <div className="dash-grid-3">
        {[['High Priority', 8, 'red'], ['Moderate', 14, 'amber'], ['Resolved', 42, 'green']].map(([label, count, color]) => (
          <div key={label} className="dash-section" style={{ marginBottom: 0 }}>
            <div className="dash-section-head" style={{ background: color === 'red' ? 'var(--red-50)' : color === 'amber' ? 'var(--amber-50)' : 'var(--green-50)' }}>
              <h3 style={{ color: color === 'red' ? 'var(--red-500)' : color === 'amber' ? 'var(--amber-500)' : 'var(--green-500)' }}>{label}</h3>
              <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>{count}</span>
            </div>
            <div className="dash-section-body">
              <div className="progress-bar">
                <div className="fill" style={{ width: `${count}%`, background: color === 'red' ? 'var(--red-500)' : color === 'amber' ? 'var(--amber-500)' : 'var(--green-500)' }} />
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gray-500)', fontWeight: 600 }}>Local grievances requiring review</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
