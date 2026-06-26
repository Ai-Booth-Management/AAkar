"use client";
import React from 'react';
import { Calendar, Map, CheckCircle2, Clock, Users, Activity } from 'lucide-react';

export default function CampaignTracker({ hierarchy }) {
    const stats = {
        planned: 48,
        completed: 39,
        completionRate: 81
    };

    const upcomingActivities = [
        { type: "Door-to-door", target: "Booth 102", time: "Tomorrow, 10:00 AM", volunteers: 12 },
        { type: "Public Rally", target: "Constituency Square", time: "June 20, 04:00 PM", volunteers: 150 },
        { type: "Volunteer Meet", target: "Mandal Office", time: "June 21, 06:00 PM", volunteers: 45 }
    ];

    const cardStyle = {
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <StatCard label="Planned Activities" value={stats.planned} icon={<Calendar color="#6366f1" />} />
                <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 color="#10b981" />} />
                <StatCard label="Yield Rate" value={`${stats.completionRate}%`} icon={<Activity color="#D4AF37" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>Upcoming Schedule</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {upcomingActivities.map((act, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', border: '1px solid #e2e8f0' }}>
                                    <Clock size={18} color="#64748b" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{act.type}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{act.target} • {act.time}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                    <Users size={14} color="#64748b" /> {act.volunteers}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ ...cardStyle, background: '#0f172a', color: 'white' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, marginBottom: '24px' }}>Coverage Insights</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '48px', fontWeight: 900, color: '#D4AF37' }}>18/24</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Booths Visited This Week</div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginTop: '12px' }}>
                            <div style={{ height: '100%', width: '75%', background: '#D4AF37', borderRadius: '4px' }} />
                        </div>
                    </div>
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
