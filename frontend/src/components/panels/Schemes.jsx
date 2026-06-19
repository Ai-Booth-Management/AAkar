import React, { useState } from 'react';

const API_BASE = '/api/v1/admin';

const Schemes = () => {
    const [loading, setLoading] = useState(false);
    const [fetchingVoters, setFetchingVoters] = useState(false);
    const [voters, setVoters] = useState([]);
    const [excludedNames, setExcludedNames] = useState([]);
    
    const [form, setForm] = useState({
        scheme_name: '',
        message: '',
        category: ''
    });
    
    const [feedback, setFeedback] = useState(null);

    // Design Tokens - Digital Secretariat
    const navy = "#04122e";
    const navyLight = "#1a2744";
    const saffron = "#D4A843";
    const surface = "#f8f9fb";
    const surfaceDeep = "#edeef0";
    const white = "#ffffff";
    const gray400 = "#94a3b8";
    const gray600 = "#475569";
    const red500 = "#ef4444";

    const fetchVoters = async (category) => {
        if (!category) {
            setVoters([]);
            setExcludedNames([]);
            return;
        }
        setFetchingVoters(true);
        setExcludedNames([]);
        try {
            const res = await fetch(`${API_BASE}/voters/filter?category=${encodeURIComponent(category)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setVoters(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch voters", e);
            setVoters([]);
        } finally {
            setFetchingVoters(false);
        }
    };

    const handleCategoryChange = (e) => {
        const cat = e.target.value;
        setForm({...form, category: cat});
        fetchVoters(cat);
    };

    const toggleExclusion = (name) => {
        setExcludedNames(prev => 
            prev.includes(name) 
                ? prev.filter(n => n !== name) 
                : [...prev, name]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            const payload = {
                ...form,
                excluded_names: excludedNames
            };
            const res = await fetch(`${API_BASE}/schemes/send_sms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              throw new Error(errBody.detail || `HTTP ${res.status}`);
            }
            const data = await res.json();
            setFeedback({ type: 'success', text: `SCHEME BROADCASTED SUCCESSFULLY. ${data.message || ''}` });
            setForm({ scheme_name: '', message: '', category: '' });
            setVoters([]);
            setExcludedNames([]);
        } catch (e) {
            setFeedback({ type: 'error', text: 'SYSTEM ERROR: CONNECTION REFUSED' });
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
                                Welfare Deployment
                            </h2>
                            <h1 style={{ fontSize: '24px', fontWeight: '900', color: navy, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                                VOTER SPECIFIC SCHEMES
                            </h1>
                        </header>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Target Audience</label>
                                    <select 
                                        value={form.category} 
                                        onChange={handleCategoryChange}
                                        required
                                        style={{ padding: '16px', border: `1px solid ${surfaceDeep}`, backgroundColor: surface, fontSize: '13px', fontWeight: '700', color: navy, outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="">Select Audience Segment</option>
                                        <option value="All Voters">All Voters</option>
                                        <option value="Young Voters">Young Voters</option>
                                        <option value="Aged or old voters">Aged or old voters</option>
                                        <option value="Male Voters">Male Voters</option>
                                        <option value="Female Voters">Female Voters</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scheme Heading</label>
                                    <input 
                                        type="text"
                                        value={form.scheme_name}
                                        onChange={e => setForm({...form, scheme_name: e.target.value})}
                                        required
                                        placeholder="e.g. Youth Empowerment Scheme"
                                        style={{ padding: '16px', border: `1px solid ${surfaceDeep}`, backgroundColor: surface, fontSize: '13px', fontWeight: '700', color: navy, outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Custom Scheme Message / Protocol</label>
                                <textarea 
                                    value={form.message}
                                    onChange={(e) => setForm({...form, message: e.target.value})}
                                    required
                                    rows="5"
                                    placeholder="Type the actual scheme message here to broadcast..."
                                    style={{ padding: '16px', border: `1px solid ${surfaceDeep}`, backgroundColor: surface, fontSize: '13px', fontWeight: '600', color: navy, outline: 'none', resize: 'vertical' }}
                                />
                            </div>

                            {feedback && (
                                <div style={{ 
                                    padding: '20px', 
                                    backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                    borderLeft: `4px solid ${feedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
                                    color: feedback.type === 'success' ? '#166534' : '#991b1b',
                                    fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em'
                                }}>
                                    {feedback.text}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={loading || (voters.length > 0 && excludedNames.length === voters.length)}
                                style={{ 
                                    backgroundColor: (voters.length > 0 && excludedNames.length === voters.length) ? gray400 : navy, 
                                    color: white, padding: '20px', border: 'none', fontSize: '11px', fontWeight: '900', 
                                    textTransform: 'uppercase', letterSpacing: '0.4em', cursor: loading ? 'not-allowed' : 'pointer',
                                    borderBottom: `4px solid ${(voters.length > 0 && excludedNames.length === voters.length) ? gray600 : saffron}`
                                }}
                            >
                                {loading ? 'BROADCASTING SMS...' : 'Broadcast Scheme SMS'}
                            </button>
                        </form>
                    </div>

                    {/* Sidebar Guidelines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ backgroundColor: navyLight, padding: '32px', borderTop: `4px solid ${saffron}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: '900', color: saffron, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
                                    Matching Beneficiaries
                                </h3>
                                <span style={{ color: white, fontSize: '10px', fontWeight: '700', backgroundColor: navy, padding: '4px 8px', borderRadius: '4px' }}>
                                    {voters.length - excludedNames.length} / {voters.length}
                                </span>
                            </div>
                            {fetchingVoters ? (
                                <div style={{ color: gray400, fontSize: '11px' }}>Scanning Registry...</div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                                    {voters.length > 0 ? voters.map((v, i) => {
                                        const isExcluded = excludedNames.includes(v.name);
                                        return (
                                        <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', color: isExcluded ? gray600 : '#cbd5e1', fontSize: '12px', lineHeight: '1.4', borderBottom: `1px solid rgba(255,255,255,0.05)`, paddingBottom: '8px', transition: 'all 0.2s' }}>
                                            <div style={{ textDecoration: isExcluded ? 'line-through' : 'none' }}>
                                                <span style={{ color: isExcluded ? gray600 : saffron, fontWeight: '900', marginRight: '8px' }}>{String(i+1).padStart(2, '0')}</span>
                                                {String(v.name).toUpperCase()}
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => toggleExclusion(v.name)}
                                                style={{ 
                                                    background: isExcluded ? surfaceDeep : 'transparent', 
                                                    border: `1px solid ${isExcluded ? gray400 : red500}`, 
                                                    color: isExcluded ? gray600 : red500, 
                                                    fontSize: '9px', fontWeight: '800', cursor: 'pointer', 
                                                    padding: '4px 8px', borderRadius: '4px', letterSpacing: '0.05em' 
                                                }}
                                            >
                                                {isExcluded ? 'INCLUDE' : 'EXCLUDE'}
                                            </button>
                                        </li>
                                    )}) : (
                                        <li style={{ color: gray600, fontSize: '11px', fontStyle: 'italic' }}>
                                            No beneficiaries matched for this category.
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>

                        <div style={{ backgroundColor: white, padding: '32px', border: `1px solid ${surfaceDeep}` }}>
                            <h3 style={{ fontSize: '10px', fontWeight: '900', color: navy, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
                                System Status
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: gray600, fontWeight: '700' }}>
                                <div style={{ width: '8px', height: '8px', backgroundColor: '#22c55e' }} />
                                SMS SERVICE ACTIVE
                            </div>
                            <div style={{ marginTop: '12px', fontSize: '10px', color: gray400 }}>
                                Gateway: FAST2SMS // PROD_ROUTE
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Schemes;
