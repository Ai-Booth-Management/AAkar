import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const SettingsPanel = () => {
    const { currentUser } = useAuth();
    const [ocrConfidence, setOcrConfidence] = useState(85);
    const [smsAlerts, setSmsAlerts] = useState(true);
    const [riskThreshold, setRiskThreshold] = useState('High');
    const [saveStatus, setSaveStatus] = useState(null);

    // Design Tokens - Digital Secretariat
    const navy = "#04122e";
    const navyLight = "#1a2744";
    const saffron = "#D4A843";
    const surface = "#f8f9fb";
    const surfaceDeep = "#edeef0";
    const white = "#ffffff";
    const gray400 = "#94a3b8";
    const gray600 = "#475569";

    const handleSave = (e) => {
        e.preventDefault();
        setSaveStatus("SAVING PROTOCOL PARAMETERS...");
        setTimeout(() => {
            setSaveStatus("CONFIGURATION UPDATED SUCCESSFULLY.");
            setTimeout(() => setSaveStatus(null), 3000);
        }, 1000);
    };

    const officialId = currentUser?.email 
        ? currentUser.email.split('@')[0].split('_').slice(1).join('_') 
        : 'OFFICIAL';

    return (
        <div style={{ backgroundColor: surface, minHeight: '100%', fontFamily: '"Public Sans", "Inter", sans-serif' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
                    {/* Main Settings Panel */}
                    <div style={{ backgroundColor: white, border: `1px solid ${surfaceDeep}`, padding: '48px', position: 'relative' }}>
                        <header style={{ marginBottom: '40px', borderLeft: `6px solid ${navy}`, paddingLeft: '24px' }}>
                            <h2 style={{ fontSize: '10px', fontWeight: '900', color: gray400, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '8px' }}>
                                System Control
                            </h2>
                            <h1 style={{ fontSize: '24px', fontWeight: '900', color: navy, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                                Administrative Settings
                            </h1>
                        </header>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {/* Profile Info */}
                            <div style={{ borderBottom: `1px solid ${surfaceDeep}`, paddingBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '900', color: navy, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
                                    Administrator Identity
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email ID</span>
                                        <div style={{ padding: '16px', backgroundColor: surface, border: `1px solid ${surfaceDeep}`, fontSize: '13px', color: navy, fontWeight: '700' }}>
                                            {currentUser?.email || 'N/A'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Designation Code</span>
                                        <div style={{ padding: '16px', backgroundColor: surface, border: `1px solid ${surfaceDeep}`, fontSize: '13px', color: navy, fontWeight: '700' }}>
                                            {officialId}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* OCR & Intelligence Settings */}
                            <div style={{ borderBottom: `1px solid ${surfaceDeep}`, paddingBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '900', color: navy, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
                                    Intelligence & OCR Parameters
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            OCR Tesseract Confidence Threshold ({ocrConfidence}%)
                                        </label>
                                        <input 
                                            type="range" 
                                            min="50" 
                                            max="95" 
                                            value={ocrConfidence}
                                            onChange={e => setOcrConfidence(parseInt(e.target.value))}
                                            style={{ marginTop: '16px', cursor: 'pointer', accentColor: navy }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '900', color: gray600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            Risk Escalation Trigger Level
                                        </label>
                                        <select 
                                            value={riskThreshold} 
                                            onChange={e => setRiskThreshold(e.target.value)}
                                            style={{ padding: '16px', border: `1px solid ${surfaceDeep}`, backgroundColor: surface, fontSize: '13px', fontWeight: '700', color: navy, outline: 'none', cursor: 'pointer' }}
                                        >
                                            <option value="Low">Low Risk & Above</option>
                                            <option value="Medium">Medium Risk & Above</option>
                                            <option value="High">High Risk Only</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Dispatch Settings */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: '900', color: navy, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
                                    Notification Protocols
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="smsAlerts"
                                        checked={smsAlerts}
                                        onChange={e => setSmsAlerts(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: navy }}
                                    />
                                    <label htmlFor="smsAlerts" style={{ fontSize: '12px', fontWeight: '700', color: navy, cursor: 'pointer' }}>
                                        Enable instant SMS dispatch to Booth Officers on critical complaints.
                                    </label>
                                </div>
                            </div>

                            {saveStatus && (
                                <div style={{ 
                                    padding: '20px', 
                                    backgroundColor: '#f0fdf4',
                                    borderLeft: `4px solid #22c55e`,
                                    color: '#166534',
                                    fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em'
                                }}>
                                    {saveStatus}
                                </div>
                            )}

                            <button 
                                type="submit"
                                style={{ 
                                    backgroundColor: navy, color: white, padding: '20px', border: 'none', fontSize: '11px', fontWeight: '900', 
                                    textTransform: 'uppercase', letterSpacing: '0.4em', cursor: 'pointer',
                                    borderBottom: `4px solid ${saffron}`
                                }}
                            >
                                Update Configurations
                            </button>
                        </form>
                    </div>

                    {/* Sidebar Guidelines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ backgroundColor: navyLight, padding: '32px', borderTop: `4px solid ${saffron}` }}>
                            <h3 style={{ fontSize: '11px', fontWeight: '900', color: saffron, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>
                                Service Connections
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '700' }}>FastAPI Server</span>
                                    <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: '900', letterSpacing: '0.05em' }}>● ONLINE</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '700' }}>Neo4j Topology</span>
                                    <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: '900', letterSpacing: '0.05em' }}>● CONNECTED</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '700' }}>SMS API Route</span>
                                    <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: '900', letterSpacing: '0.05em' }}>● ACTIVE</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '700' }}>SQLite Registry</span>
                                    <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: '900', letterSpacing: '0.05em' }}>● READ_WRITE</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: white, padding: '32px', border: `1px solid ${surfaceDeep}` }}>
                            <h3 style={{ fontSize: '10px', fontWeight: '900', color: navy, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
                                Encoded Logs
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '10px', color: gray400, fontFamily: 'monospace' }}>
                                <div>STATION: SEC-ADM-02</div>
                                <div>VERSION: 1.0.0-PROD</div>
                                <div>IP: 127.0.0.1</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
