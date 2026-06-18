"use client";
import React from 'react';

export default function MandalDashboard({ tab, hierarchy }) {
  const mandal = hierarchy.mandal || '';
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
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Total Booths</div></div>
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Active Booths</div></div>
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Volunteers</div></div>
        <div className="dash-stat-dark"><div className="ds-value">0%</div><div className="ds-label">Coverage</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Live Booth Status Feed</h3></div>
          <div style={{ padding: 0 }}>
            <table>
              <thead><tr><th>Booth</th><th>Health</th><th>Activity</th><th>Staff</th></tr></thead>
              <tbody>
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No booth data available</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Recent Reports</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No reports submitted</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoothTableBody() {
  return (
    <div style={{ padding: 0 }}>
      <table>
        <thead><tr><th>Booth</th><th>Health</th><th>Activity</th><th>Staff</th></tr></thead>
        <tbody>
          <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No booth data available</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function BoothStatusTable() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Booth Operational Status</div><span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)' }}>0 Nodes Managed</span></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>All Booths</h3></div>
        <table>
          <thead><tr><th>Booth</th><th>Sector</th><th>Health</th><th>Activity</th><th>Staff Count</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No booth data available</td></tr>
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
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Total Enrolled</div></div>
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Checked-in Today</div></div>
        <div className="dash-stat-dark"><div className="ds-value">0%</div><div className="ds-label">Productivity Index</div></div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Ground Team Check-ins</h3></div>
        <div className="dash-section-body">
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No volunteer data available</div>
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
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No meetings scheduled</div>
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
        {[['High Priority', 0, 'red'], ['Moderate', 0, 'amber'], ['Resolved', 0, 'green']].map(([label, count, color]) => (
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
