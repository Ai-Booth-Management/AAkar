import React, { useState, useEffect } from 'react';

const API_BASE = '/api/v1';

const DrivesPanel = () => {
    const [booths, setBooths] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        type: 'Drive',
        date: '',
        booth_id: ''
    });
    const [message, setMessage] = useState(null);

    // Design Tokens - Digital Secretariat
    const navy = "#04122e";
    const navyLight = "#1a2744";
    const saffron = "#D4A843";
    const surface = "#f8f9fb";
    const surfaceDeep = "#edeef0";
    const white = "#ffffff";
    const gray400 = "#94a3b8";
    const gray600 = "#475569";

    const [allDrives, setAllDrives] = useState([]);

    useEffect(() => {
        fetchBooths();
        fetchAllDrives();
    }, []);

    const fetchBooths = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/booths`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setBooths(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAllDrives = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/drives`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setAllDrives(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/admin/drives`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'DRIVE AUTHORIZED & DISPATCHED SUCCESSFULLY' });
                setForm({ title: '', description: '', type: 'Drive', date: '', booth_id: '' });
                fetchAllDrives(); // Refresh table
            } else {
                const errBody = await res.json().catch(() => ({}));
                setMessage({ type: 'error', text: errBody.detail || 'AUTHORIZATION FAILED: UNABLE TO DISPATCH DRIVE' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'SYSTEM ERROR: CONNECTION REFUSED' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', backgroundColor: surface, minHeight: '100%', fontFamily: '"Public Sans", "Inter", sans-serif' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
                    {/* Main Form Section */}
                    <div style={{ backgroundColor: white, border: `1px solid ${surfaceDeep}`, padding: '48px', position: 'relative' }}>
                        <header style={{ marginBottom: '40px', borderLeft: `6px solid ${navy}`, paddingLeft: '24px' }}>
                            <h2 style={{ fontSize: '10px', fontWeight: '900', color: gray400, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Strategic Deployment
                            </h2>
                            <h1 style={{ fontSize: '24px', fontWeight: '900', color: navy, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                                Schedule New Event
                            </h1>
                        </header>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Event Title</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        required
                                        placeholder="e.g. Vaccination Drive Phase II"
                                        style={{ padding: '16px', border: `1px solid ${surfaceDeep}`, backgroundColor: surface, fontSize: '13px', fontWeight: '700', color: navy, outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Target Jurisdiction (Booth)</label>
                                    <select
                                        value={form.booth_id}
                                        onChange={(e) => setForm({ ...form, booth_id: e.target.value })}
                                        required
                                        style={{ padding: '16px', border: `1px solid ${surfaceDeep}`, backgroundColor: surface, fontSize: '13px', fontWeight: '700', color: navy, outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="">Select Administrative Booth</option>
                                        {booths.map(b => (
                                            <option key={b.booth_id} value={b.booth_id}>BOOTH-{b.booth_id} (Zone: {b.risk_level})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Event Type</label>
                                    <div style={{ display: 'flex', border: `1px solid ${surfaceDeep}`, backgroundColor: surface, padding: '4px' }}>
                                        {['Health', 'Education', 'Welfare'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setForm({ ...form, type })}
                                                style={{
                                                    flex: 1, padding: '12px', border: 'none', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', cursor: 'pointer',
                                                    backgroundColor: form.type === type ? navy : 'transparent',
                                                    color: form.type === type ? white : gray400,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Deployment Date</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                        required
                                        style={{ padding: '16px', border: `1px solid ${surfaceDeep}`, backgroundColor: surface, fontSize: '13px', fontWeight: '700', color: navy, outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Specific Instructions / Protocol</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    required
                                    rows="5"
                                    placeholder="Provide detailed mission parameters for the localized booth officials..."
                                    style={{ padding: '16px', border: `1px solid ${surfaceDeep}`, backgroundColor: surface, fontSize: '13px', fontWeight: '600', color: navy, outline: 'none', resize: 'vertical' }}
                                />
                            </div>

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

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    backgroundColor: navy, color: white, padding: '20px', border: 'none', fontSize: '11px', fontWeight: '900',
                                    textTransform: 'uppercase', letterSpacing: '0.4em', cursor: loading ? 'not-allowed' : 'pointer',
                                    borderBottom: `4px solid ${saffron}`
                                }}
                            >
                                {loading ? 'PROCESSING AUTHORIZATION...' : 'Authorize & Dispatch Mission'}
                            </button>
                        </form>
                    </div>

                    {/* Sidebar Guidelines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ backgroundColor: navyLight, padding: '32px', borderTop: `4px solid ${saffron}` }}>
                            <h3 style={{ fontSize: '11px', fontWeight: '900', color: saffron, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>
                                Protocol Guidelines
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {[
                                    "Verify target booth identifier before final dispatch.",
                                    "Drives scheduled here will be immediately transmitted to the specific Booth Dashboard.",
                                    "Use 'Security' type for priority interventions and emergency functions.",
                                    "All actions are logged for national performance analytics."
                                ].map((text, i) => (
                                    <li key={i} style={{ display: 'flex', gap: '16px', color: '#cbd5e1', fontSize: '12px', lineHeight: '1.6' }}>
                                        <span style={{ color: saffron, fontWeight: '900' }}>0{i + 1}</span>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ backgroundColor: white, padding: '32px', border: `1px solid ${surfaceDeep}` }}>
                            <h3 style={{ fontSize: '10px', fontWeight: '900', color: navy, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
                                System Status
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: gray600, fontWeight: '700' }}>
                                <div style={{ width: '8px', height: '8px', backgroundColor: '#22c55e' }} />
                                ENCRYPTED CHANNEL ACTIVE
                            </div>
                            <div style={{ marginTop: '12px', fontSize: '10px', color: gray400 }}>
                                Node: DH-ADMIN-922 // SSL_ACTIVE
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Deployments Table */}
                <div style={{ backgroundColor: white, border: `1px solid ${surfaceDeep}`, padding: '48px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '900', color: navy, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '4px', height: '16px', backgroundColor: saffron }} />
                        Recent Operational Deployments
                    </h3>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${navy}`, textAlign: 'left' }}>
                                    <th style={{ padding: '16px', color: gray400, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mission Title</th>
                                    <th style={{ padding: '16px', color: gray400, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Jurisdiction</th>
                                    <th style={{ padding: '16px', color: gray400, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Type</th>
                                    <th style={{ padding: '16px', color: gray400, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Deploy Date</th>
                                    <th style={{ padding: '16px', color: gray400, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allDrives.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: gray400, fontStyle: 'italic' }}>
                                            No recent deployments found in the intelligence registry.
                                        </td>
                                    </tr>
                                ) : (
                                    allDrives.map((d, i) => (
                                        <tr key={i} style={{ borderBottom: `1px solid ${surfaceDeep}`, backgroundColor: i % 2 === 0 ? 'transparent' : surface }}>
                                            <td style={{ padding: '16px', fontWeight: '700', color: navy }}>{d.title}</td>
                                            <td style={{ padding: '16px', fontWeight: '800', color: gray600 }}>BOOTH-{d.booth_id}</td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    fontSize: '9px', fontWeight: '900', padding: '4px 8px', backgroundColor: d.type === 'Security' ? '#fef2f2' : '#f0f9ff',
                                                    color: d.type === 'Security' ? '#ef4444' : '#0369a1', border: `1px solid ${d.type === 'Security' ? '#fecaca' : '#bae6fd'}`,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {d.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', fontWeight: '600', color: gray600 }}>{d.date}</td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontWeight: '900', fontSize: '10px' }}>
                                                    <div style={{ width: '6px', height: '6px', backgroundColor: '#22c55e' }} />
                                                    ACTIVE
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DrivesPanel;
