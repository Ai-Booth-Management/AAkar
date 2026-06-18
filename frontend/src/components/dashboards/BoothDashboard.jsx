"use client";
import React from 'react';
import { Shield } from 'lucide-react';

export default function BoothDashboard({ tab, hierarchy }) {
  const booth = hierarchy.booth || 'B102';
  switch (tab) {
    case 'profile':     return <BoothProfile booth={booth} />;
    case 'households':  return <HouseholdCoverage />;
    case 'volunteers':  return <FieldStaff />;
    case 'activities':  return <Activities />;
    case 'issues':      return <LocalIssues />;
    case 'ai-suggestions': return null;
    case 'knowledge':   return <IntelBase />;
    default:            return <BoothProfile booth={booth} />;
  }
}

function BoothProfile({ booth }) {
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
        <div className="dash-stat"><div className="ds-value">1,240</div><div className="ds-label">Registered Voters</div></div>
        <div className="dash-stat"><div className="ds-value">310</div><div className="ds-label">Est. Households</div></div>
        <div className="dash-stat"><div className="ds-value">Urban-Res</div><div className="ds-label">Category</div></div>
        <div className="dash-stat-dark"><div className="ds-value">84/100</div><div className="ds-label">BOSI Strength</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Booth Health Metrics</h3></div>
          <div className="dash-section-body">
            <ProgressRow label="Voter Loyalty" pct={72} color="" />
            <ProgressRow label="Operational Readiness" pct={88} color="green" />
            <ProgressRow label="Digital Reach" pct={64} color="amber" />
            <ProgressRow label="Volunteer Coverage" pct={91} color="green" />
            <ProgressRow label="Issue Resolution" pct={77} color="" />
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Booth Rating</h3></div>
          <div className="dash-section-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 40 }}>
            <div style={{ width: 80, height: 80, background: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: 'var(--amber-500)', marginBottom: 16 }}>A+</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>Health Rating</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8, fontWeight: 600 }}>Optimal organization vs assembly average</div>
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
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)' }}>182 / 310 Covered</div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Coverage Grid — Booth B102</h3></div>
        <div className="dash-section-body">
          <div className="hh-grid">
            {[...Array(60)].map((_, i) => (
              <div key={i} className={`hh-cell ${i < 36 ? 'hh-covered' : i === 48 ? 'hh-locked' : 'hh-pending'}`}>
                H-{i + 1}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
            <Legend color="var(--green-500)" label="Covered" />
            <Legend color="var(--gray-200)" label="Pending" border />
            <Legend color="var(--red-500)" label="Locked" />
          </div>
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
        <div className="dash-section-head"><h3>Active Field Staff (12)</h3></div>
        <div className="dash-section-body">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
            <div key={i} className="vol-card">
              <div className="vol-avatar">V{String(i).padStart(2,'0')}</div>
              <div style={{ flex: 1 }}>
                <div className="vol-name">Volunteer {i}</div>
                <div className="vol-status">Active · {10 + i} visits · H-{30 + i} last contact</div>
              </div>
              <span className="badge badge-low">On Route</span>
            </div>
          ))}
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
            <ProgressRow label="Voter Verification" pct={85} color="green" />
            <ProgressRow label="Leaflet Distribution" pct={42} color="amber" />
            <ProgressRow label="Key Influencer Meets" pct={90} color="green" />
            <ProgressRow label="Youth Engagement" pct={56} color="" />
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Today's Schedule</h3></div>
          <div className="dash-section-body">
            {[
              ['08:00 AM', 'Morning Team Meet', '12 attendees'],
              ['11:30 AM', 'Drive — Lobe 4', '4 volunteers'],
              ['04:00 PM', 'Youth Sync', '25 attendees'],
            ].map(([time, title, meta]) => (
              <div key={time} className="meeting-item">
                <div style={{ flex: 1 }}>
                  <div className="meeting-title">{title}</div>
                  <div className="meeting-meta">{time} · {meta}</div>
                </div>
                <span className="badge badge-low">Scheduled</span>
              </div>
            ))}
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
              <tr><td style={{ fontWeight: 700 }}>Drainage overflow at Sector Hub</td><td><span className="badge badge-high">High</span></td><td>Volunteer 4</td><td><span className="badge badge-high">Open</span></td></tr>
              <tr><td style={{ fontWeight: 700 }}>Power fluctuation (evening hours)</td><td><span className="badge badge-med">Medium</span></td><td>Volunteer 2</td><td><span className="badge badge-med">In Progress</span></td></tr>
              <tr><td style={{ fontWeight: 700 }}>Street dog menace near booth</td><td><span className="badge badge-med">Medium</span></td><td>Volunteer 7</td><td><span className="badge badge-high">Open</span></td></tr>
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
          <div className="intel-note">
            <div className="intel-note-label">Community Leader — Ward 4</div>
            <div className="intel-note-text">"Ward 4 influential figure 'Mr. Singh' remains neutral but has concerns about the new bypass road. Outreach meeting recommended before Dec 20."</div>
          </div>
          <div className="intel-note">
            <div className="intel-note-label">Trend Note — Youth Cluster</div>
            <div className="intel-note-text">"Shift in young population towards digital education needs. High engagement potential if targeted with scholarship scheme messaging."</div>
          </div>
          <div className="intel-note">
            <div className="intel-note-label">Opposition Activity</div>
            <div className="intel-note-text">"Rival party visible in H-40 to H-55 zone for 2 consecutive evenings. Requires counter-outreach deployment."</div>
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

function Legend({ color, label, border }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 12, height: 12, background: color, border: border ? '1px solid var(--gray-300)' : 'none' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}
