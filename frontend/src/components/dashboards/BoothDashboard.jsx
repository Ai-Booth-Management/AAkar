"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import Hub from '../shared/Hub';

export default function BoothDashboard({ tab, hierarchy }) {
  const booth = hierarchy.booth || '';
  switch (tab) {
    case 'profile':     return <BoothProfile booth={booth} />;
    case 'hub':         return <Hub hierarchy={hierarchy} userRole="BOOTH_PRESIDENT" />;
    case 'households':  return <HouseholdCoverage />;
    case 'volunteers':  return <FieldStaff boothId={booth} />;
    case 'volunteer-management': return <VolunteerManagement boothId={booth} />;
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

/* ── Helpers ────────────────────────────────────────────────────────── */

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone || '—';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return '—'; }
}

function LoadingState() {
  return (
    <div className="dash-section">
      <div className="dash-section-body" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-400)', marginBottom: 8 }}>Loading…</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>Fetching data from server</div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="dash-section">
      <div className="dash-section-body" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red-500)', marginBottom: 8 }}>Error loading data</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 16 }}>{message}</div>
        {onRetry && <button className="btn btn-primary" onClick={onRetry}>RETRY</button>}
      </div>
    </div>
  );
}

/* ── Field Staff (read-only volunteer list) ─────────────────────────── */

