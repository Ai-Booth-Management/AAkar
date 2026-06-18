"use client";
import React from 'react';
import { Users, Vote, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TurnoutDashboard({ hierarchy }) {
    // Mock Data for Demo
    const turnoutData = {
        totalVoters: 1250,
        votesCast: 782,
        turnoutPercentage: 62.56,
        previousTurnout: 58.20,
        change: +4.36,
        lastUpdated: "2 minutes ago"
    };

    const weakBooths = [
        { id: "B104", turnout: 38.2, status: "Critical", reason: "Low accessibility" },
        { id: "B122", turnout: 42.1, status: "Warning", reason: "Urban apathy" },
        { id: "B156", turnout: 45.8, status: "Warning", reason: "Rain disruption" }
    ];

    const demographics = [
        { group: "Youth (18-25)", turnout: 48.5, total: 420 },
        { group: "Female (General)", turnout: 64.2, total: 580 },
        { group: "Senior Citizens", turnout: 72.1, total: 250 }
    ];

    const cardStyle = {
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Real-time Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '12px' }}><Users size={20} color="#0f172a" /></div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>TOTAL VOTERS</div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a' }}>{turnoutData.totalVoters.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Registered in current hierarchy</div>
                </div>

                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '12px' }}><Vote size={20} color="#0f172a" /></div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>VOTES CAST</div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a' }}>{turnoutData.votesCast.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Confirmed ballots recorded</div>
                </div>

                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px' }}><TrendingUp size={20} color="#D4AF37" /></div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#D4AF37' }}>CURRENT TURNOUT</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a' }}>{turnoutData.turnoutPercentage}%</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center' }}>
                            <ArrowUpRight size={14} /> +4.36%
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Vs Previous Election: 58.2%</div>
                </div>
            </div>

            {/* Turnout Detection & Demographics */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle size={18} color="#ef4444" /> Low Turnout Detection System
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {weakBooths.map(booth => (
                            <div key={booth.id} style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>Booth #{booth.id}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Reason: {booth.reason}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#ef4444' }}>{booth.turnout}%</div>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>{booth.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button style={{ width: '100%', marginTop: '20px', padding: '12px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Generate Interventional Strategy
                    </button>
                </div>

                <div style={cardStyle}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>Demographic Split</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {demographics.map(group => (
                            <div key={group.group}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>{group.group}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a' }}>{group.turnout}%</span>
                                </div>
                                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${group.turnout}%`, background: group.turnout < 50 ? '#ef4444' : '#0f172a', borderRadius: '4px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
