"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import Hub from '../shared/Hub';

export default function BoothDashboard({ tab, hierarchy }) {
  const booth = hierarchy.booth || '';
  switch (tab) {
    case 'profile':     return <BoothProfile booth={booth} />;
    case 'hub':         return <Hub hierarchy={hierarchy} userRole="BOOTH_PRESIDENT" />;
    case 'households':  return <HouseholdCoverage boothId={booth} />;
    case 'volunteers':  return <FieldStaff boothId={booth} />;
    case 'volunteer-management': return <VolunteerManagement boothId={booth} />;
    case 'broadcast':   return <BroadcastTerminal boothId={booth} />;
    case 'management':  return <DataManagement boothId={booth} />;
    default:            return <BoothProfile booth={booth} />;
  }
}


function BoothProfile({ booth }) {
  const [stats, setStats] = useState(null);
  const [resetting, setResetting] = useState(false);

  React.useEffect(() => {
    if (!booth) return;
    fetch(`/api/v1/dashboard/stats?level=booth&code=${booth}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setStats).catch(() => {});
  }, [booth]);

  const handleReloadData = async () => {
    if (!window.confirm('This will clear ALL ingested voter data for this booth and log you out. Continue?')) return;
    setResetting(true);
    try {
      await fetch(`/api/v1/dashboard/booth/reset?booth_code=${booth}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (e) { /* ignore, proceed to logout */ }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('aakar_session');
    window.location.href = '/login';
  };

  const d = stats || { voters: 0, volunteers: 0, demographics: { male: 0, female: 0, youth: 0, seniors: 0, households: 0 } };
  const demo = d.demographics || { male: 0, female: 0, youth: 0, seniors: 0, households: 0 };

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
          <button className="btn btn-secondary" onClick={handleReloadData} disabled={resetting}>
            {resetting ? 'CLEARING...' : 'RELOAD DATA'}
          </button>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">{d.voters}</div><div className="ds-label">Registered Voters</div></div>
        <div className="dash-stat"><div className="ds-value">{demo.households}</div><div className="ds-label">Est. Households</div></div>
        <div className="dash-stat"><div className="ds-value">{demo.female}</div><div className="ds-label">Female Voters</div></div>
        <div className="dash-stat-dark"><div className="ds-value">{demo.youth}</div><div className="ds-label">Youth Power</div></div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Booth Demographics</h3></div>
          <div className="dash-section-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ProgressRow 
                label="Male Voters" 
                pct={d.voters > 0 ? Math.round((demo.male / d.voters) * 100) : 0} 
                color="blue" 
              />
              <ProgressRow 
                label="Female Voters" 
                pct={d.voters > 0 ? Math.round((demo.female / d.voters) * 100) : 0} 
                color="amber" 
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div className="dash-stat" style={{ flex: 1, border: 'none', background: 'var(--gray-50)' }}>
                  <div className="ds-value" style={{ fontSize: 20 }}>{demo.seniors}</div>
                  <div className="ds-label">Senior Citizens</div>
                </div>
                <div className="dash-stat" style={{ flex: 1, border: 'none', background: 'var(--gray-50)' }}>
                  <div className="ds-value" style={{ fontSize: 20 }}>{demo.youth}</div>
                  <div className="ds-label">Youth Power</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="dash-section">
          <div className="dash-section-head"><h3>Booth Performance</h3></div>
          <div className="dash-section-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 40 }}>
            <div style={{ width: 80, height: 80, background: 'var(--blue-600)', border: '4px solid var(--amber-500)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: 'var(--amber-500)', marginBottom: 16 }}>B+</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>Current Status</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8, fontWeight: 600 }}>Active Field Presence Required</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HouseholdCoverage({ boothId }) {
  const [data, setData] = useState({ metrics: { total: 0, covered: 0, left: 0 }, households: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!boothId) return;
    try {
      const res = await fetch(`/api/v1/dashboard/households?booth_code=${boothId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const json = await res.json();
      setData(json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [boothId]);

  const toggleStatus = async (id, currentStatus) => {
    try {
      const res = await fetch('/api/v1/dashboard/households/toggle-status', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address_id: id, covered: !currentStatus })
      });
      if (res.ok) fetchData(); // Refresh data
    } catch (e) { console.error(e); }
  };

  if (loading) return <LoadingState />;

  const { metrics, households } = data;

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Operational Household Matrix</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)' }}>
          Strategy & Field Execution
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderBottom: '3px solid var(--blue-600)' }}>
           <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Total Households</div>
           <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-900)' }}>{metrics.total}</div>
        </div>
        <div style={{ padding: '16px 20px', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderBottom: '3px solid var(--green-600)' }}>
           <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Covered / Visited</div>
           <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--green-600)' }}>{metrics.covered}</div>
        </div>
        <div style={{ padding: '16px 20px', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderBottom: '3px solid var(--amber-600)' }}>
           <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Pending / Left</div>
           <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--amber-600)' }}>{metrics.left}</div>
        </div>
      </div>
      
      <div className="dash-section">
        <div className="dash-section-head">
          <h3>Target Assignments</h3>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-600)' }}>Click card to toggle status</div>
        </div>
        <div className="dash-section-body">
          {households.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>
               <div style={{ fontSize: 14, fontWeight: 700 }}>No households found</div>
               <div style={{ fontSize: 12 }}>Upload voter JSON to populate this grid.</div>
             </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {households.map(h => (
                <div key={h.id} style={{ 
                  padding: 16, 
                  background: 'var(--white)', 
                  border: '1px solid var(--gray-200)', 
                  borderRadius: 'var(--radius)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                       <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--gray-400)' }}>HOUSE NO</div>
                       <div style={{ padding: '2px 6px', background: h.covered ? 'var(--green-100)' : 'var(--amber-100)', color: h.covered ? 'var(--green-700)' : 'var(--amber-700)', borderRadius: 4, fontSize: 8, fontWeight: 900 }}>
                         {h.covered ? 'COVERED' : 'PENDING'}
                       </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--blue-900)' }}>{h.house_no}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', marginTop: 2 }}>{h.members} Registered Voters</div>
                  </div>
                  
                  <button 
                    onClick={() => toggleStatus(h.id, h.covered)}
                    style={{ 
                      width: '100%', 
                      padding: '8px 0', 
                      background: h.covered ? 'var(--gray-100)' : 'var(--blue-600)', 
                      color: h.covered ? 'var(--gray-600)' : 'var(--white)',
                      border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer' 
                    }}>
                    {h.covered ? 'MARK AS PENDING' : 'MARK AS COVERED'}
                  </button>
                </div>
              ))}
            </div>
          )}
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
                  <th>Pincode</th>
                  <th>Aadhar</th>
                  <th>Address</th>
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
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{v.pincode || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-500)' }}>{v.aadhar ? `****${v.aadhar.slice(-4)}` : '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--gray-500)', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.address || ''}>
                      {v.address || (v.district ? `${v.district}, ${v.state}` : '—')}
                    </td>
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

  // Register volunteer
  // Register volunteer
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPincode, setRegisterPincode] = useState('');
  const [registerAddress, setRegisterAddress] = useState('');
  const [registerAadhar, setRegisterAadhar] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);

  // Section toggle
  const [activeSection, setActiveSection] = useState('assign');

  // Multi-select for broadcast
  const [selectedVolunteers, setSelectedVolunteers] = useState([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const toggleVolunteerSelection = (id) => {
    setSelectedVolunteers(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() || selectedVolunteers.length === 0) return;
    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/v1/volunteers/broadcast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          volunteer_ids: selectedVolunteers,
          message: broadcastMessage.trim()
        }),
      });
      if (!res.ok) throw new Error('Broadcast failed');
      alert(`✅ Broadcast sent to ${selectedVolunteers.length} volunteers!`);
      setBroadcastMessage('');
      setSelectedVolunteers([]);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerName.trim() || !registerPhone.trim()) return;
    
    if (registerPincode.trim() && !/^\d{6}$/.test(registerPincode.trim())) {
      setRegisterResult({ ok: false, msg: 'Pincode must be exactly 6 digits.' });
      return;
    }
    if (registerAadhar.trim() && !/^\d{12}$/.test(registerAadhar.trim())) {
      setRegisterResult({ ok: false, msg: 'Aadhar must be exactly 12 digits.' });
      return;
    }

    setRegistering(true);
    setRegisterResult(null);
    try {
      const res = await fetch('/api/v1/volunteers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          phone: registerPhone.trim(),
          name: registerName.trim(),
          booth_id: boothId,
          pincode: registerPincode.trim() || null,
          address: registerAddress.trim() || null,
          aadhar: registerAadhar.trim() || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Server error ${res.status}`);
      }
      setRegisterResult({ ok: true, msg: '✅ Volunteer registered! Verification soon.' });
      setRegisterName('');
      setRegisterPhone('');
      setRegisterPincode('');
      setRegisterAddress('');
      setRegisterAadhar('');
      setTimeout(fetchAll, 600);
    } catch (err) {
      setRegisterResult({ ok: false, msg: err.message });
    } finally {
      setRegistering(false);
    }
  };

  const [uploadingVolunteers, setUploadingVolunteers] = useState(false);
  const handleVolunteerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingVolunteers(true);
    setRegisterResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/v1/volunteers/upload?booth_id=${boothId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Batch upload failed');
      setRegisterResult({ ok: true, msg: `✅ Successfully imported ${data.added} volunteers!` });
      setTimeout(fetchAll, 800);
    } catch (err) {
      setRegisterResult({ ok: false, msg: err.message });
    } finally {
      setUploadingVolunteers(false);
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
        <button
          className={`btn ${activeSection === 'register' ? 'btn-primary' : ''}`}
          onClick={() => setActiveSection('register')}
          style={{ flex: 1, justifyContent: 'center' }}
        >REGISTER</button>
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
        <div className="dash-section fade-in">
          <div className="dash-section-head">
            <h3>Registered Volunteers ({volunteers.length})</h3>
            {selectedVolunteers.length > 0 && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue-600)' }}>
                  {selectedVolunteers.length} SELECTED
                </span>
                <input 
                  type="text" 
                  placeholder="Type broadcast message..." 
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  style={{ ...inputStyle, width: 250, height: 32, fontSize: 11, padding: '4px 10px' }}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleBroadcast}
                  disabled={isBroadcasting || !broadcastMessage.trim()}
                  style={{ height: 32, fontSize: 10, padding: '0 12px', justifyContent: 'center' }}
                >
                  {isBroadcasting ? 'SENDING...' : 'SEND WHATSAPP'}
                </button>
              </div>
            )}
          </div>
          <div className="dash-section-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedVolunteers(volunteers.map(v => v.id));
                        else setSelectedVolunteers([]);
                      }}
                      checked={selectedVolunteers.length === volunteers.length && volunteers.length > 0}
                    />
                  </th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Pincode</th>
                  <th>Aadhar</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map(v => (
                  <tr key={v.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedVolunteers.includes(v.id)}
                        onChange={() => toggleVolunteerSelection(v.id)}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>{v.name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{maskPhone(v.phone)}</td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{v.pincode || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-500)' }}>{v.aadhar ? `****${v.aadhar.slice(-4)}` : '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--gray-500)', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.address || ''}>
                      {v.address || (v.district ? `${v.district}, ${v.state}` : '—')}
                    </td>
                    <td><span className={`pill ${v.status === 'active' ? 'pill-live' : 'pill-blue'}`}>{v.status}</span></td>
                    <td style={{ textAlign: 'center' }}>{v.assigned_tasks}</td>
                    <td style={{ textAlign: 'center' }}>{v.completed_tasks}</td>
                    <td style={{ fontSize: 11, color: 'var(--gray-500)' }}>{formatDateTime(v.registered_at)}</td>
                  </tr>
                ))}
                {volunteers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray-400)', fontWeight: 600 }}>
                      No volunteers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REGISTER VOLUNTEER Section ── */}
      {activeSection === 'register' && (
        <div className="dash-grid-wide">
          <div className="dash-section">
            <div className="dash-section-head"><h3>Individual Registration</h3></div>
            <div className="dash-section-body">
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Volunteer Name *</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={e => setRegisterName(e.target.value)}
                    required
                    placeholder="Full name"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Phone Number *</label>
                  <input
                    type="tel"
                    value={registerPhone}
                    onChange={e => setRegisterPhone(e.target.value)}
                    required
                    placeholder="e.g. 9876543210"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Pincode</label>
                  <input
                    type="text"
                    value={registerPincode}
                    onChange={e => setRegisterPincode(e.target.value)}
                    placeholder="6-digit pincode"
                    style={inputStyle}
                    maxLength="6"
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Address (House/Flat, Street)</label>
                  <input
                    type="text"
                    value={registerAddress}
                    onChange={e => setRegisterAddress(e.target.value)}
                    placeholder="Full address details"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Aadhar Number</label>
                  <input
                    type="text"
                    value={registerAadhar}
                    onChange={e => setRegisterAadhar(e.target.value)}
                    placeholder="12-digit Aadhar"
                    style={inputStyle}
                    maxLength="12"
                  />
                </div>
                <div style={{ marginBottom: 16, fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>
                  Booth: {boothId || 'Not assigned'}
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={registering || !registerName.trim() || !registerPhone.trim()}
                  style={{ width: '100%', justifyContent: 'center', padding: '14px 0', fontSize: 13 }}
                >
                  {registering ? 'REGISTERING\u2026' : '\u2705  CONFIRM REGISTRATION'}
                </button>
                {registerResult && (
                  <div style={{
                    marginTop: 12, padding: '12px 16px', borderRadius: 'var(--radius)',
                    background: registerResult.ok ? 'var(--green-50)' : 'var(--red-50)',
                    color: registerResult.ok ? 'var(--green-500)' : 'var(--red-500)',
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {registerResult.msg}
                  </div>
                )}
              </form>
            </div>
          </div>

           <div className="dash-section">
            <div className="dash-section-head"><h3>Batch Upload</h3></div>
            <div className="dash-section-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
               <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
               <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Bulk Import Volunteers</h4>
               <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 20 }}>
                 Upload a JSON file containing a list of volunteers with <strong>name</strong> and <strong>phone</strong> fields.
               </p>
               <input 
                 type="file" 
                 id="vol-batch" 
                 accept=".json" 
                 onChange={handleVolunteerUpload} 
                 style={{ display: 'none' }} 
               />
               <button 
                className="btn btn-secondary" 
                disabled={uploadingVolunteers}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => document.getElementById('vol-batch').click()}
               >
                 {uploadingVolunteers ? 'IMPORTING...' : 'SELECT JSON FILE (.json)'}
               </button>
            </div>
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

/* ── Broadcast Terminal (Dedicated messaging view) ─────────────────── */

function BroadcastTerminal({ boothId }) {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVolunteers, setSelectedVolunteers] = useState([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/volunteers/?booth_id=${encodeURIComponent(boothId)}`);
      if (res.ok) setVolunteers(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [boothId]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/v1/volunteers/broadcasts/history', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setHistory(await res.json());
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { fetchVolunteers(); fetchHistory(); }, [fetchVolunteers, fetchHistory]);

  const toggleVolunteerSelection = (id) => {
    setSelectedVolunteers(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() || selectedVolunteers.length === 0) return;
    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/v1/volunteers/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          volunteer_ids: selectedVolunteers,
          message: broadcastMessage.trim()
        }),
      });
      if (!res.ok) throw new Error('Broadcast failed');
      setBroadcastMessage('');
      setSelectedVolunteers([]);
      fetchHistory(); // refresh history after send
    } catch (err) {
      alert(err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Broadcast Center</div>
          <div className="dash-page-subtitle">Send targeted WhatsApp messages to your field staff</div>
        </div>
        <button className="btn btn-primary" onClick={fetchVolunteers}>↻ REFRESH LIST</button>
      </div>

      <div className="dash-grid-wide" style={{ gridTemplateColumns: 'minmax(0, 1fr) 350px' }}>
        <div className="dash-section">
          <div className="dash-section-head">
            <h3>Select Recipients ({volunteers.length})</h3>
            <button 
              className="btn" 
              style={{ fontSize: 10, padding: '4px 8px' }}
              onClick={() => {
                if (selectedVolunteers.length === volunteers.length) setSelectedVolunteers([]);
                else setSelectedVolunteers(volunteers.map(v => v.id));
              }}
            >
              {selectedVolunteers.length === volunteers.length ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>
          </div>
          <div className="dash-section-body" style={{ padding: 0, overflowX: 'auto', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map(v => (
                  <tr 
                    key={v.id} 
                    onClick={() => toggleVolunteerSelection(v.id)}
                    style={{ cursor: 'pointer', background: selectedVolunteers.includes(v.id) ? 'var(--blue-50)' : 'transparent' }}
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedVolunteers.includes(v.id)}
                        onChange={() => {}} // Handled by tr onClick
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>{v.name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{maskPhone(v.phone)}</td>
                    <td><span className={`pill ${v.status === 'active' ? 'pill-live' : 'pill-blue'}`}>{v.status}</span></td>
                  </tr>
                ))}
                {volunteers.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray-400)', fontWeight: 600 }}>
                      No volunteers available to message.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-head"><h3>Message Composer</h3></div>
          <div className="dash-section-body">
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Recipients</label>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-600)', background: 'var(--blue-50)', padding: '12px', borderRadius: 'var(--radius)' }}>
                {selectedVolunteers.length} volunteer(s) selected
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>WhatsApp Content</label>
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="Enter the instruction or announcement for your volunteers..."
                style={{ ...inputStyle, minHeight: 180, resize: 'none', fontSize: 14 }}
              />
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleBroadcast}
              disabled={isBroadcasting || !broadcastMessage.trim() || selectedVolunteers.length === 0}
              style={{ width: '100%', justifyContent: 'center', padding: '16px 0', fontSize: 14 }}
            >
              {isBroadcasting ? 'TRANSMITTING...' : '🚀 SEND BROADCAST NOW'}
            </button>
            <p style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 12, textAlign: 'center', fontWeight: 600 }}>
              Messages will be delivered via Meta WhatsApp Cloud API.
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent Broadcasts History ── */}
      <div className="dash-section" style={{ marginTop: 20 }}>
        <div className="dash-section-head">
          <h3>Recent Broadcasts ({history.length})</h3>
          <button className="btn" style={{ fontSize: 10, padding: '4px 8px' }} onClick={fetchHistory}>↻ REFRESH</button>
        </div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          {historyLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>Loading history…</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>
              No broadcasts sent yet. Send your first message above!
            </div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Recipients</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b, i) => (
                  <tr key={b.id || i}>
                    <td style={{ maxWidth: 400 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{b.message}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 600, textAlign: 'center' }}>
                      <span className="pill pill-blue">{b.recipient_count} volunteer{b.recipient_count !== 1 ? 's' : ''}</span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{formatDateTime(b.sent_at)}</td>
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

const labelStyle = { fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 12px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-900)', fontFamily: 'inherit' };


function DataManagement({ boothId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/ingest/voters', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Server returned non-JSON response:", text);
        throw new Error(`Server Error: ${res.status}. See console for details.`);
      }

      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setResult({ ok: true, msg: `Successfully processed ${data.voters_processed} voters for Booth ${data.booth_id}.` });
      setFile(null);
    } catch (err) {
      setResult({ ok: false, msg: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div className="dash-page-title">Data Management</div>
      </div>

      <div className="dash-grid-wide">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Voter Data Ingestion</h3></div>
          <div className="dash-section-body">
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 20 }}>
              Upload your regional electoral roll (JSON format) to activate the BOSI Index, Household Grid, and Volunteer Coverage tracking.
            </p>
            
            <form onSubmit={handleUpload}>
              <div style={{ padding: 32, border: '2px dashed var(--gray-200)', borderRadius: 'var(--radius)', textAlign: 'center', marginBottom: 20 }}>
                <input 
                  type="file" 
                  accept=".json" 
                  id="voter-file"
                  onChange={e => setFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label htmlFor="voter-file" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--blue-600)' }}>
                    {file ? file.name : 'Click to select voter JSON file'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>Example: part_374/electoral_roll_hindi.json</div>
                </label>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!file || uploading}
                style={{ width: '100%', justifyContent: 'center', padding: '14px 0' }}
              >
                {uploading ? 'PROCESSING...' : '🚀 START INGESTION'}
              </button>
            </form>

            {result && (
              <div style={{ 
                marginTop: 20, padding: 16, borderRadius: 'var(--radius)',
                background: result.ok ? 'var(--green-50)' : 'var(--red-50)',
                color: result.ok ? 'var(--green-600)' : 'var(--red-600)',
                fontSize: 13, fontWeight: 700
              }}>
                {result.msg}
              </div>
            )}
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-head"><h3>System Status</h3></div>
          <div className="dash-section-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <StatusRow label="SQLite Sync" status="Operational" />
              <StatusRow label="Neo4j Knowledge Graph" status="Operational" />
              <StatusRow label="BOSI Engine" status="Ready for Data" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, status }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--gray-100)' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)' }}>{label}</span>
      <span className="pill pill-live" style={{ fontSize: 10 }}>{status}</span>
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
