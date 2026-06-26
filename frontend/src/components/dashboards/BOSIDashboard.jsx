"use client";
import React from 'react';
import { Shield, Users, MapPin, Gauge, Star, Zap } from 'lucide-react';

export default function BOSIDashboard({ hierarchy }) {
    const bosiData = {
        overallScore: 84,
        activeVolunteers: 142,
        boothCoverage: 92,
        influenceRadius: "4.2km"
    };

    const categories = [
        { name: "Manpower", score: 88, color: "#10b981" },
        { name: "Digital Reach", score: 72, color: "#D4AF37" },
        { name: "Historical Loyalty", score: 95, color: "#0f172a" },
        { name: "Resource Readiness", score: 64, color: "#f59e0b" }
    ];

    const cardStyle = {
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header Score */}
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '12px', fontWeight: 900, color: '#D4AF37', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>BOSI ANALYTICS</h2>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.02em' }}>Booth Organizational Strength</h1>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '48px', fontWeight: 900, color: '#D4AF37' }}>{bosiData.overallScore}</div>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>INDEX SCORE</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                <StatCard label="Active Volunteers" value={bosiData.activeVolunteers} icon={<Users size={20} color="#0f172a" />} />
                <StatCard label="Booth Coverage" value={`${bosiData.boothCoverage}%`} icon={<MapPin size={20} color="#0f172a" />} />
                <StatCard label="Influence Radius" value={bosiData.influenceRadius} icon={<Zap size={20} color="#0f172a" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>Strength Decomposition</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {categories.map(cat => (
                            <div key={cat.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#475569' }}>{cat.name}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{cat.score}%</span>
                                </div>
                                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${cat.score}%`, background: cat.color, borderRadius: '4px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={cardStyle}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>Top Performing Units</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <UnitRow name="Booth 102" score={98} />
                        <UnitRow name="Booth 144" score={94} />
                        <UnitRow name="Booth 201" score={89} />
                        <UnitRow name="Booth 087" score={86} />
                    </div>
                    <button style={{ width: '100%', marginTop: '24px', padding: '14px', background: 'transparent', border: '2px solid #0f172a', borderRadius: '12px', fontSize: '11px', fontWeight: 900, color: '#0f172a', cursor: 'pointer', textTransform: 'uppercase' }}>
                        View Full Ranking
                    </button>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon }) {
    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>{value}</div>
            </div>
        </div>
    );
}

function UnitRow({ name, score }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Star size={16} color="#D4AF37" fill="#D4AF37" />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{name}</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#10b981' }}>{score}</span>
        </div>
    );
}
