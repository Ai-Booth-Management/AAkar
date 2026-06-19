"use client";
import React, { useState, useEffect } from 'react';

const API = '/api/v1/admin';
const token = () => localStorage.getItem('token');
const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

const ROLE_LABELS = {
  STATE_ADMIN: 'State Admin',
  DISTRICT_ADMIN: 'District Admin',
  CONSTITUENCY_MGR: 'Constituency Manager',
  MANDAL_MGR: 'Mandal Manager',
  BOOTH_PRESIDENT: 'Booth President',
};

async function fetchHierarchy(level, parentCode) {
  try {
    const url = parentCode
      ? `/api/v1/admin/hierarchy/flat?level=${level}&parent_code=${parentCode}`
      : `/api/v1/admin/hierarchy/flat?level=${level}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export default function ManageUsers({ role, hierarchy: userHierarchy }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [booths, setBooths] = useState([]);

  const [form, setForm] = useState({
    email: '',
    password: '',
    display_name: '',
    role: '',
    state_id: userHierarchy?.state || '',
    district_id: '',
    constituency_id: '',
    mandal_id: '',
    booth_id: '',
  });

  const canCreate = {
    STATE_ADMIN: [{ value: 'DISTRICT_ADMIN', label: 'District Admin' }],
    DISTRICT_ADMIN: [{ value: 'CONSTITUENCY_MGR', label: 'Constituency Manager' }],
    CONSTITUENCY_MGR: [{ value: 'MANDAL_MGR', label: 'Mandal Manager' }],
    MANDAL_MGR: [{ value: 'BOOTH_PRESIDENT', label: 'Booth President' }],
  };

  const roleOptions = canCreate[role] || [];

  useEffect(() => {
    if (role) fetchUsers();
  }, [role]);

  useEffect(() => {
    if (role === 'STATE_ADMIN' && userHierarchy?.state) {
      fetchHierarchy('district', userHierarchy.state).then(setDistricts);
    }
  }, [role, userHierarchy]);

  useEffect(() => {
    if (form.district_id) {
      fetchHierarchy('constituency', form.district_id).then(setConstituencies);
    } else {
      setConstituencies([]);
    }
  }, [form.district_id]);

  useEffect(() => {
    if (form.constituency_id) {
      fetchHierarchy('mandal', form.constituency_id).then(setMandals);
    } else {
      setMandals([]);
    }
  }, [form.constituency_id]);

  useEffect(() => {
    if (form.mandal_id) {
      fetchHierarchy('booth', form.mandal_id).then(setBooths);
    } else {
      setBooths([]);
    }
  }, [form.mandal_id]);

  // Auto-fill district/constituency from the creator's hierarchy when target role is selected
  const setRole = (newRole) => {
    const updates = { role: newRole, district_id: '', constituency_id: '', mandal_id: '', booth_id: '' };
    if (newRole === 'DISTRICT_ADMIN' && role === 'STATE_ADMIN' && userHierarchy?.state) {
      // need district selector — leave district_id blank for user to pick
    }
    if (newRole === 'CONSTITUENCY_MGR' && role === 'DISTRICT_ADMIN' && userHierarchy?.district) {
      updates.district_id = userHierarchy.district;
      fetchHierarchy('constituency', userHierarchy.district).then(setConstituencies);
    }
    if (newRole === 'MANDAL_MGR' && role === 'CONSTITUENCY_MGR' && userHierarchy?.constituency) {
      updates.district_id = userHierarchy.district || '';
      updates.constituency_id = userHierarchy.constituency;
      if (userHierarchy.constituency) fetchHierarchy('mandal', userHierarchy.constituency).then(setMandals);
    }
    if (newRole === 'BOOTH_PRESIDENT' && role === 'MANDAL_MGR' && userHierarchy?.mandal) {
      updates.district_id = userHierarchy.district || '';
      updates.constituency_id = userHierarchy.constituency || '';
      updates.mandal_id = userHierarchy.mandal;
      if (userHierarchy.mandal) fetchHierarchy('booth', userHierarchy.mandal).then(setBooths);
    }
    setForm(f => ({ ...f, ...updates }));
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/v1/admin/users`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setForm({ email: '', password: '', display_name: '', role: form.role, state_id: userHierarchy?.state || '', district_id: '', constituency_id: '', mandal_id: '', booth_id: '' });
        fetchUsers();
      } else {
        setError(data.detail || `Error ${res.status}`);
      }
    } catch (e) {
      setError('Network error');
    }
    setSubmitting(false);
  };

  const targetRole = form.role;
  const targetLabel = roleOptions.find(r => r.value === form.role)?.label || 'User';
  // STATE_ADMIN creates DISTRICT_ADMIN → needs to pick a district
  // DISTRICT_ADMIN creates CONSTITUENCY_MGR → district is auto-set, no picker needed
  // CONSTITUENCY_MGR creates MANDAL_MGR → district & constituency auto-set, no pickers
  const showDistrict = targetRole === 'DISTRICT_ADMIN';
  const showConstituency = targetRole === 'CONSTITUENCY_MGR' && role === 'DISTRICT_ADMIN';
  const showMandal = targetRole === 'MANDAL_MGR' && role === 'CONSTITUENCY_MGR';
  const showBooth = targetRole === 'BOOTH_PRESIDENT' && role === 'MANDAL_MGR';

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Manage Users</div>
          <div className="dash-page-subtitle">Create new {targetLabel.toLowerCase()} accounts</div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head"><h3>Create New {targetLabel.toUpperCase()}</h3></div>
        <div className="dash-section-body">
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label>Target Role</label>
              <select value={form.role} onChange={e => setRole(e.target.value)} required style={{ width: '100%' }}>
                <option value="">-- Select role --</option>
                {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" required placeholder="user@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input type="text" required placeholder="set a password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Display Name</label>
              <input placeholder="Full name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} style={{ width: '100%' }} />
            </div>

            {showDistrict && (
              <div className="form-group">
                <label>District</label>
                <select value={form.district_id} onChange={e => setForm({ ...form, district_id: e.target.value, constituency_id: '', mandal_id: '' })} required={role !== 'CONSTITUENCY_MGR'} style={{ width: '100%' }}>
                  <option value="">-- Select district --</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </div>
            )}

            {showConstituency && (
              <div className="form-group">
                <label>Constituency</label>
                <select value={form.constituency_id} onChange={e => setForm({ ...form, constituency_id: e.target.value, mandal_id: '' })} required={role !== 'CONSTITUENCY_MGR'} disabled={!form.district_id && role !== 'CONSTITUENCY_MGR'} style={{ width: '100%' }}>
                  <option value="">-- Select constituency --</option>
                  {constituencies.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            )}

            {showMandal && (
              <div className="form-group">
                <label>Mandal / Sector</label>
                <select value={form.mandal_id} onChange={e => setForm({ ...form, mandal_id: e.target.value })} required disabled={!form.constituency_id} style={{ width: '100%' }}>
                  <option value="">-- Select mandal --</option>
                  {mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                </select>
              </div>
            )}

            {showBooth && (
              <div className="form-group">
                <label>Booth</label>
                <select value={form.booth_id} onChange={e => setForm({ ...form, booth_id: e.target.value })} required disabled={!form.mandal_id} style={{ width: '100%' }}>
                  <option value="">-- Select booth --</option>
                  {booths.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                </select>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={submitting || !form.role || !form.email || !form.password}>
              {submitting ? 'CREATING...' : `CREATE ${targetLabel.toUpperCase()}`}
            </button>
          </form>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head"><h3>All Users in Your Hierarchy</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Hierarchy</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.email}</td>
                  <td>{u.display_name || '—'}</td>
                  <td><span className="badge badge-med">{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                    {[u.state_id, u.district_id, u.constituency_id, u.mandal_id, u.booth_id].filter(Boolean).join(' / ') || '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
