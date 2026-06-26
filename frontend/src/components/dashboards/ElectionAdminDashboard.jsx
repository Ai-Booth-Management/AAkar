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
      <td style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, color: 'var(--navy-900)' }}>{u.email}</td>
      <td style={{ fontWeight: 600 }}>{u.display_name || '—'}</td>
      <td>
        <span className="admin-badge" style={{
          backgroundColor: (ROLE_OPTIONS.find(r => r.value === u.role)?.color || '#64748b') + '15',
          color: ROLE_OPTIONS.find(r => r.value === u.role)?.color || '#64748b',
          border: '1px solid ' + (ROLE_OPTIONS.find(r => r.value === u.role)?.color || '#64748b') + '30',
          fontWeight: 800
        }}>
          {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
        </span>
      </td>
      <td style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 600 }}>{[u.state_id, u.district_id, u.constituency_id].filter(Boolean).join(' / ') || '—'}</td>
      <td>
        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(u.id)} disabled={deleting === u.id} title={deleting === u.id ? 'Deleting...' : 'Delete user'} style={{ borderRadius: 'var(--radius-sm)' }}>
          <Shield size={14} />
        </button>
      </td>
    </tr>
  );

  const columns = ['Email', 'Name', 'Role', 'Hierarchy', 'Actions'];

  const categoryOrder = [...ROLE_OPTIONS, { value: '_other', label: 'Other Roles', color: '#6b7280' }];

  return (
    <div className="fade-in">
      <div className="dash-page-header" style={{ borderBottom: '2px solid var(--navy-900)', paddingBottom: 24, marginBottom: 32 }}>
        <div>
          <div className="dash-page-title" style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.5px' }}>
            <UserCog size={28} style={{ display: 'inline', marginRight: 12, color: 'var(--amber-500)' }} /> 
            User Management
          </div>
          <div className="dash-page-subtitle" style={{ color: 'var(--gray-500)', fontWeight: 600, marginTop: 4 }}>Command and Control: Admin User Directory</div>
        </div>
        {mode === 'add' ? (
          <div className="dash-action-row">
            <button className="btn btn-secondary" onClick={() => { setMode('view'); setError(''); }} style={{ borderRadius: 'var(--radius-sm)', fontWeight: 800 }}>
              <ArrowLeft size={14} /> BACK TO DIRECTORY
            </button>
          </div>
        ) : (
          <div className="dash-action-row">
            <button className="btn btn-primary" onClick={() => { setForm({ email: '', password: '', display_name: '', role: 'STATE_ADMIN', state_id: '', district_id: '', constituency_id: '' }); setMode('add'); setHierarchy({ states: [], districts: [], constituencies: [] }); }} style={{ background: 'var(--navy-900)', color: 'var(--white)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 20px', fontWeight: 800 }}>
              <Plus size={16} /> NEW MEMBER
            </button>
          </div>
        )}
      </div>

      {error && <div className="dash-alert dash-alert-error">{error}</div>}

      {mode === 'add' ? (
        <div className="admin-form-card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ marginBottom: 32, borderBottom: '1px solid var(--gray-200)', paddingBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member Enrollment</h3>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600 }}>Fill in the credentials and hierarchy assignment for the new official.</p>
          </div>
          <div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-900)', marginBottom: 8, display: 'block' }}>Official Email Address</label>
                <input type="email" required placeholder="name@aakar.gov.in" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} 
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-900)', marginBottom: 8, display: 'block' }}>Initial Password</label>
                <input type="text" required placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-900)', marginBottom: 8, display: 'block' }}>Full Name (Display)</label>
                <input placeholder="Hon. Official Name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-900)', marginBottom: 8, display: 'block' }}>System Role Authorization</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, state_id: '', district_id: '', constituency_id: '' })}
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontWeight: 700, appearance: 'none', background: 'var(--gray-50)' }}>
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label.toUpperCase()}</option>)}
                </select>
              </div>

              {form.role === 'ELECTION_ADMIN' && (
                <div style={{ gridColumn: 'span 2', background: 'var(--gray-100)', color: 'var(--navy-900)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700, borderLeft: '4px solid var(--amber-500)' }}>
                  NOTICE: Election Administrators hold supreme system authority with no geographical restrictions.
                </div>
              )}

              {ROLE_HIERARCHY[form.role]?.includes('state') && (
                <div className="form-group" style={{ gridColumn: ROLE_HIERARCHY[form.role].length > 1 ? 'span 1' : 'span 2' }}>
                  <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-900)', marginBottom: 8, display: 'block' }}>State Jurisdiction</label>
                  <select value={form.state_id} onChange={e => handleStateChange(e.target.value)} required={form.role !== 'ELECTION_ADMIN'}
                    style={{ width: '100%', padding: '12px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                    <option value="">SELECT STATE</option>
                    {hierarchy.states.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
              )}

              {ROLE_HIERARCHY[form.role]?.includes('district') && form.state_id && (
                <div className="form-group">
                  <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-900)', marginBottom: 8, display: 'block' }}>District Jurisdiction</label>
                  <select value={form.district_id} onChange={e => handleDistrictChange(e.target.value)} required
                    style={{ width: '100%', padding: '12px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                    <option value="">SELECT DISTRICT</option>
                    {hierarchy.districts.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
              )}

              {ROLE_HIERARCHY[form.role]?.includes('constituency') && form.district_id && (
                <div className="form-group">
                  <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-900)', marginBottom: 8, display: 'block' }}>Constituency Jurisdiction</label>
                  <select value={form.constituency_id} onChange={e => setForm({ ...form, constituency_id: e.target.value })} required
                    style={{ width: '100%', padding: '12px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                    <option value="">SELECT CONSTITUENCY</option>
                    {hierarchy.constituencies.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
              )}

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting} 
                  style={{ background: 'var(--navy-900)', color: 'var(--white)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '14px 40px', fontWeight: 900, letterSpacing: '0.05em' }}>
                  {submitting ? 'ENROLLING...' : 'ENROLL OFFICIAL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="dash-stats" style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
          {[{ value: null, label: 'TOTAL FORCE', color: 'var(--navy-900)' }, ...ROLE_OPTIONS].map(opt => (
            <div key={opt.label} style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderTop: `4px solid ${opt.color}`, padding: '16px 20px', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{opt.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.5px' }}>{opt.value ? (roleCounts[opt.value] || 0) : users.length}</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {categoryOrder.filter(cat => !roleFilter || cat.value === roleFilter).map(cat => {
              const members = grouped[cat.value];
              if (!members || members.length === 0) return null;
              return (
                  <div key={cat.value} className="admin-form-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="admin-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--navy-900)' }}>{cat.label}</span>
                      <span style={{ height: 16, width: 1, background: 'var(--gray-300)' }}></span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)' }}>{members.length} AUTHORIZED OFFICIALS</span>
                    </div>
                  </div>
                  <table className="admin-table" style={{ border: 'none' }}>
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
      <div className="dash-page-header" style={{ borderBottom: '2px solid var(--navy-900)', paddingBottom: 24, marginBottom: 32 }}>
        <div>
          <div className="dash-page-title" style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.5px' }}>
            <Globe size={28} style={{ display: 'inline', marginRight: 12, color: 'var(--amber-500)' }} /> 
            Constituency Setup
          </div>
          <div className="dash-page-subtitle" style={{ color: 'var(--gray-500)', fontWeight: 600, marginTop: 4 }}>Demarcation & Authority: Manage Electoral Boundaries</div>
        </div>
      </div>

      {error && <div className="dash-alert dash-alert-error" style={{ marginBottom: 24 }}>{error}</div>}

      <div className="admin-form-card" style={{ marginBottom: 32, padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="form-group">
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-900)', marginBottom: 8, display: 'block' }}>State Jurisdiction</label>
            <select value={selectedState} onChange={e => handleStateChange(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
              <option value="">SELECT STATE</option>
              {states.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-900)', marginBottom: 8, display: 'block' }}>District Jurisdiction</label>
            <select value={selectedDistrict} onChange={e => handleDistrictChange(e.target.value)} disabled={!selectedState}
              style={{ width: '100%', padding: '12px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
              <option value="">SELECT DISTRICT</option>
              {districts.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedDistrict && (
        <div className="admin-form-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
          <div className="admin-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--navy-900)' }}>
                CONSTITUENCIES: {districts.find(d => d.code === selectedDistrict)?.name || selectedDistrict}
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => { setShowAddForm(true); setAddForm({ code: '', name: '' }); }} style={{ background: 'var(--amber-500)', color: 'var(--navy-900)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontWeight: 900, fontSize: 10 }}>
              <Plus size={14} /> ADD CONSTITUENCY
            </button>
          </div>
          
          {showAddForm && (
            <div style={{ padding: '20px 24px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              <form onSubmit={handleAddConstituency} style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>CONSTITUENCY CODE</label>
                  <input required placeholder="CODE (e.g. NWD-03)" value={addForm.code} onChange={e => setAddForm({ ...addForm, code: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 13 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>CONSTITUENCY NAME</label>
                  <input required placeholder="NAME (e.g. Noida North)" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={adding} style={{ height: 38, background: 'var(--navy-900)', fontWeight: 800 }}>{adding ? '...' : 'SAVE'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)} style={{ height: 38, fontWeight: 800 }}>CANCEL</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ minHeight: 200 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}><Loader2 size={32} className="spin" style={{ color: 'var(--navy-700)' }} /></div>
            ) : constituencies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--gray-400)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                No constituency data available for this district
              </div>
            ) : (
              <table className="admin-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th>Official Code</th>
                    <th>Name of Constituency</th>
                    <th>Constituency Incharge</th>
                    <th style={{ width: 220 }}>Assignment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {constituencies.map(c => (
                    <tr key={c.code}>
                      <td style={{ fontFamily: 'var(--font)', fontWeight: 800, color: 'var(--navy-900)' }}>{c.code}</td>
                      <td style={{ fontWeight: 700 }}>{c.name}</td>
                      <td style={{ color: 'var(--gray-600)', fontWeight: 600 }}>{inchages[c.code] || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {inchages[c.code] ? (
                            <span className="admin-badge" style={{ backgroundColor: '#05966915', color: '#059669', border: '1px solid #05966930' }}>ASSIGNED</span>
                          ) : (
                            <>
                              <span className="admin-badge" style={{ backgroundColor: '#dc262615', color: '#dc2626', border: '1px solid #dc262630' }}>VACANT</span>
                              <button className="btn btn-primary" style={{ background: 'var(--navy-900)', fontSize: 10, padding: '4px 12px', height: 'auto', fontWeight: 900 }}
                                onClick={() => {
                                  sessionStorage.setItem('assign_prefill', JSON.stringify({ state: selectedState, district: selectedDistrict, constituency: c.code }));
                                  router.push('/election?tab=users');
                                }}>
                                ASSIGN OFFICIAL
                              </button>
                            </>
                          )}
                        </div>
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
        <div className="admin-form-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <Globe size={48} style={{ color: 'var(--gray-200)', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Select State and District Jurisdictions to Proceed
          </div>
        </div>
      )}
    </div>
  );
}
