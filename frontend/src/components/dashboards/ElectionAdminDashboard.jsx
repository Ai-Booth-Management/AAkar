"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserCog, Database, Globe, Settings, Plus, ArrowLeft, Shield, Loader2 } from 'lucide-react';

const API = '/api/v1/admin';

function getToken() {
  return localStorage.getItem('token') || '';
}

const ROLE_OPTIONS = [
  { value: 'ELECTION_ADMIN', label: 'Election Admin', color: '#7c3aed' },
  { value: 'STATE_ADMIN', label: 'State Admin', color: '#2563eb' },
  { value: 'DISTRICT_ADMIN', label: 'District Admin', color: '#0891b2' },
  { value: 'CONSTITUENCY_MGR', label: 'Constituency Manager', color: '#059669' },
  { value: 'MANDAL_MGR', label: 'Mandal Manager', color: '#d97706' },
  { value: 'BOOTH_PRESIDENT', label: 'Booth President', color: '#dc2626' },
];

const ROLE_HIERARCHY = {
  ELECTION_ADMIN: [],
  STATE_ADMIN: ['state'],
  DISTRICT_ADMIN: ['state', 'district'],
  CONSTITUENCY_MGR: ['state', 'district', 'constituency'],
  MANDAL_MGR: ['state', 'district', 'constituency', 'mandal'],
  BOOTH_PRESIDENT: ['state', 'district', 'constituency', 'mandal', 'booth'],
};

export default function ElectionAdminDashboard({ tab, hierarchy }) {
  switch (tab) {
    case 'users':          return <UserManagement />;
    case 'data':           return <DataManagement />;
    case 'constituencies': return <ConstituencySetup />;
    case 'settings':       return <SystemSettings />;
    default:               return <UserManagement />;
  }
}

function fetchHierarchy(parentCode, level) {
  const params = new URLSearchParams({ level });
  if (parentCode) params.set('parent_code', parentCode);
  const token = getToken();
  return fetch(`${API}/hierarchy/flat?${params}`, {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  }).then(r => r.ok ? r.json() : []);
}