function FieldStaff({ boothId }) {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVolunteers = useCallback(() => {
    setLoading(true);
    const url = boothId
      ? `/api/v1/volunteers/?booth_id=${encodeURIComponent(boothId)}`
      : `/api/v1/volunteers/`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { setVolunteers(data); setError(null); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [boothId]);

  useEffect(() => { fetchVolunteers(); }, [fetchVolunteers]);

  const activeCount = volunteers.filter(v => v.status === 'active').length;

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Field Staff</div>
          <div className="dash-page-subtitle">
            <span className="pill pill-live">{activeCount} Active</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={fetchVolunteers}>↻ REFRESH</button>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchVolunteers} /> : volunteers.length === 0 ? (
        <div className="dash-section">
          <div className="dash-section-body" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📱</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-400)', marginBottom: 8 }}>No volunteers registered yet</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>Volunteers can register by sending <strong>"hi"</strong> to the WhatsApp number.</div>
          </div>
        </div>
      ) : (
        <div className="dash-section">
          <div className="dash-section-head"><h3>Registered Volunteers ({volunteers.length})</h3></div>
          <div className="dash-section-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 700 }}>{v.name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{maskPhone(v.phone)}</td>
                    <td><span className={`pill ${v.status === 'active' ? 'pill-live' : 'pill-blue'}`}>{v.status}</span></td>
                    <td style={{ textAlign: 'center' }}>{v.assigned_tasks}</td>
                    <td style={{ textAlign: 'center' }}>{v.completed_tasks}</td>
                    <td style={{ fontSize: 11, color: 'var(--gray-500)' }}>{formatDateTime(v.registered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Volunteer Management (full CRUD panel for booth president) ─────── */

function VolunteerManagement({ boothId }) {
  const [stats, setStats] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Task form
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState(null);

  // Proof modal
  const [proofTaskId, setProofTaskId] = useState(null);

  // Section toggle
  const [activeSection, setActiveSection] = useState('assign');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bp = boothId ? `?booth_id=${encodeURIComponent(boothId)}` : '';
      const [sR, vR, tR] = await Promise.all([
        fetch(`/api/v1/volunteers/stats${bp}`),
        fetch(`/api/v1/volunteers${bp}`),
        fetch(`/api/v1/tasks${bp}`),
      ]);
      if (!sR.ok || !vR.ok || !tR.ok) throw new Error('Failed to fetch data from server');
      const [sD, vD, tD] = await Promise.all([sR.json(), vR.json(), tR.json()]);
      setStats(sD);
      setVolunteers(vD);
      setTasks(tD);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boothId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedVolunteer || !taskTitle.trim()) return;
    setAssigning(true);
    setAssignResult(null);
    try {
      const res = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteer_id: parseInt(selectedVolunteer, 10),
          booth_id: boothId || '',
          title: taskTitle.trim(),
          description: taskDescription.trim() || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Server error ${res.status}`);
      }
      setAssignResult({ ok: true, msg: '✅ Task assigned! Volunteer notified via WhatsApp.' });
      setTaskTitle('');
      setTaskDescription('');
      setSelectedVolunteer('');
      setTimeout(fetchAll, 600);
    } catch (err) {
      setAssignResult({ ok: false, msg: err.message });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <div className="fade-in"><LoadingState /></div>;
  if (error) return <div className="fade-in"><ErrorState message={error} onRetry={fetchAll} /></div>;

  const s = stats || {};
  const activeVolunteers = volunteers.filter(v => v.status === 'active');

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Volunteer Management</div>
          <div className="dash-page-subtitle">
            <span className="pill pill-live">Live Data</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={fetchAll}>↻ REFRESH</button>
      </div>

      {/* ── Stats ── */}
      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">{s.total_volunteers || 0}</div><div className="ds-label">Total Volunteers</div></div>
        <div className="dash-stat"><div className="ds-value">{s.active_volunteers || 0}</div><div className="ds-label">Active</div></div>
        <div className="dash-stat"><div className="ds-value">{s.assigned_tasks || 0}</div><div className="ds-label">Pending Tasks</div></div>
        <div className="dash-stat"><div className="ds-value">{s.completed_tasks || 0}</div><div className="ds-label">Completed</div></div>
        <div className="dash-stat-dark"><div className="ds-value">{s.completion_rate || 0}%</div><div className="ds-label">Completion Rate</div></div>
      </div>

      {/* ── Section Toggle ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${activeSection === 'assign' ? 'btn-primary' : ''}`}
          onClick={() => setActiveSection('assign')}
          style={{ flex: 1, justifyContent: 'center' }}
        >ASSIGN TASK</button>
        <button
          className={`btn ${activeSection === 'feed' ? 'btn-primary' : ''}`}
          onClick={() => setActiveSection('feed')}
          style={{ flex: 1, justifyContent: 'center' }}
        >TASK FEED ({tasks.length})</button>
        <button
          className={`btn ${activeSection === 'roster' ? 'btn-primary' : ''}`}
          onClick={() => setActiveSection('roster')}
          style={{ flex: 1, justifyContent: 'center' }}
        >ROSTER ({volunteers.length})</button>
      </div>

      {/* ── ASSIGN TASK Section ── */}
      {activeSection === 'assign' && (
        <div className="dash-section">
          <div className="dash-section-head"><h3>Assign New Task</h3></div>
          <div className="dash-section-body">
            {activeVolunteers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📱</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-400)', marginBottom: 8 }}>No active volunteers</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>Volunteers register by sending <strong>"hi"</strong> to the WhatsApp number.</div>
              </div>
            ) : (
              <form onSubmit={handleAssign}>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Select Volunteer *</label>
                  <select
                    value={selectedVolunteer}
                    onChange={e => setSelectedVolunteer(e.target.value)}
                    required
                    style={inputStyle}
                  >
                    <option value="">— Choose a volunteer —</option>
                    {activeVolunteers.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name || 'Unnamed'} ({maskPhone(v.phone)})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Task Title *</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    required
                    placeholder="e.g. Distribute pamphlets in sector 5"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Description (optional)</label>
                  <textarea
                    value={taskDescription}
                    onChange={e => setTaskDescription(e.target.value)}
                    rows={3}
                    placeholder="Additional details about the task…"
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={assigning || !selectedVolunteer || !taskTitle.trim()}
                  style={{ width: '100%', justifyContent: 'center', padding: '14px 0', fontSize: 13 }}
                >
                  {assigning ? 'ASSIGNING…' : '📋  ASSIGN TASK & NOTIFY VIA WHATSAPP'}
                </button>
                {assignResult && (
                  <div style={{
                    marginTop: 12, padding: '12px 16px', borderRadius: 'var(--radius)',
                    background: assignResult.ok ? 'var(--green-50)' : 'var(--red-50)',
                    color: assignResult.ok ? 'var(--green-500)' : 'var(--red-500)',
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {assignResult.msg}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── TASK FEED Section ── */}
      {activeSection === 'feed' && (
        <div className="dash-section">
          <div className="dash-section-head"><h3>Task Feed</h3></div>
          <div className="dash-section-body" style={{ padding: 0, overflowX: 'auto' }}>
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No tasks assigned yet. Use "Assign Task" to create one.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Volunteer</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                    <th>Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 12 }}>{t.title}</div>
                        {t.description && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{t.description}</div>}
                      </td>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>{t.volunteer_name}</td>
                      <td>
                        <span className={`pill ${t.status === 'completed' ? 'pill-live' : 'pill-blue'}`}>
                          {t.status === 'completed' ? '✅ Done' : '⏳ Pending'}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--gray-500)' }}>{formatDateTime(t.assigned_at)}</td>
                      <td style={{ fontSize: 11, color: 'var(--gray-500)' }}>{t.completed_at ? formatDateTime(t.completed_at) : '—'}</td>
                      <td>
                        {t.has_proof ? (
                          <button className="pill pill-blue" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setProofTaskId(t.id)}>📷 View</button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── ROSTER Section ── */}
      {activeSection === 'roster' && (
        <div className="dash-section">
          <div className="dash-section-head"><h3>Volunteer Roster</h3></div>
          <div className="dash-section-body" style={{ padding: 0, overflowX: 'auto' }}>
            {volunteers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No volunteers registered.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                    <th>Since</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700 }}>{v.name || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{maskPhone(v.phone)}</td>
                      <td><span className={`pill ${v.status === 'active' ? 'pill-live' : 'pill-blue'}`}>{v.status}</span></td>
                      <td style={{ textAlign: 'center' }}>{v.assigned_tasks}</td>
                      <td style={{ textAlign: 'center' }}>{v.completed_tasks}</td>
                      <td style={{ fontSize: 11, color: 'var(--gray-500)' }}>{formatDateTime(v.registered_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Proof Image Modal ── */}
      {proofTaskId && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setProofTaskId(null)}
        >
          <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 24, maxWidth: 520, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800 }}>Task Completion Proof</h3>
              <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray-400)' }} onClick={() => setProofTaskId(null)}>✕</button>
            </div>
            <img
              src={`/api/v1/tasks/${proofTaskId}/proof`}
              alt="Task completion proof"
              style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'contain', maxHeight: 400 }}
              onError={e => { e.target.style.display = 'none'; e.target.parentElement.insertAdjacentHTML('beforeend', '<div style="padding:24px;text-align:center;color:#a1a1aa;font-weight:600">Image could not be loaded</div>'); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 12px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-900)', fontFamily: 'inherit' };

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
