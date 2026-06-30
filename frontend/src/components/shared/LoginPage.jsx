"use client";

import React, { useState } from 'react';
import {
    ShieldCheck, User, Lock, Building2, MapPin,
    ArrowRight, Globe, BadgeCheck, LayoutDashboard, Flag
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [view, setView] = useState('login');
    const [portalMode, setPortalMode] = useState('election');
    const [userType, setUserType] = useState('BOOTH_PRESIDENT');
    const [selectedRole, setSelectedRole] = useState('State Admin');

    const navy = "#0f172a";
    const gold = "#D4AF37";
    const slate400 = "#94a3b8";
    const slate500 = "#64748b";
    const slate50 = "#f8fafc";
    const slate100 = "#f1f5f9";
    const slate200 = "#e2e8f0";
    const white = "#ffffff";

    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
    const [nameInput, setNameInput] = useState('');

    const [boothIdInput, setBoothIdInput] = useState('');
    const districtsList = [
        "North West", "North", "North East", "Shahdara", "East", "West",
        "Central", "New Delhi", "South West", "South", "South East"
    ];
    const [selectedDistrict, setSelectedDistrict] = useState("Central");

    const [stateId, setStateId] = useState('');
    const [districtId, setDistrictId] = useState('');
    const [constituencyId, setConstituencyId] = useState('');
    const [mandalId, setMandalId] = useState('');
    const [boothId, setBoothId] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, signup } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (view === 'signup' && passwordInput !== confirmPasswordInput) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            if (portalMode === 'election') {
                if (view === 'login') {
                    await login(emailInput, passwordInput);
                } else {
                    const role = userType;
                    const hierarchy = {
                        state: stateId,
                        district: districtId,
                        constituency: constituencyId,
                        mandal: mandalId,
                        booth: boothId
                    };
                    await signup(emailInput, passwordInput, role, { name: nameInput }, hierarchy);
                }
            } else {
                let email = emailInput;
                if (view === 'signup' || !email.includes('@')) {
                    if (userType === 'booth') {
                        email = `booth_${boothIdInput}@innovateindia.gov`;
                    } else if (userType === 'dm') {
                        email = `dm_${selectedDistrict.replace(/\s+/g, '_').toLowerCase()}_${nameInput.replace(/\s+/g, '_').toLowerCase()}@innovateindia.gov`;
                    } else if (userType === 'cm') {
                        email = `cm_${nameInput.replace(/\s+/g, '_').toLowerCase()}@innovateindia.gov`;
                    }
                }

                if (view === 'login') {
                    await login(email, passwordInput);
                } else {
                    const adminRole = userType.toUpperCase();
                    const metadata = userType === 'booth'
                        ? { name: nameInput }
                        : userType === 'dm'
                            ? { district: selectedDistrict, name: nameInput }
                            : { department: 'CM Secretariat' };
                    await signup(email, passwordInput, adminRole, metadata);
                }
            }
            router.push('/');
        } catch (err) {
            setError(err.message || 'Authentication failed.');
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: white, fontFamily: 'Public Sans, sans-serif', overflow: 'hidden' }}>
            <div style={{
                display: 'none',
                width: '50%',
                backgroundColor: navy,
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 80px',
                position: 'relative',
                borderRight: `1px solid ${gold}22`,
                overflow: 'hidden'
            }} className="lg-flex">
                <style dangerouslySetInnerHTML={{ __html: `@media (min-width: 1024px) { .lg-flex { display: flex !important; } }` }} />

                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 0,
                        opacity: 0.35
                    }}
                >
                    <source src="/Background.mp4" type="video/mp4" />
                </video>

                <div style={{ maxWidth: '448px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '64px' }}>
                        <img src={logo?.src || logo} alt="Logo" style={{ height: '120px', objectFit: 'contain', objectPosition: 'left', display: 'block', marginBottom: '32px' }} />
                        <div style={{ height: '6px', width: '80px', backgroundColor: gold, marginBottom: '24px' }} />
                        <span style={{ color: slate500, fontSize: '12px', fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase' }}>
                            {portalMode === 'election' ? 'Politix OS Node' : 'AAkar Intelligence'}
                        </span>
                    </div>

                    <h1 style={{ color: white, fontSize: '42px', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.03em' }}>
                        {portalMode === 'election' ? 'Election Command Console' : 'Secure Admin Infrastructure'}
                    </h1>

                    <p style={{ color: slate400, fontSize: '18px', fontWeight: 500, lineHeight: 1.6, maxWidth: '384px' }}>
                        {portalMode === 'election'
                            ? 'Monitor real-time turnout, organizational strength, and election readiness across your entire hierarchy.'
                            : 'Dedicated infrastructure for CM, District Magistrates, and Booth Officials. Real-time complaints tracking.'}
                    </p>
                </div>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '0 24px', backgroundColor: white, overflowY: 'auto' }} className="right-panel">
                <style dangerouslySetInnerHTML={{ __html: `@media (min-width: 1024px) { .right-panel { width: 55% !important; padding: 0 80px !important; } }` }} />

                <div style={{ maxWidth: '520px', width: '100%', margin: '0 auto', padding: '60px 0' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
                        <div style={{ display: 'flex', gap: '8px', background: slate50, padding: '4px', borderRadius: '12px', border: `1px solid ${slate100}` }}>
                            <button
                                onClick={() => { setPortalMode('admin'); setUserType('cm'); }}
                                style={{
                                    padding: '10px 16px', borderRadius: '10px', fontSize: '10px', fontWeight: 900, border: 'none', cursor: 'pointer',
                                    backgroundColor: portalMode === 'admin' ? navy : 'transparent',
                                    color: portalMode === 'admin' ? white : slate400,
                                    boxShadow: portalMode === 'admin' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >ADMINISTRATION</button>
                            <button
                                onClick={() => setPortalMode('election')}
                                style={{
                                    padding: '10px 16px', borderRadius: '10px', fontSize: '10px', fontWeight: 900, border: 'none', cursor: 'pointer',
                                    backgroundColor: portalMode === 'election' ? navy : 'transparent',
                                    color: portalMode === 'election' ? white : slate400,
                                    boxShadow: portalMode === 'election' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >ELECTION MGMT</button>
                        </div>
                        <button onClick={() => setView(view === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: gold, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>
                            {view === 'login' ? 'Request Access →' : 'Back to Login'}
                        </button>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '30px', fontWeight: 900, color: navy, letterSpacing: '-0.025em' }}>
                            {view === 'login' ? 'Authorized Login' : 'System Registration'}
                        </h2>
                        <p style={{ color: slate400, fontSize: '10px', fontWeight: 900, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                            {portalMode === 'election' ? 'Politix OS Election Control' : 'ADMINISTRATIVE INTELLIGENCE NODE'}
                        </p>
                    </div>

                    {portalMode === 'admin' && (
                        <div style={{ display: 'flex', border: `2px solid ${slate100}`, borderRadius: '16px', marginBottom: '40px', padding: '6px', backgroundColor: slate50, gap: '4px' }}>
                            <button type="button" onClick={() => setUserType('booth')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 0', borderRadius: '12px', fontSize: '10px', fontWeight: 900, border: 'none', cursor: 'pointer', backgroundColor: userType === 'booth' ? navy : 'transparent', color: userType === 'booth' ? white : slate400 }}>
                                <MapPin size={14} color={userType === 'booth' ? gold : slate400} /> BOOTH
                            </button>
                            <button type="button" onClick={() => setUserType('dm')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 0', borderRadius: '12px', fontSize: '10px', fontWeight: 900, border: 'none', cursor: 'pointer', backgroundColor: userType === 'dm' ? navy : 'transparent', color: userType === 'dm' ? white : slate400 }}>
                                <Building2 size={14} color={userType === 'dm' ? gold : slate400} /> DM
                            </button>
                            <button type="button" onClick={() => setUserType('cm')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 0', borderRadius: '12px', fontSize: '10px', fontWeight: 900, border: 'none', cursor: 'pointer', backgroundColor: userType === 'cm' ? navy : 'transparent', color: userType === 'cm' ? white : slate400 }}>
                                <ShieldCheck size={14} color={userType === 'cm' ? gold : slate400} /> CM
                            </button>
                        </div>
                    )}

                    {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '14px', borderRadius: '12px', marginBottom: '24px', fontSize: '11px', fontWeight: 700 }}>{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {portalMode === 'election' ? (
                            <>
                                {view === 'signup' && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <FlatField label="Full Name" icon={<User size={16} />} placeholder="Name" value={nameInput} onChange={setNameInput} />
                                            <FlatField label="Gov Email" icon={<Globe size={16} />} placeholder="email@domain.com" value={emailInput} onChange={setEmailInput} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <FlatField label="State" icon={<MapPin size={16} />} placeholder="DELHI" value={stateId} onChange={setStateId} />
                                            <FlatField label="District" icon={<MapPin size={16} />} placeholder="CENTRAL" value={districtId} onChange={setDistrictId} />
                                            <FlatField label="Constituency" icon={<BadgeCheck size={16} />} placeholder="ND-01" value={constituencyId} onChange={setConstituencyId} />
                                            <FlatField label="Mandal" icon={<Building2 size={16} />} placeholder="Local Ward" value={mandalId} onChange={setMandalId} />
                                        </div>
                                        <FlatField label="Booth ID" icon={<Flag size={16} />} placeholder="Unique Code" value={boothId} onChange={setBoothId} />
                                    </>
                                )}
                                {view === 'login' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '9px', fontWeight: 900, color: slate400, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '4px' }}>Role</label>
                                            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} style={{ width: '100%', backgroundColor: slate50, border: `1px solid ${slate200}`, borderRadius: '12px', padding: '16px', fontSize: '12px', fontWeight: 700, outline: 'none', transition: 'all 0.2s ease', cursor: 'pointer' }} onFocus={(e) => e.target.style.borderColor = "#D4AF37"} onBlur={(e) => e.target.style.borderColor = slate200}>
                                                <option value="State Admin">State Admin</option>
                                                <option value="District Admin">District Admin</option>
                                                <option value="Constituency Manager">Constituency Manager</option>
                                                <option value="Mandal Manager">Mandal Manager</option>
                                                <option value="Booth Manager">Booth Manager</option>
                                            </select>
                                        </div>
                                        <FlatField label="Authorized Email" icon={<User size={16} />} placeholder="Email address" value={emailInput} onChange={setEmailInput} />
                                    </>
                                )}
                                <FlatField label="Security Key" icon={<Lock size={16} />} placeholder="••••••••" type="password" value={passwordInput} onChange={setPasswordInput} />
                                {view === 'signup' && <FlatField label="Confirm Key" icon={<Lock size={16} />} placeholder="••••••••" type="password" value={confirmPasswordInput} onChange={setConfirmPasswordInput} />}
                            </>
                        ) : (
                            <>
                                {view === 'signup' ? (
                                    <>
                                        {userType === 'booth' && (
                                            <>
                                                <FlatField label="Official Name" icon={<User size={16} />} placeholder="Full Name" value={nameInput} onChange={setNameInput} />
                                                <FlatField label="Booth ID" icon={<BadgeCheck size={16} />} placeholder="Unique Booth #" value={boothIdInput} onChange={setBoothIdInput} />
                                            </>
                                        )}
                                        {userType === 'dm' && (
                                            <>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '9px', fontWeight: 900, color: slate400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>District</label>
                                                    <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} style={{ width: '100%', backgroundColor: slate50, border: `1px solid ${slate200}`, borderRadius: '12px', padding: '16px', fontSize: '12px', fontWeight: 700, outline: 'none' }}>
                                                        {districtsList.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                <FlatField label="Official ID" icon={<User size={16} />} placeholder="DM Name" value={nameInput} onChange={setNameInput} />
                                            </>
                                        )}
                                        {userType === 'cm' && <FlatField label="Gov Official ID" icon={<ShieldCheck size={16} />} placeholder="GOV-XXXX" value={nameInput} onChange={setNameInput} />}
                                        <FlatField label="Security Pin" icon={<Lock size={16} />} placeholder="••••••••" type="password" value={passwordInput} onChange={setPasswordInput} />
                                        <FlatField label="Confirm Pin" icon={<Lock size={16} />} placeholder="••••••••" type="password" value={confirmPasswordInput} onChange={setConfirmPasswordInput} />
                                    </>
                                ) : (
                                    <>
                                        {userType === 'booth' && (
                                            <>
                                                <FlatField label="Official Name" icon={<User size={16} />} placeholder="Enter registered name" value={nameInput} onChange={setNameInput} />
                                                <FlatField label="Booth ID" icon={<BadgeCheck size={16} />} placeholder="Enter unique Booth #" value={boothIdInput} onChange={setBoothIdInput} />
                                            </>
                                        )}
                                        {userType === 'dm' && (
                                            <>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '9px', fontWeight: 900, color: slate400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>District</label>
                                                    <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} style={{ width: '100%', backgroundColor: slate50, border: `1px solid ${slate200}`, borderRadius: '12px', padding: '16px', fontSize: '12px', fontWeight: 700, outline: 'none' }}>
                                                        {districtsList.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                <FlatField label="Official ID / Name" icon={<User size={16} />} placeholder="Enter DM ID" value={nameInput} onChange={setNameInput} />
                                            </>
                                        )}
                                        {userType === 'cm' && <FlatField label="CM Secretariat ID" icon={<ShieldCheck size={16} />} placeholder="Enter ID" value={nameInput} onChange={setNameInput} />}
                                        <FlatField label="Security Pin" icon={<Lock size={16} />} placeholder="••••••••" type="password" value={passwordInput} onChange={setPasswordInput} />
                                    </>
                                )}
                            </>
                        )}

                        <button type="submit" disabled={loading} style={{
                            width: '100%', backgroundColor: navy, color: white, padding: '18px', marginTop: '16px', borderRadius: '16px', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                        }}>
                            {loading ? 'Authorizing...' : (view === 'login' ? 'Initiate Session' : 'Register Access')}
                            {!loading && <ArrowRight size={16} color={gold} />}
                        </button>
                    </form>

                    <footer style={{ marginTop: '48px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', color: slate400, fontWeight: 700, letterSpacing: '0.1em' }}>© 2026</span>
                            <img src={logo?.src || logo} alt="Logo" style={{ height: '16px', filter: 'brightness(0)' }} />
                            <span style={{ fontSize: '10px', color: slate400, fontWeight: 700, letterSpacing: '0.1em' }}>• National Data Network</span>
                        </div>
                        <span style={{ fontSize: '10px', color: gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{portalMode === 'election' ? 'ELECTION CONTROL CENTER' : 'SECURE INTELLIGENCE NODE'}</span>
                    </footer>
                </div>
            </div>
        </div>
    );
}

function FlatField({ label, icon, placeholder, type = "text", value, onChange }) {
    const slate200 = "#e2e8f0";
    const slate50 = "#f8fafc";
    const slate300 = "#cbd5e1";
    const slate400 = "#94a3b8";

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '9px', fontWeight: 900, color: slate400, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '4px' }}>{label}</label>
            <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: slate300 }}>{icon}</div>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        width: '100%', backgroundColor: slate50, border: `1px solid ${slate200}`, borderRadius: '12px', padding: '16px 16px 16px 48px', fontSize: '12px', fontWeight: 700, outline: 'none', transition: 'all 0.2s ease'
                    }}
                    placeholder={placeholder}
                    onFocus={(e) => e.target.style.borderColor = "#D4AF37"}
                    onBlur={(e) => e.target.style.borderColor = slate200}
                />
            </div>
        </div>
    );
}
