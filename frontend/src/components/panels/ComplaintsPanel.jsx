import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = '/api/v1';

// ── Design Tokens ──────────────────────────────────────────────────────────────
const navy = "#04122e";
const navyLight = "#1a2744";
const saffron = "#D4A843";
const surface = "#f8f9fb";
const surfaceDeep = "#edeef0";
const white = "#ffffff";
const gray400 = "#94a3b8";
const gray600 = "#475569";

// ── Normalise status strings ────────────────────────────────────────────────
const normaliseStatus = (s = '') => {
    const v = s.toLowerCase().trim();
    if (!v || v === 'open') return 'Open';
    if (v === 'under review' || v === 'under_review') return 'Under Review';
    if (v === 'resolved') return 'Resolved';
    if (v === 'closed') return 'Closed';
    return s;
};

// ── Status badge colours ───────────────────────────────────────────────────
const statusColour = (status) => {
    switch (normaliseStatus(status)) {
        case 'Open':         return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
        case 'Under Review': return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
        case 'Resolved':     return { bg: '#f0fdf4', color: '#22c55e', border: '#bbf7d0' };
        case 'Closed':       return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
        default:             return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
    }
};

// ── Priority badge colours ─────────────────────────────────────────────────
const priorityColour = (p = '') => {
    switch (p.toUpperCase()) {
        case 'HIGH':   return { bg: '#fef2f2', color: '#ef4444', border: '#fecaca' };
        case 'MEDIUM': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
        default:       return { bg: '#f0fdf4', color: '#22c55e', border: '#bbf7d0' };
    }
};

// ── Roles that can change status ───────────────────────────────────────────
const CAN_UPDATE_STATUS = ['DM', 'DISTRICT_ADMIN', 'CM', 'STATE_ADMIN', 'ELECTION_ADMIN', 'SUPER'];

