import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api/v1';

// Design Tokens - matching project NIC/Digital Secretariat style
const navy = "#04122e";
const navyLight = "#1a2744";
const saffron = "#D4A843";
const surface = "#f8f9fb";
const surfaceDeep = "#edeef0";
const white = "#ffffff";
const gray400 = "#94a3b8";
const gray600 = "#475569";

const ComplaintsPanel = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/complaints/`);
            const data = await res.json();
            setComplaints(data);
        } catch (e) {
            console.error("Failed to fetch complaints:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/complaints/resolve/${id}`, { method: 'POST' });
            if (res.ok) {
                setMessage({ type: 'success', text: `COMPLAINT #${id} RESOLVED & VOTER NOTIFIED.` });
                setComplaints(prev => prev.map(c => 
                    c.complaint_id === id ? { ...c, status: 'Resolved', Status: 'Resolved' } : c
                ));
            } else {
                setMessage({ type: 'error', text: 'FAILED TO RESOLVE COMPLAINT.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'SYSTEM ERROR: UNABLE TO REACH REGISTRY.' });
        }
    };

    const toggleRowExpansion = (id) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(id)) newExpandedRows.delete(id);
        else newExpandedRows.add(id);
        setExpandedRows(newExpandedRows);
    };

    // Calculate Stats
    const totalComplaints = complaints.length;
    const openComplaints = complaints.filter(c => (c.status || c.Status) === 'Open').length;
    const resolvedComplaints = complaints.filter(c => (c.status || c.Status) === 'Resolved').length;

    // Filter logic
    const filteredComplaints = complaints.filter(c => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const idMatch = String(c.complaint_id).toLowerCase().includes(q);
        const epicMatch = String(c.voter_epic || c.epic || c.EPIC || '').toLowerCase().includes(q);
        const boothMatch = String(c.booth_id || '').toLowerCase().includes(q);
        const typeMatch = String(c.type || c.issue_type || c.Issue_Type || '').toLowerCase().includes(q);
        return idMatch || epicMatch || boothMatch || typeMatch;
    });

    return (
        <div style={{ padding: '40px', backgroundColor: surface, minHeight: '100%', fontFamily: '"Public Sans", "Inter", sans-serif' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* Header Section */}
                <header style={{ borderLeft: `6px solid ${navy}`, paddingLeft: '24px' }}>
                    <h2 style={{ fontSize: '10px', fontWeight: '900', color: gray400, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        The Sovereign Ledger
                    </h2>
                    <h1 style={{ fontSize: '24px', fontWeight: '900', color: navy, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        Voter Complaints Management
                    </h1>
                </header>

                {/* Notifications */}
                {message && (
                    <div style={{ 
                        padding: '20px', 
                        backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        borderLeft: `4px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
                        color: message.type === 'success' ? '#166534' : '#991b1b',
                        fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em'
                    }}>
                        {message.text}
                    </div>
                )}

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' }}>
                    
                    <div style={{ backgroundColor: white, padding: '32px', border: `1px solid ${surfaceDeep}`, borderRight: 'none' }}>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: gray400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Total Complaints</div>
                        <div style={{ fontSize: '36px', fontWeight: '900', color: navy, letterSpacing: '-0.02em' }}>{totalComplaints}</div>
                    </div>

                    <div style={{ backgroundColor: white, padding: '32px', border: `1px solid ${surfaceDeep}`, borderRight: 'none' }}>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: gray400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Open Complaints</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '36px', fontWeight: '900', color: navy, letterSpacing: '-0.02em' }}>{openComplaints}</div>
                            <span style={{ 
                                fontSize: '9px', fontWeight: '900', padding: '4px 8px', 
                                backgroundColor: '#fffbeb', color: '#d97706', 
                                border: '1px solid #fde68a', textTransform: 'uppercase'
                            }}>Requires Attention</span>
                        </div>
                    </div>

                    <div style={{ backgroundColor: white, padding: '32px', border: `1px solid ${surfaceDeep}` }}>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: gray400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Resolved Complaints</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '36px', fontWeight: '900', color: navy, letterSpacing: '-0.02em' }}>{resolvedComplaints}</div>
                            <span style={{ 
                                fontSize: '9px', fontWeight: '900', padding: '4px 8px',
                                backgroundColor: '#f0fdf4', color: '#22c55e',
                                border: '1px solid #bbf7d0', textTransform: 'uppercase'
                            }}>Resolved</span>
                        </div>
                    </div>

                </div>

                {/* Search Bar */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <input 
                            type="text" 
                            placeholder="Search by Complaint ID, EPIC Number or Booth ID..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                                width: '100%', padding: '16px', fontSize: '13px', fontWeight: '700',
                                backgroundColor: surface, border: `1px solid ${surfaceDeep}`, 
                                color: navy, outline: 'none', boxSizing: 'border-box',
                                fontFamily: '"Public Sans", "Inter", sans-serif'
                            }}
                            onFocus={(e) => e.target.style.borderColor = navy}
                            onBlur={(e) => e.target.style.borderColor = surfaceDeep}
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div style={{ backgroundColor: white, border: `1px solid ${surfaceDeep}`, overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '900', color: navy, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '24px 24px 0', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '4px', height: '16px', backgroundColor: saffron }} />
                        Complaint Registry
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${navy}`, textAlign: 'left' }}>
                                    <th style={{ padding: '16px 24px', color: gray400, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ID</th>
                                    <th style={{ padding: '16px 24px', color: gray400, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Date</th>
                                    <th style={{ padding: '16px 24px', color: gray400, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Booth ID</th>
                                    <th style={{ padding: '16px 24px', color: gray400, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Voter EPIC</th>
                                    <th style={{ padding: '16px 24px', color: gray400, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contact</th>
                                    <th style={{ padding: '16px 24px', color: gray400, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Complaint Type</th>
                                    <th style={{ padding: '16px 24px', color: gray400, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</th>
                                    <th style={{ padding: '16px 24px', color: gray400, fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: gray400, fontSize: '11px', fontWeight: '700' }}>Synchronizing with registry...</td></tr>
                                ) : filteredComplaints.length === 0 ? (
                                    <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: gray400, fontStyle: 'italic', fontSize: '11px' }}>No complaints match your criteria.</td></tr>
                                ) : (
                                    filteredComplaints.map((c, i) => {
                                        const isExpanded = expandedRows.has(c.complaint_id);
                                        const isOpen = (c.status || c.Status) === 'Open';
                                        return (
                                            <React.Fragment key={c.complaint_id}>
                                                <tr style={{ 
                                                    backgroundColor: i % 2 === 0 ? 'transparent' : surface,
                                                    borderBottom: isExpanded ? 'none' : `1px solid ${surfaceDeep}`
                                                }}>
                                                    <td style={{ padding: '16px 24px', fontWeight: '800', color: navy, fontSize: '13px' }}>#{c.complaint_id}</td>
                                                    <td style={{ padding: '16px 24px', color: gray600, fontSize: '12px', fontWeight: '600' }}>{new Date(c.timestamp).toLocaleDateString()}</td>
                                                    <td style={{ padding: '16px 24px', fontWeight: '800', color: gray600, fontSize: '12px' }}>{c.booth_id || 'UNKNOWN'}</td>
                                                    <td style={{ padding: '16px 24px', fontWeight: '700', color: navy, fontFamily: 'monospace', fontSize: '12px' }}>{c.voter_epic || c.epic || c.EPIC}</td>
                                                    <td style={{ padding: '16px 24px', color: gray600, fontSize: '12px' }}>{c.phone || c.phone_number || c.Contact_no || 'N/A'}</td>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <span style={{ 
                                                            fontSize: '9px', fontWeight: '900', padding: '4px 8px',
                                                            backgroundColor: '#f0f9ff', color: '#0369a1',
                                                            border: '1px solid #bae6fd', textTransform: 'uppercase'
                                                        }}>
                                                            {c.type || c.issue_type || c.Issue_Type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <span style={{ 
                                                            fontSize: '9px', fontWeight: '900', padding: '4px 8px',
                                                            backgroundColor: isOpen ? '#fffbeb' : '#f0fdf4',
                                                            color: isOpen ? '#d97706' : '#22c55e',
                                                            border: `1px solid ${isOpen ? '#fde68a' : '#bbf7d0'}`,
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            <span style={{ width: '6px', height: '6px', backgroundColor: isOpen ? '#d97706' : '#22c55e' }} />
                                                            {(c.status || c.Status || '').toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <button 
                                                            onClick={() => toggleRowExpansion(c.complaint_id)}
                                                            style={{ 
                                                                backgroundColor: surface, color: navy, 
                                                                padding: '8px 16px', border: `1px solid ${surfaceDeep}`,
                                                                fontSize: '10px', fontWeight: '900', cursor: 'pointer',
                                                                transition: 'all 0.2s', textTransform: 'uppercase',
                                                                letterSpacing: '0.05em'
                                                            }}
                                                            onMouseOver={(e) => { e.target.style.backgroundColor = navyLight; e.target.style.color = white; e.target.style.borderColor = navyLight; }}
                                                            onMouseOut={(e) => { e.target.style.backgroundColor = surface; e.target.style.color = navy; e.target.style.borderColor = surfaceDeep; }}
                                                        >
                                                            {isExpanded ? 'Hide' : 'Details'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr style={{ backgroundColor: i % 2 === 0 ? 'transparent' : surface, borderBottom: `1px solid ${surfaceDeep}` }}>
                                                        <td colSpan="8" style={{ padding: '0 24px 24px 24px' }}>
                                                            <div style={{ 
                                                                backgroundColor: white, padding: '24px', border: `1px solid ${surfaceDeep}`,
                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '32px'
                                                            }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: '10px', fontWeight: '900', color: gray400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                                                                        Detailed Description
                                                                    </div>
                                                                    <div style={{ color: navy, fontSize: '13px', lineHeight: '1.6', fontWeight: '600' }}>
                                                                        {c.description || c.Description || c.subject || 'No description available for this record.'}
                                                                    </div>
                                                                </div>
                                                                {isOpen && (
                                                                    <button 
                                                                        onClick={() => handleResolve(c.complaint_id)}
                                                                        style={{ 
                                                                            backgroundColor: navy, color: white, 
                                                                            padding: '16px 28px', border: 'none',
                                                                            fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                                                                            textTransform: 'uppercase', letterSpacing: '0.2em',
                                                                            borderBottom: `4px solid ${saffron}`,
                                                                            transition: 'all 0.2s',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                        onMouseOver={(e) => e.target.style.backgroundColor = navyLight}
                                                                        onMouseOut={(e) => e.target.style.backgroundColor = navy}
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
        </div>
    );
};

export default ComplaintsPanel;
