"use client";
import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import Hub from '../shared/Hub';

export default function BoothDashboard({ tab, hierarchy }) {
  const booth = hierarchy.booth || '';
  switch (tab) {
    case 'profile':     return <BoothProfile booth={booth} />;
    case 'hub':         return <Hub hierarchy={hierarchy} userRole="BOOTH_PRESIDENT" />;
    case 'households':  return <HouseholdCoverage />;
    case 'volunteers':  return <FieldStaff />;
    case 'volunteer-management': return <ComingSoon title="Volunteer Management" />;
    case 'broadcast':   return <ComingSoon title="Broadcast" />;
    case 'activities':  return <Activities />;
    case 'issues':      return <LocalIssues />;
    case 'ai-suggestions': return null;
    case 'knowledge':   return <IntelBase />;
    default:            return <BoothProfile booth={booth} />;
  }
}

function ComingSoon({ title }) {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">{title}</div></div>
      <div className="dash-section">
        <div className="dash-section-body" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-400)', marginBottom: 8 }}>Coming Soon</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>{title} feature is under development</div>
        </div>
      </div>
    </div>
  );
}

function BoothProfile({ booth }) {
  const [stats, setStats] = useState(null);
  React.useEffect(() => {
    if (!booth) return;
    fetch(`/api/v1/dashboard/stats?level=booth&code=${booth}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setStats).catch(() => {});
  }, [booth]);

  const d = stats || { voters: 0, volunteers: 0 };

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Booth Node {booth}</div>
          <div className="dash-page-subtitle">
            <span className="pill pill-live">Election Management Mode</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary">ASSIGN HOUSEHOLDS</button>
          <button className="btn" style={{ borderColor: 'var(--red-500)', color: 'var(--red-500)' }}>REPORT EMERGENCY</button>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">{d.voters}</div><div className="ds-label">Registered Voters</div></div>
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Est. Households</div></div>
        <div className="dash-stat"><div className="ds-value">—</div><div className="ds-label">Category</div></div>
        <div className="dash-stat-dark"><div className="ds-value">0/100</div><div className="ds-label">BOSI Strength</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Booth Health Metrics</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No health metrics available</div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Booth Rating</h3></div>
          <div className="dash-section-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 40 }}>
            <div style={{ width: 80, height: 80, background: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: 'var(--amber-500)', marginBottom: 16 }}>—</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>Health Rating</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8, fontWeight: 600 }}>No data available</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HouseholdCoverage() {
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Household Contact Matrix</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)' }}>0 / 0 Covered</div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Coverage Grid</h3></div>
        <div className="dash-section-body">
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No household data available</div>
        </div>
      </div>
    </div>
  );
}

function FieldStaff() {
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Field Staff</div>
        <button className="btn btn-primary">+ ADD VOLUNTEER</button>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Active Field Staff (0)</h3></div>
        <div className="dash-section-body">
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No field staff data available</div>
        </div>
      </div>
    </div>
  );
}

function Activities() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Live Activity Tracker</div></div>
      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Tactical Progress</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No activity data available</div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Today's Schedule</h3></div>
          <div className="dash-section-body">
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No schedule available</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalIssues() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Booth-Level Grievances</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Open Issues</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Issue</th><th>Priority</th><th>Reporter</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontWeight: 600 }}>No issues reported</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IntelBase() {
  return (
    <div className="fade-in">
      <div className="dash-page-header"><div className="dash-page-title">Booth Intelligence Matrix</div></div>
      <div className="dash-section-dark">
        <div className="dash-section-head"><h3>Local Leader Intel</h3></div>
        <div className="dash-section-body">
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--blue-100)', fontSize: 12, fontWeight: 600 }}>No intelligence data available</div>
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

function Legend({ color, label, border }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 12, height: 12, background: color, border: border ? '1px solid var(--gray-300)' : 'none' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}