const ComplaintsPanel = () => {
    const { currentUser } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const pollingRef = useRef(null);

    const userRole = (currentUser?.role || '').toUpperCase();
    const canUpdateStatus = CAN_UPDATE_STATUS.includes(userRole);
    const isDM = userRole === 'DM' || userRole === 'DISTRICT_ADMIN';

    // ── Build query params ──────────────────────────────────────────────────
    const buildUrl = useCallback(() => {
        const params = new URLSearchParams({ limit: '200' });
        // DM scope enforcement — pass district_id so backend can filter
        if (isDM && currentUser?.district_id) {
            params.set('district_id', currentUser.district_id);
        }
        if (statusFilter) params.set('status', statusFilter);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        return `${API_BASE}/complaints/?${params.toString()}`;
    }, [isDM, currentUser, statusFilter, searchQuery]);

    // ── Fetch from backend ──────────────────────────────────────────────────
    const fetchComplaints = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch(buildUrl(), {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setComplaints(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch complaints:", e);
            if (!silent) setComplaints([]);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [buildUrl]);

    // ── Initial fetch + 30-second polling ──────────────────────────────────
    useEffect(() => {
        fetchComplaints();
        pollingRef.current = setInterval(() => fetchComplaints(true), 30_000);
        return () => clearInterval(pollingRef.current);
    }, [fetchComplaints]);

    // ── Legacy: resolve (mark as Resolved) ────────────────────────────────
    const handleResolve = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/complaints/resolve/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `COMPLAINT #${id} RESOLVED & VOTER NOTIFIED.` });
                setComplaints(prev => prev.map(c =>
                    c.complaint_id === id ? { ...c, status: 'Resolved' } : c
                ));
            } else {
                setMessage({ type: 'error', text: 'FAILED TO RESOLVE COMPLAINT.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'SYSTEM ERROR: UNABLE TO REACH REGISTRY.' });
        }
    };

    // ── Status lifecycle update ────────────────────────────────────────────
    const handleStatusChange = async (id, newStatus) => {
        setUpdatingStatus(id);
        try {
            const res = await fetch(`${API_BASE}/complaints/status/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `COMPLAINT #${id} STATUS UPDATED TO ${newStatus.toUpperCase()}.` });
                setComplaints(prev => prev.map(c =>
                    c.complaint_id === id ? { ...c, status: newStatus } : c
                ));
            } else {
                const err = await res.json().catch(() => ({}));
                setMessage({ type: 'error', text: err.detail || 'FAILED TO UPDATE STATUS.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'SYSTEM ERROR: STATUS UPDATE FAILED.' });
        } finally {
            setUpdatingStatus(null);
        }
    };

    const toggleRowExpansion = (id) => {
        const next = new Set(expandedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedRows(next);
    };

    // ── Stats (computed client-side from fetched data) ─────────────────────
    const safe = Array.isArray(complaints) ? complaints : [];
    const totalComplaints = safe.length;
    const openComplaints = safe.filter(c => normaliseStatus(c.status) === 'Open').length;
    const underReview = safe.filter(c => normaliseStatus(c.status) === 'Under Review').length;
    const resolvedComplaints = safe.filter(c => normaliseStatus(c.status) === 'Resolved').length;

    return (
        <div style={{ padding: '40px', backgroundColor: surface, minHeight: '100%', fontFamily: '"Public Sans", "Inter", sans-serif' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

                {/* ── Header ── */}
                <header style={{ borderLeft: `6px solid ${navy}`, paddingLeft: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: '10px', fontWeight: '900', color: gray400, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            The Sovereign Ledger
                        </h2>
                        <h1 style={{ fontSize: '24px', fontWeight: '900', color: navy, letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0 }}>
                            Voter Complaints Registry
                        </h1>
                        {isDM && currentUser?.district_id && (
                            <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '700', color: '#2563eb' }}>
                                Filtered to District: {currentUser.district_id}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: '800', color: gray400 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                        AUTO-REFRESHING EVERY 30s
                    </div>
                </header>

                {/* ── Notification ── */}
                {message && (
                    <div style={{
                        padding: '16px 20px',
                        backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        borderLeft: `4px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
                        color: message.type === 'success' ? '#166534' : '#991b1b',
                        fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        {message.text}
                        <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '14px' }}>✕</button>
                    </div>
                )}

                {/* ── Stat Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0' }}>
                    {[
                        { label: 'Total', value: totalComplaints, accent: navy },
                        { label: 'Open', value: openComplaints, accent: '#d97706' },
                        { label: 'Under Review', value: underReview, accent: '#2563eb' },
                        { label: 'Resolved', value: resolvedComplaints, accent: '#22c55e' },
                    ].map((stat, i) => (
                        <div key={stat.label} style={{
                            backgroundColor: white, padding: '28px',
                            border: `1px solid ${surfaceDeep}`,
                            borderRight: i < 3 ? 'none' : `1px solid ${surfaceDeep}`,
                            borderBottom: `3px solid ${stat.accent}`
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: '900', color: gray400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                                {stat.label}
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: navy, letterSpacing: '-0.02em' }}>
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Filters ── */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search by Complaint ID, EPIC, or Booth ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            flex: 1, padding: '13px 16px', fontSize: '13px', fontWeight: '700',
                            backgroundColor: surface, border: `1px solid ${surfaceDeep}`,
                            color: navy, outline: 'none', boxSizing: 'border-box',
                            fontFamily: '"Public Sans", "Inter", sans-serif'
                        }}
                        onFocus={(e) => e.target.style.borderColor = navy}
                        onBlur={(e) => e.target.style.borderColor = surfaceDeep}
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: '13px 16px', fontSize: '12px', fontWeight: '700',
                            backgroundColor: white, border: `1px solid ${surfaceDeep}`,
                            color: navy, cursor: 'pointer', outline: 'none'
                        }}
                    >
                        <option value="">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>

                {/* ── Data Table ── */}
                <div style={{ backgroundColor: white, border: `1px solid ${surfaceDeep}`, overflow: 'hidden' }}>
                    <h3 style={{
                        fontSize: '12px', fontWeight: '900', color: navy, letterSpacing: '0.2em',
                        textTransform: 'uppercase', padding: '20px 24px 0', margin: 0,
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{ width: '4px', height: '16px', backgroundColor: saffron }} />
                        Complaint Registry
                        <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '700', color: gray400 }}>
                            {safe.length} record{safe.length !== 1 ? 's' : ''}
                        </span>
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${navy}`, textAlign: 'left' }}>
                                    {['ID', 'Date', 'Booth', 'District', 'Voter EPIC', 'Category', 'Priority', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '14px 20px', color: gray400, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="9" style={{ padding: '60px', textAlign: 'center', color: gray400, fontSize: '11px', fontWeight: '700' }}>Synchronizing with registry...</td></tr>
                                ) : safe.length === 0 ? (
                                    <tr><td colSpan="9" style={{ padding: '60px', textAlign: 'center', color: gray400, fontStyle: 'italic', fontSize: '11px' }}>
                                        No complaints found. Complaints submitted from the Booth portal will appear here automatically.
                                    </td></tr>
                                ) : (
                                    safe.map((c, i) => {
                                        const isExpanded = expandedRows.has(c.complaint_id);
                                        const normStatus = normaliseStatus(c.status);
                                        const sc = statusColour(normStatus);
                                        const pc = priorityColour(c.priority);
                                        return (
                                            <React.Fragment key={c.complaint_id}>
                                                <tr style={{
                                                    backgroundColor: i % 2 === 0 ? 'transparent' : surface,
                                                    borderBottom: isExpanded ? 'none' : `1px solid ${surfaceDeep}`
                                                }}>
                                                    <td style={{ padding: '14px 20px', fontWeight: '800', color: navy, fontSize: '13px', fontFamily: 'monospace' }}>#{c.complaint_id}</td>
                                                    <td style={{ padding: '14px 20px', color: gray600, fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                        {c.timestamp ? new Date(c.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                                    </td>
                                                    <td style={{ padding: '14px 20px', fontWeight: '700', color: gray600, fontSize: '11px', fontFamily: 'monospace' }}>{c.booth_id || '—'}</td>
                                                    <td style={{ padding: '14px 20px', fontWeight: '700', color: gray600, fontSize: '11px' }}>{c.district_id || '—'}</td>
                                                    <td style={{ padding: '14px 20px', fontWeight: '700', color: navy, fontFamily: 'monospace', fontSize: '11px' }}>{c.epic || '—'}</td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <span style={{ fontSize: '9px', fontWeight: '900', padding: '3px 8px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', textTransform: 'uppercase' }}>
                                                            {c.type || '—'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <span style={{ fontSize: '9px', fontWeight: '900', padding: '3px 8px', backgroundColor: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, textTransform: 'uppercase' }}>
                                                            {c.priority || 'LOW'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        {canUpdateStatus ? (
                                                            <select
                                                                value={normStatus}
                                                                onChange={(e) => handleStatusChange(c.complaint_id, e.target.value)}
                                                                disabled={updatingStatus === c.complaint_id}
                                                                style={{
                                                                    fontSize: '10px', fontWeight: '900', padding: '4px 8px',
                                                                    backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                                                                    cursor: 'pointer', outline: 'none', textTransform: 'uppercase',
                                                                    opacity: updatingStatus === c.complaint_id ? 0.6 : 1
                                                                }}
                                                            >
                                                                <option value="Open">OPEN</option>
                                                                <option value="Under Review">UNDER REVIEW</option>
                                                                <option value="Resolved">RESOLVED</option>
                                                                <option value="Closed">CLOSED</option>
                                                            </select>
                                                        ) : (
                                                            <span style={{ fontSize: '9px', fontWeight: '900', padding: '3px 8px', backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                                <span style={{ width: '5px', height: '5px', backgroundColor: sc.color, borderRadius: '50%' }} />
                                                                {normStatus.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <button
                                                            onClick={() => toggleRowExpansion(c.complaint_id)}
                                                            style={{
                                                                backgroundColor: surface, color: navy,
                                                                padding: '6px 12px', border: `1px solid ${surfaceDeep}`,
                                                                fontSize: '10px', fontWeight: '900', cursor: 'pointer',
                                                                transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
                                                            }}
                                                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = navyLight; e.currentTarget.style.color = white; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = surface; e.currentTarget.style.color = navy; }}
                                                        >
                                                            {isExpanded ? 'Hide' : 'Details'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr style={{ backgroundColor: i % 2 === 0 ? 'transparent' : surface, borderBottom: `1px solid ${surfaceDeep}` }}>
                                                        <td colSpan="9" style={{ padding: '0 20px 20px 20px' }}>
                                                            <div style={{
                                                                backgroundColor: white, padding: '20px', border: `1px solid ${surfaceDeep}`,
                                                                display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'flex-start'
                                                            }}>
                                                                <div>
                                                                    <div style={{ fontSize: '10px', fontWeight: '900', color: gray400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                                                                        Detailed Description
                                                                    </div>
                                                                    <div style={{ color: navy, fontSize: '13px', lineHeight: '1.7', fontWeight: '600' }}>
                                                                        {c.description || 'No description available for this record.'}
                                                                    </div>
                                                                    {c.phone && (
                                                                        <div style={{ marginTop: '12px', fontSize: '11px', color: gray400 }}>
                                                                            <strong>Contact:</strong> {c.phone}
                                                                        </div>
                                                                    )}
                                                                    {(c.constituency_id || c.constituency) && (
                                                                        <div style={{ marginTop: '4px', fontSize: '11px', color: gray400 }}>
                                                                            <strong>Constituency:</strong> {c.constituency_id || c.constituency}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {canUpdateStatus && normaliseStatus(c.status) === 'Open' && (
                                                                    <button
                                                                        onClick={() => handleResolve(c.complaint_id)}
                                                                        style={{
                                                                            backgroundColor: navy, color: white,
                                                                            padding: '14px 24px', border: 'none',
                                                                            fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                                                                            textTransform: 'uppercase', letterSpacing: '0.2em',
                                                                            borderBottom: `4px solid ${saffron}`,
                                                                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                                                                        }}
                                                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = navyLight}
                                                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = navy}
                                                                    >
                                                                        Mark as Resolved
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};

export default ComplaintsPanel;