function UserManagement() {
  const [mode, setMode] = useState('view');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [hierarchy, setHierarchy] = useState({ states: [], districts: [], constituencies: [] });
  const [submitting, setSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

  const assign = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('assign_prefill') || '{}'); } catch { return {}; } })()
    : {};

  const [form, setForm] = useState({
    email: '', password: '', display_name: '',
    role: assign.state ? 'CONSTITUENCY_MGR' : 'STATE_ADMIN',
    state_id: assign.state || '',
    district_id: assign.district || '',
    constituency_id: assign.constituency || '',
  });

  useEffect(() => {
    if (assign.state || assign.district || assign.constituency) {
      setMode('add');
      sessionStorage.removeItem('assign_prefill');
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    try {
      const res = await fetch(`${API}/users`, { headers });
      if (!res.ok) throw new Error('Failed to fetch users');
      setUsers(await res.json());
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchHierarchyData = useCallback(async (prefillState, prefillDistrict) => {
    const states = await fetchHierarchy(null, 'state');
    let districts = [];
    let constituencies = [];
    if (prefillState) {
      districts = await fetchHierarchy(prefillState, 'district');
      if (prefillDistrict) {
        constituencies = await fetchHierarchy(prefillDistrict, 'constituency');
      }
    }
    setHierarchy({ states, districts, constituencies });
  }, []);

  useEffect(() => {
    if (mode === 'add') {
      fetchHierarchyData(form.state_id, form.district_id);
    }
  }, [mode, form.state_id, form.district_id, fetchHierarchyData]);

  const handleStateChange = async (code) => {
    setForm({ ...form, state_id: code, district_id: '', constituency_id: '' });
    const districts = code ? await fetchHierarchy(code, 'district') : [];
    setHierarchy(prev => ({ ...prev, districts, constituencies: [] }));
  };

  const handleDistrictChange = async (code) => {
    setForm({ ...form, district_id: code, constituency_id: '' });
    const constituencies = code ? await fetchHierarchy(code, 'constituency') : [];
    setHierarchy(prev => ({ ...prev, constituencies }));
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setDeleting(userId);
    setError('');
    const token = getToken();
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: 'DELETE',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Delete failed');
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      setError(e.message);
    }
    setDeleting(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setSubmitting(true);
    setError('');
    const token = getToken();
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || 'Failed to create user');
      }
      const data = await res.json();
      setForm({ email: '', password: '', display_name: '', role: 'STATE_ADMIN', state_id: '', district_id: '', constituency_id: '' });
      setMode('view');
      fetchData();
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  const roleCounts = {};
  const grouped = {};
  for (const r of ROLE_OPTIONS) {
    roleCounts[r.value] = 0;
    grouped[r.value] = [];
  }
  grouped._other = [];
  for (const u of users) {
    if (grouped[u.role]) {
      grouped[u.role].push(u);
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    } else {
      grouped._other.push(u);
      roleCounts._other = (roleCounts._other || 0) + 1;
    }
  }

  const renderUserRow = (u) => (
    <tr key={u.id}>
      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.email}</td>
      <td style={{ fontWeight: 600 }}>{u.display_name || '—'}</td>
      <td>
        <span className="pill" style={{
          backgroundColor: (ROLE_OPTIONS.find(r => r.value === u.role)?.color || '#6b7280') + '20',
          color: ROLE_OPTIONS.find(r => r.value === u.role)?.color || '#6b7280',
          border: '1px solid ' + (ROLE_OPTIONS.find(r => r.value === u.role)?.color || '#6b7280') + '40'
        }}>
          {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
        </span>
      </td>
      <td style={{ fontSize: 12, color: 'var(--gray-600)' }}>{[u.state_id, u.district_id, u.constituency_id].filter(Boolean).join(' / ') || '—'}</td>
      <td>
        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(u.id)} disabled={deleting === u.id} title={deleting === u.id ? 'Deleting...' : 'Delete user'}>
          <Shield size={14} />
        </button>
      </td>
    </tr>
  );

  const columns = ['Email', 'Name', 'Role', 'Hierarchy', ''];

  const categoryOrder = [...ROLE_OPTIONS, { value: '_other', label: 'Other Roles', color: '#6b7280' }];

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title"><UserCog size={22} style={{ display: 'inline', marginRight: 8 }} /> User Management</div>
          <div className="dash-page-subtitle" style={{ color: 'var(--gray-600)', fontWeight: 600 }}>Manage all platform users and their role assignments</div>
        </div>
        {mode === 'add' ? (
          <div className="dash-action-row">
            <button className="btn btn-secondary" onClick={() => { setMode('view'); setError(''); }}>
              <ArrowLeft size={14} /> Back
            </button>
          </div>
        ) : (
          <div className="dash-action-row">
            <button className="btn btn-primary" onClick={() => { setForm({ email: '', password: '', display_name: '', role: 'STATE_ADMIN', state_id: '', district_id: '', constituency_id: '' }); setMode('add'); setHierarchy({ states: [], districts: [], constituencies: [] }); }}>
              <Plus size={14} /> Add Member
            </button>
          </div>
        )}
      </div>

      {error && <div className="dash-alert dash-alert-error">{error}</div>}

      {mode === 'add' ? (
        <div className="dash-section" style={{ maxWidth: 480 }}>
          <div className="dash-section-head"><h3>Create New User</h3></div>
          <div className="dash-section-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" required placeholder="user@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="text" required placeholder="set a password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Display Name</label>
                <input placeholder="Full name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, state_id: '', district_id: '', constituency_id: '' })}>
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {form.role === 'ELECTION_ADMIN' && (
                <div className="dash-alert" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontSize: 11, padding: '8px 12px', margin: 0 }}>
                  Election Admins have full system access and do not require hierarchy assignment.
                </div>
              )}

              {ROLE_HIERARCHY[form.role]?.includes('state') && (
                <div className="form-group">
                  <label>State</label>
                  <select value={form.state_id} onChange={e => handleStateChange(e.target.value)} required={form.role !== 'ELECTION_ADMIN'}>
                    <option value="">— Select State —</option>
                    {hierarchy.states.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
              )}

              {ROLE_HIERARCHY[form.role]?.includes('district') && form.state_id && (
                <div className="form-group">
                  <label>District</label>
                  <select value={form.district_id} onChange={e => handleDistrictChange(e.target.value)} required>
                    <option value="">— Select District —</option>
                    {hierarchy.districts.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
              )}

              {ROLE_HIERARCHY[form.role]?.includes('constituency') && form.district_id && (
                <div className="form-group">
                  <label>Constituency</label>
                  <select value={form.constituency_id} onChange={e => setForm({ ...form, constituency_id: e.target.value })} required>
                    <option value="">— Select Constituency —</option>
                    {hierarchy.constituencies.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="dash-stats" style={{ marginBottom: 20 }}>
          {[{ value: null, label: 'Total', color: '#6366f1' }, ...ROLE_OPTIONS, { value: '_other', label: 'Other', color: '#6b7280' }].map(opt => (
            <div key={opt.label} className="dash-stat" style={{ borderTop: `3px solid ${opt.color || '#6366f1'}` }}>
              <div className="ds-label" style={{ color: 'var(--gray-600)' }}>{opt.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px' }}>{opt.value ? (roleCounts[opt.value] || 0) : users.length}</div>
            </div>
          ))}
        </div>
      )}

      {mode === 'view' && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Filter by Role</label>
          <select
            className="form-control"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{ maxWidth: 260, fontSize: 13 }}
          >
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            <option value="_other">Other</option>
          </select>
        </div>
      )}

      {mode === 'view' && !loading && users.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-body" style={{ padding: 0 }}>
            {categoryOrder.filter(cat => !roleFilter || cat.value === roleFilter).map(cat => {
              const members = grouped[cat.value];
              if (!members || members.length === 0) return null;
              return (
                  <div key={cat.value} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ padding: '8px 20px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: cat.color || 'var(--gray-700)' }}>{cat.label}</span>
                    <span className="pill" style={{ backgroundColor: (cat.color || '#6b7280') + '20', color: cat.color || '#6b7280', border: '1px solid ' + (cat.color || '#6b7280') + '40', fontSize: 9 }}>{members.length}</span>
                  </div>
                  <table>
                    <thead>
                      <tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {members.map(renderUserRow)}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'view' && loading && (
        <div style={{ textAlign: 'center', padding: 36 }}><Loader2 size={24} className="spin" style={{ color: 'var(--gray-400)' }} /></div>
      )}

      {mode === 'view' && !loading && users.length === 0 && (
        <div className="dash-section">
          <div className="dash-section-body" style={{ textAlign: 'center', padding: '32px' }}>
            <div className="ds-label" style={{ fontSize: 14 }}>No users found</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataManagement() {
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title"><Database size={22} style={{ display: 'inline', marginRight: 8 }} /> Data Management</div>
          <div className="dash-page-subtitle">Upload and manage election data</div>
        </div>
      </div>
      <div className="dash-section">
        <div className="dash-section-body" style={{ textAlign: 'center', padding: '32px' }}>
          <div className="ds-label" style={{ fontSize: 14 }}>Data upload and management tools coming soon.</div>
        </div>
      </div>
    </div>
  );
}

function SystemSettings() {
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title"><Settings size={22} style={{ display: 'inline', marginRight: 8 }} /> System Settings</div>
          <div className="dash-page-subtitle">Configure system preferences</div>
        </div>
      </div>
      <div className="dash-section">
        <div className="dash-section-body" style={{ textAlign: 'center', padding: '32px' }}>
          <div className="ds-label" style={{ fontSize: 14 }}>System configuration options coming soon.</div>
        </div>
      </div>
    </div>
  );
}

function ConstituencySetup() {
  const router = useRouter();
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [inchages, setInchages] = useState({});
  const [allMgrs, setAllMgrs] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [assigningConstituency, setAssigningConstituency] = useState(null);
  const [assigningUser, setAssigningUser] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [addForm, setAddForm] = useState({ code: '', name: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchHierarchy(null, 'state').then(setStates);
  }, []);

  const handleStateChange = async (code) => {
    setSelectedState(code);
    setSelectedDistrict('');
    setConstituencies([]);
    setInchages({});
    if (code) {
      setLoading(true);
      const dists = await fetchHierarchy(code, 'district');
      setDistricts(dists);
      setLoading(false);
    } else {
      setDistricts([]);
    }
  };

  const handleDistrictChange = async (code) => {
    setSelectedDistrict(code);
    if (code) {
      setLoading(true);
      setError('');
      const token = getToken();
      const headers = { ...(token && { Authorization: `Bearer ${token}` }) };
      try {
        const [constit, usersRes] = await Promise.all([
          fetchHierarchy(code, 'constituency'),
          fetch(`${API}/users?role=CONSTITUENCY_MGR`, { headers }),
        ]);
        setConstituencies(constit);
        const mgrs = usersRes.ok ? await usersRes.json().catch(() => []) : [];
        setAllMgrs(mgrs);
        const inch = {};
        mgrs.forEach(u => { if (u.constituency_id) inch[u.constituency_id] = u.display_name || u.email; });
        setInchages(inch);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    } else {
      setConstituencies([]);
      setInchages({});
    }
  };

  const handleAddConstituency = async (e) => {
    e.preventDefault();
    if (!addForm.code || !addForm.name) return;
    setAdding(true);
    setError('');
    const token = getToken();
    try {
      const res = await fetch(`${API}/hierarchy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ code: addForm.code, name: addForm.name, level: 'constituency', parent_code: selectedDistrict }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || 'Failed to add constituency');
      }
      const data = await res.json();
      setShowAddForm(false);
      setAddForm({ code: '', name: '' });
      handleDistrictChange(selectedDistrict);
    } catch (e) {
      setError(e.message);
    }
    setAdding(false);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assigningUser) return;
    setAssigning(true);
    setError('');
    const token = getToken();
    try {
      const res = await fetch(`${API}/users/${assigningUser}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ constituency_id: assigningConstituency }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to assign');
      }
      setAssigningConstituency(null);
      setAssigningUser('');
      handleDistrictChange(selectedDistrict);
    } catch (e) {
      setError(e.message);
    }
    setAssigning(false);
  };

  const unassignedMgrs = allMgrs.filter(u => !u.constituency_id);

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title"><Globe size={22} style={{ display: 'inline', marginRight: 8 }} /> Constituency Setup</div>
          <div className="dash-page-subtitle">View and manage constituencies, assign managers</div>
        </div>
      </div>

      {error && <div className="dash-alert dash-alert-error">{error}</div>}

      <div className="form-grid-2" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label>State</label>
          <select value={selectedState} onChange={e => handleStateChange(e.target.value)}>
            <option value="">— Select State —</option>
            {states.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>District</label>
          <select value={selectedDistrict} onChange={e => handleDistrictChange(e.target.value)} disabled={!selectedState}>
            <option value="">— Select District —</option>
            {districts.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
          </select>
        </div>
      </div>

      {selectedDistrict && (
        <div className="dash-section" style={{ marginBottom: 24 }}>
          <div className="dash-section-head">
            <h3>Constituencies — {districts.find(d => d.code === selectedDistrict)?.name || selectedDistrict}</h3>
            <button className="btn btn-primary" onClick={() => { setShowAddForm(true); setAddForm({ code: '', name: '' }); }} style={{ fontSize: 10 }}>
              <Plus size={13} /> Add Constituency
            </button>
          </div>
          <div className="dash-section-body" style={{ padding: 0 }}>
            {showAddForm && (
              <form onSubmit={handleAddConstituency} className="dash-inset-form">
                <input required placeholder="Code (e.g. NWD-03)" value={addForm.code} onChange={e => setAddForm({ ...addForm, code: e.target.value })} />
                <input required placeholder="Name (e.g. New Constituency)" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
                <button type="submit" className="btn btn-primary" disabled={adding} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                  {adding ? 'Adding...' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)} style={{ fontSize: 10 }}>Cancel</button>
              </form>
            )}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 36 }}><Loader2 size={24} className="spin" style={{ color: 'var(--gray-400)' }} /></div>
            ) : constituencies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)', fontWeight: 600, fontSize: 13 }}>
                No constituencies found in this district
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Incharge</th>
                    <th style={{ width: 160 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {constituencies.map(c => (
                    <tr key={c.code}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{inchages[c.code] || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {inchages[c.code] ? (
                            <span className="pill" style={{ backgroundColor: '#05966920', color: '#059669', border: '1px solid #05966940' }}>ASSIGNED</span>
                          ) : (
                            <>
                              <span className="pill" style={{ backgroundColor: '#dc262620', color: '#dc2626', border: '1px solid #dc262640' }}>UNASSIGNED</span>
                              <button className="btn btn-primary" style={{ fontSize: 9, padding: '4px 10px', height: 'auto', lineHeight: 1.5 }}
                                onClick={() => {
                                  sessionStorage.setItem('assign_prefill', JSON.stringify({ state: selectedState, district: selectedDistrict, constituency: c.code }));
                                  router.push('/election?tab=users');
                                }}>
                                ASSIGN
                              </button>
                            </>
                          )}
                        </div>
                        {assigningConstituency === c.code && (
                          <form onSubmit={handleAssign} className="dash-inset-form" style={{ padding: '8px 0', border: 'none', marginTop: 8 }}>
                            <select value={assigningUser} onChange={e => setAssigningUser(e.target.value)} style={{ flex: 1, fontSize: 10, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--gray-200)' }}>
                              <option value="">— Select MGR —</option>
                              {unassignedMgrs.map(u => <option key={u.id} value={u.id}>{u.display_name || u.email}</option>)}
                            </select>
                            <button type="submit" className="btn btn-primary" disabled={assigning || !assigningUser} style={{ fontSize: 9, padding: '4px 8px', lineHeight: 1.4 }}>
                              {assigning ? '...' : 'Go'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setAssigningConstituency(null)} style={{ fontSize: 9, padding: '4px 8px', lineHeight: 1.4 }}>✕</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!selectedDistrict && (
        <div className="dash-section">
          <div className="dash-section-body" style={{ textAlign: 'center', padding: '32px' }}>
            <div className="ds-label" style={{ fontSize: 14 }}>Select a state and district above to view constituencies</div>
          </div>
        </div>
      )}
    </div>
  );
}
