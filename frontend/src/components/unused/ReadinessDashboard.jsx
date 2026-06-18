"use client";
import React from 'react';
import { Target, CheckCircle2, AlertCircle, Briefcase, GraduationCap, Users2 } from 'lucide-react';

export default function ReadinessDashboard({ hierarchy }) {
    const readinessScore = 67;
    
    const missingItems = [
        { item: "2 Polling Agents", category: "Personnel", status: "Critical" },
        { item: "Volunteer Training (Phase 2)", category: "Training", status: "In-progress" },
        { item: "Booth Committee Approval", category: "Governance", status: "Pending" }
    ];

    const milestones = [
        { label: "Polling Agents Assigned", progress: 80, icon: <Users2 size={16} /> },
        { label: "Training Modules Completed", progress: 45, icon: <GraduationCap size={16} /> },
        { label: "Resource Distribution", progress: 92, icon: <Briefcase size={16} /> }
    ];

    const cardStyle = {
        background: 'white',
        padding: '28px',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '28px' }}>
                {/* Readiness Score Doughnut (Abstracted) */}
                <div style={{ ...cardStyle, background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: '160px', height: '160px', marginBottom: '24px' }}>
                        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#D4AF37" strokeWidth="3" strokeDasharray={`${readinessScore}, 100`} />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '32px', fontWeight: 900 }}>{readinessScore}%</div>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px' }}>Election Readiness</h3>
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>Operational capacity for Polling Day</p>
                </div>

                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>Critical Action Items</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {missingItems.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#fff7ed', borderRadius: '14px', border: '1px solid #ffedd5' }}>
                                <AlertCircle size={20} color="#f97316" style={{ marginRight: '16px' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#9a3412' }}>{item.item}</div>
                                    <div style={{ fontSize: '11px', color: '#c2410c', textTransform: 'uppercase', fontWeight: 800 }}>{item.category}</div>
                                </div>
                                <span style={{ fontSize: '10px', fontWeight: 900, background: '#ffedd5', padding: '4px 10px', borderRadius: '6px', color: '#9a3412' }}>{item.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' }}>
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>Milestone Progress</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {milestones.map((m, idx) => (
                            <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800, color: '#475569' }}>
                                        {m.icon} {m.label}
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{m.progress}%</span>
                                </div>
                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${m.progress}%`, background: m.progress > 80 ? '#10b981' : '#D4AF37', borderRadius: '3px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: 'none' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'white', marginBottom: '24px' }}>AI Compliance Check</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <ComplianceItem label="Voter Data Integrity" status="OK" />
                        <ComplianceItem label="Booth Committee Quorum" status="MISSING" color="#ef4444" />
                        <ComplianceItem label="Security Protocols" status="OK" />
                        <ComplianceItem label="Campaign Finance Logs" status="PENDING" color="#D4AF37" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ComplianceItem({ label, status, color = "#10b981" }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '10px', fontWeight: 900, color: color, letterSpacing: '0.1em' }}>{status}</span>
        </div>
    );
}
