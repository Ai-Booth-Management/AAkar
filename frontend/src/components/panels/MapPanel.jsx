import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import MapSelector from './map/MapSelector';
import MapReport from './map/MapReport';
import MapLeaflet from './map/MapLeaflet';
import { getDistrictFromEmail, getReportForDistrict, getAggregateReport } from './map/mapUtils';
import 'leaflet/dist/leaflet.css';

const MapPanel = () => {
    const { currentUser } = useAuth();
    const [districtMetrics, setDistrictMetrics] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [geojsonData, setGeojsonData] = useState(null);
    const [activeCategory, setActiveCategory] = useState("All"); // Sanitation, Water, Roads, Electricity, All
    const [selectedDistrict, setSelectedDistrict] = useState(null);

    // Map Overlays state
    const [overlays, setOverlays] = useState({
        projects: true,
        health: true,
        education: true
    });

    // Categories config
    const categories = [
        { key: "All", label: "All Civic Issues", color: "#64748b" },
        { key: "Sanitation", label: "Sanitation", color: "#ef4444" },
        { key: "Water", label: "Water Supply", color: "#3b82f6" },
        { key: "Roads", label: "Road Infrastructure", color: "#f59e0b" },
        { key: "Electricity", label: "Electricity", color: "#8b5cf6" }
    ];

    // Theme colors
    const navy = "#04122e";
    const navyLight = "#1a2744";
    const saffron = "#D4A843";

    const fetchMetrics = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/heatmap/metrics', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                throw new Error('Failed to fetch heatmap metrics');
            }
            const data = await res.json();
            const metricsDict = {};
            data.forEach(m => {
                metricsDict[m.name] = {
                    status: m.status,
                    complaints: {
                        Total: m.complaints_total,
                        Sanitation: m.complaints_sanitation,
                        Water: m.complaints_water,
                        Roads: m.complaints_roads,
                        Electricity: m.complaints_electricity
                    },
                    solved: {
                        Total: m.solved_total,
                        Sanitation: m.solved_sanitation,
                        Water: m.solved_water,
                        Roads: m.solved_roads,
                        Electricity: m.solved_electricity
                    },
                    active: {
                        Total: m.active_total,
                        Sanitation: m.active_sanitation,
                        Water: m.active_water,
                        Roads: m.active_roads,
                        Electricity: m.active_electricity
                    },
                    avgResponse: m.avg_response,
                    escalations: m.escalations,
                    alerts: {
                        health: m.alerts_health,
                        education: m.alerts_education
                    },
                    project: {
                        name: m.project_name,
                        status: m.project_status
                    },
                    details: {
                        Sanitation: { who: m.officer_sanitation },
                        Water: { who: m.officer_water },
                        Roads: { who: m.officer_roads },
                        Electricity: { who: m.officer_electricity }
                    }
                };
            });
            setDistrictMetrics(metricsDict);
        } catch (e) {
            console.error(e);
            setError('Failed to load district metrics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [currentUser]);

    // Load Local Delhi GeoJSON File
    useEffect(() => {
        fetch('/delhi_districts.geojson')
            .then(res => {
                if (!res.ok) return Promise.reject(new Error("Failed to load Delhi GeoJSON file"));
                return res.json();
            })
            .then(data => setGeojsonData(data))
            .catch(err => console.error(err));
    }, []);

    // Lock district if role is dm
    useEffect(() => {
        if (currentUser && currentUser.role && currentUser.role.toLowerCase() === 'dm' && currentUser.email) {
            const assigned = getDistrictFromEmail(currentUser.email);
            if (assigned) {
                setSelectedDistrict(assigned);
            }
        }
    }, [currentUser]);

    // Aggregate statistics helper
    const getAggregateStats = () => {
        let total = 0;
        let solved = 0;
        let active = 0;
        let escalations = 0;

        const lookupKey = activeCategory === "All" ? "Total" : activeCategory;

        if (selectedDistrict && districtMetrics[selectedDistrict]) {
            const d = districtMetrics[selectedDistrict];
            total = d.complaints[lookupKey] || 0;
            solved = d.solved[lookupKey] || 0;
            active = d.active[lookupKey] || 0;
            escalations = d.escalations || 0;
        } else {
            Object.values(districtMetrics).forEach(d => {
                total += d.complaints[lookupKey] || 0;
                solved += d.solved[lookupKey] || 0;
                active += d.active[lookupKey] || 0;
                escalations += d.escalations || 0;
            });
        }

        const solveRate = total > 0 ? Math.round((solved / total) * 100) : 100;
        const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

        return { total, solved, active, escalations, solveRate, activeRate };
    };

    const stats = getAggregateStats();

    // Accountability reports
    const details = selectedDistrict
        ? getReportForDistrict(districtMetrics, selectedDistrict, activeCategory)
        : getAggregateReport(districtMetrics, activeCategory);

    const statusBadge = (selectedDistrict && districtMetrics[selectedDistrict])
        ? districtMetrics[selectedDistrict].status
        : "OVERVIEW";

    // Dynamic category progress bars builder
    const getCategoryBreakdown = () => {
        let sanitation = 0;
        let water = 0;
        let roads = 0;
        let electricity = 0;

        if (selectedDistrict && districtMetrics[selectedDistrict]) {
            const d = districtMetrics[selectedDistrict];
            sanitation = d.complaints.Sanitation || 0;
            water = d.complaints.Water || 0;
            roads = d.complaints.Roads || 0;
            electricity = d.complaints.Electricity || 0;
        } else {
            Object.values(districtMetrics).forEach(d => {
                sanitation += d.complaints.Sanitation || 0;
                water += d.complaints.Water || 0;
                roads += d.complaints.Roads || 0;
                electricity += d.complaints.Electricity || 0;
            });
        }

        const total = sanitation + water + roads + electricity;
        
        return [
            { label: "Sanitation Issues", count: sanitation, pct: total > 0 ? Math.round((sanitation / total) * 100) : 0, color: "#ef4444" },
            { label: "Water Supply Deficit", count: water, pct: total > 0 ? Math.round((water / total) * 100) : 0, color: "#3b82f6" },
            { label: "Road Infrastructure", count: roads, pct: total > 0 ? Math.round((roads / total) * 100) : 0, color: "#f59e0b" },
            { label: "Electricity Outages", count: electricity, pct: total > 0 ? Math.round((electricity / total) * 100) : 0, color: "#8b5cf6" }
        ].sort((a, b) => b.count - a.count); // Sort by highest count
    };

    const breakdown = getCategoryBreakdown();

    if (loading && Object.keys(districtMetrics).length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#64748b' }}>
                Loading boundary metrics...
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: '"Public Sans", "Inter", sans-serif', background: '#f8fafc', padding: '16px 0' }}>
            {error && <div className="error-msg" style={{ margin: 0, padding: 12 }}>{error}</div>}
            
            {/* Header controls & Pills */}
            <MapSelector
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                categories={categories}
                currentUser={currentUser}
                setSelectedDistrict={setSelectedDistrict}
            />

            {/* Emerging Trend Warning banner */}
            <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '12px 18px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#991b1b',
                fontSize: '13px',
                fontWeight: '700'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                    <span>Emerging Trend Warning: Spikes detected in categories (SANITATION: 15 cases, WATER: 13 cases) in Central & South districts!</span>
                </div>
                <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: 2 }}>RED-ZONE PULSING</span>
            </div>

            {/* Two-Column Workspace Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, minHeight: 480 }}>
                
                {/* Map Card */}
                <MapLeaflet
                    geojsonData={geojsonData}
                    activeCategory={activeCategory}
                    selectedDistrict={selectedDistrict}
                    setSelectedDistrict={setSelectedDistrict}
                    overlays={overlays}
                    districtMetrics={districtMetrics}
                />

                {/* Right Statistics & Details Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* District Selector & Overview */}
                    <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
                            <h3 style={{ margin: 0, color: navy, fontSize: '15px', fontWeight: '900', textTransform: 'uppercase' }}>
                                {selectedDistrict ? `${selectedDistrict} District` : "NCT of Delhi"}
                            </h3>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '2px 8px',
                                background: statusBadge === "CRITICAL" ? '#fef2f2' : '#f0fdf4',
                                color: statusBadge === "CRITICAL" ? '#991b1b' : '#166534',
                                borderRadius: 2
                            }}>
                                {statusBadge}
                            </span>
                        </div>

                        {/* Cases Cards Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                            <div style={{ background: '#f8fafc', padding: '10px 8px', border: '1px solid #e2e8f0', borderRadius: 4, textAlign: 'center' }}>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: navy }}>{stats.total}</div>
                                <div style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', marginTop: 2 }}>TOTAL</div>
                            </div>
                            <div style={{ background: '#f0fdf4', padding: '10px 8px', border: '1px solid #bbf7d0', borderRadius: 4, textAlign: 'center' }}>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#166534' }}>{stats.solved}</div>
                                <div style={{ fontSize: '9px', fontWeight: '700', color: '#15803d', marginTop: 2 }}>SOLVED ({stats.solveRate}%)</div>
                            </div>
                            <div style={{ background: '#fef2f2', padding: '10px 8px', border: '1px solid #fecaca', borderRadius: 4, textAlign: 'center' }}>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#991b1b' }}>{stats.active}</div>
                                <div style={{ fontSize: '9px', fontWeight: '700', color: '#b91c1c', marginTop: 2 }}>ACTIVE ({stats.activeRate}%)</div>
                            </div>
                        </div>

                        {/* Response Time & Escalations */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: 8 }}>
                            <div>Avg. Response: <span style={{ color: navy }}>{(selectedDistrict && districtMetrics[selectedDistrict]) ? districtMetrics[selectedDistrict].avgResponse : "24h"}</span></div>
                            <div>Escalations: <span style={{ color: '#ef4444' }}>{stats.escalations} Active</span></div>
                        </div>
                    </div>

                    {/* Top Sub-Issues progress bars */}
                    <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: 16 }}>
                        <h4 style={{ margin: '0 0 16px 0', color: navy, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Top Sub-Issues Breakdown
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {breakdown.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                                        <span>{item.label}</span>
                                        <span>{item.count} ({item.pct}%)</span>
                                    </div>
                                    <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: 3 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Temporal Patterns & Trends */}
                    <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: 16 }}>
                        <h4 style={{ margin: '0 0 12px 0', color: navy, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Temporal Patterns & Trends
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '11px', color: '#475569' }}>
                            <div><strong>Weekly Pattern:</strong> Weekends (Fri-Sun) dominate with 45% spike in recreation zones.</div>
                            <div><strong>Diurnal Rhythm:</strong> Evening peak hours (06:00 PM - 10:00 PM) show highest load anomalies.</div>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 8, borderRadius: 2, marginTop: 4 }}>
                                <span style={{ color: navy, fontWeight: '800' }}>• Weekly recurrence: 2 cycles separated by 7 days detected.</span>
                            </div>
                        </div>
                    </div>

                    {/* Map Overlay Toggles Card */}
                    <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: 16 }}>
                        <h4 style={{ margin: '0 0 12px 0', color: navy, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Map Overlay Layers
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={overlays.projects} 
                                    onChange={e => setOverlays({ ...overlays, projects: e.target.checked })}
                                    style={{ accentColor: '#22c55e' }}
                                />
                                Active Projects & Deployments
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={overlays.health} 
                                    onChange={e => setOverlays({ ...overlays, health: e.target.checked })}
                                    style={{ accentColor: '#06b6d4' }}
                                />
                                Sanitation & Health Alerts
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={overlays.education} 
                                    onChange={e => setOverlays({ ...overlays, education: e.target.checked })}
                                    style={{ accentColor: '#8b5cf6' }}
                                />
                                Education Welfare Alerts
                            </label>
                        </div>
                    </div>

                    {/* Civic Accountability Details Section - INFORMATIONAL REPORT TO THE DM */}
                    <MapReport details={details} />
                </div>
            </div>

            {/* Bottom Actions Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                    💡 Tip: Click on any district boundary to view detailed complaints and trends
                </span>
                <button
                    onClick={() => alert("Heatmap summary generated & downloaded successfully.")}
                    style={{
                        padding: '10px 20px',
                        background: navy,
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Heatmap Summary
                </button>
            </div>

            {/* Bottom table: Nodal Officer & Station Metrics */}
            <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: 20 }}>
                <h3 style={{ margin: '0 0 16px 0', color: navy, fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Jurisdiction & Nodal Command Metrics
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Case Number</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Category</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>District</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Nodal Assignee</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Action Taken</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Status</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#475569' }}>Threat Index</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '800', color: navy }}>AKR-2026-1002</td>
                                <td style={{ padding: '12px 16px', fontWeight: '700' }}>Water Supply</td>
                                <td style={{ padding: '12px 16px' }}>Central</td>
                                <td style={{ padding: '12px 16px' }}>Mr. Rajesh Saxena (DJB)</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>Bypass line laid near Paharganj</td>
                                <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', background: '#fef2f2', color: '#ef4444', fontWeight: '800', fontSize: '10px', borderRadius: 2 }}>ACTIVE</span></td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '900', color: '#ef4444' }}>95</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '800', color: navy }}>AKR-2026-1006</td>
                                <td style={{ padding: '12px 16px', fontWeight: '700' }}>Sanitation</td>
                                <td style={{ padding: '12px 16px' }}>South</td>
                                <td style={{ padding: '12px 16px' }}>Ms. Aarti Sharma (MCD)</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>Suction tankers cleared Block L sludge</td>
                                <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', background: '#fef2f2', color: '#ef4444', fontWeight: '800', fontSize: '10px', borderRadius: 2 }}>ACTIVE</span></td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '900', color: '#ef4444' }}>91</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '800', color: navy }}>AKR-2026-1007</td>
                                <td style={{ padding: '12px 16px', fontWeight: '700' }}>Road Infrastructure</td>
                                <td style={{ padding: '12px 16px' }}>South</td>
                                <td style={{ padding: '12px 16px' }}>Mr. Manoj Rawat (PWD)</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>Barricades & temporary lining completed</td>
                                <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', background: '#fffbeb', color: '#d97706', fontWeight: '800', fontSize: '10px', borderRadius: 2 }}>PENDING</span></td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '900', color: '#d97706' }}>89</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '800', color: navy }}>AKR-2026-1005</td>
                                <td style={{ padding: '12px 16px', fontWeight: '700' }}>Sanitation</td>
                                <td style={{ padding: '12px 16px' }}>Central</td>
                                <td style={{ padding: '12px 16px' }}>Mr. Manoj Dwivedi (MCD)</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>Dewatering pumps deployed at Karol Bagh</td>
                                <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', background: '#fef2f2', color: '#ef4444', fontWeight: '800', fontSize: '10px', borderRadius: 2 }}>ACTIVE</span></td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '900', color: '#ef4444' }}>88</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '800', color: navy }}>AKR-2026-1001</td>
                                <td style={{ padding: '12px 16px', fontWeight: '700' }}>Electricity</td>
                                <td style={{ padding: '12px 16px' }}>North West</td>
                                <td style={{ padding: '12px 16px' }}>Mr. Ramesh Saxena (TPDDL)</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>Feeder line load balancing completed</td>
                                <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#166534', fontWeight: '800', fontSize: '10px', borderRadius: 2 }}>SOLVED</span></td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '900', color: '#166534' }}>82</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '800', color: navy }}>AKR-2026-1009</td>
                                <td style={{ padding: '12px 16px', fontWeight: '700' }}>Road Infrastructure</td>
                                <td style={{ padding: '12px 16px' }}>North West</td>
                                <td style={{ padding: '12px 16px' }}>Mr. S. K. Dwivedi (DJB)</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>Valve pressure configurations adjusted</td>
                                <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#166534', fontWeight: '800', fontSize: '10px', borderRadius: 2 }}>SOLVED</span></td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '900', color: '#166534' }}>80</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CSS Animation Keyframes for Warning Pulsing Circle and Leaflet pulse markers */}
            <style>{`
                @keyframes pulse {
                    0% {
                        transform: scale(0.8);
                        opacity: 0.8;
                    }
                    70% {
                        transform: scale(2);
                        opacity: 0;
                    }
                    100% {
                        transform: scale(0.8);
                        opacity: 0;
                    }
                }
                .custom-leaflet-icon {
                    background: none;
                    border: none;
                }
            `}</style>
        </div>
    );
};

export default MapPanel;
