import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import 'leaflet/dist/leaflet.css';

// DISTRICT_METRICS dictionary has been migrated to the SQLite Relational Database (RDB)

const COLOR_MAP = {
    "Very High": { fill: "#ef4444", border: "#b91c1c" },
    "High": { fill: "#f97316", border: "#c2410c" },
    "Medium": { fill: "#eab308", border: "#a16207" },
    "Low": { fill: "#22c55e", border: "#15803d" },
    "Very Low": { fill: "#16a34a", border: "#166534" }
};

const getDensityLevel = (activeCount) => {
    if (activeCount >= 12) return "Very High";
    if (activeCount >= 6) return "High";
    if (activeCount >= 3) return "Medium";
    if (activeCount >= 1) return "Low";
    return "Very Low";
};

const getReportForDistrict = (districtMetrics, districtName, category) => {
    const d = districtMetrics[districtName];
    if (!d) return getAggregateReport(districtMetrics, category);
    const lookupKey = category === "All" ? "Total" : category;
    const total = d.complaints[lookupKey] || 0;
    const active = d.active[lookupKey] || 0;
    const solved = d.solved[lookupKey] || 0;

    const categoryReports = {
        "Sanitation": {
            what: `• Sanitation grid overload: ${active} active dumpsite backlogs.\n• Waste clearance rate dropped by 14% this week.`,
            where: `• ${districtName} high-density market zones.\n• Transit collection points.`,
            who: d.details.Sanitation.who,
            action: `• Cleared ${solved} dump locations.\n• Dispatched 2 additional municipal compactors.`,
            pending: `• Procurement approval for 15 heavy-litter bins.`
        },
        "Water": {
            what: `• Distribution supply pressure deficit affecting ${active} local supply nodes.\n• Supply lines pressure dropped below standard 1.4 bar.`,
            where: `• ${districtName} Wards.\n• Low-lying residential clusters.`,
            who: d.details.Water.who,
            action: `• Serviced feeder control valves at zonal station.\n• Cleared and repaired ${solved} leakage points.`,
            pending: `• Zonal permit for pipeline trenching and replacement.`
        },
        "Roads": {
            what: `• Pavement structural degradation: ${active} active pothole sectors.\n• Vehicular transit speed dropped to average 18 km/h.`,
            where: `• ${districtName} primary corridor loops.\n• Arterial highway connector lanes.`,
            who: d.details.Roads.who,
            action: `• Executed cold-mix patchwork overlay across ${solved} locations.`,
            pending: `• Traffic Police NOC for hot-mix resurfacing phases.`
        },
        "Electricity": {
            what: `• Voltage fluctuation anomalies: ${active} transformer sectors reporting overloading during peak hours.`,
            where: `• ${districtName} Walled markets.\n• Inner localized alley circuits.`,
            who: d.details.Electricity.who,
            action: `• Rerouted load circuit to secondary transformer nodes.\n• Anchored and insulated ${solved} overhead sagging lines.`,
            pending: `• Space allocation approval for underground transformer pods.`
        },
        "All": {
            what: `• Total of ${total} registered hotline complaints (${active} active).\n• Sanitation (${d.complaints.Sanitation}) & Water leaks (${d.complaints.Water}) comprise 60% of logs.`,
            where: `• ${districtName} residential wards & central markets.`,
            who: `• ${districtName} Zonal Coordination Command Center`,
            action: `• Resolved ${solved} hotline issues.\n• Dispatched municipal cleaners and water valve crews.`,
            pending: `• Digging permits and road cutting NOCs from PWD.`
        }
    };

    return categoryReports[category] || categoryReports["All"];
};

// Generates an aggregate report for NCT of Delhi overall
const getAggregateReport = (districtMetrics, category) => {
    let total = 0;
    let solved = 0;
    let active = 0;
    let sanitation = 0;
    let water = 0;

    const lookupKey = category === "All" ? "Total" : category;

    Object.values(districtMetrics).forEach(d => {
        total += d.complaints[lookupKey] || 0;
        solved += d.solved[lookupKey] || 0;
        active += d.active[lookupKey] || 0;
        sanitation += d.complaints.Sanitation || 0;
        water += d.complaints.Water || 0;
    });

    const categoryReports = {
        "Sanitation": {
            what: `• Aggregate surge of ${total} sanitation complaints (${active} active).\n• Daily garbage output exceeded processing capacity by 15% in hotspots.`,
            where: `• Central Delhi (15 cases) & South Delhi (8 cases).`,
            who: `• Joint Commissioner of Waste Management & Zonal Directors`,
            action: `• Cleared ${solved} garbage dumps.\n• Activated 4 municipal composters.`,
            pending: `• Site clearance for solid waste treatment facility.`
        },
        "Water": {
            what: `• Total of ${total} water supply complaints registered (${active} active).\n• Supply contamination reports in residential zones.`,
            where: `• Central Delhi (13 cases) & South Delhi (8 cases).`,
            who: `• DJB Chief Engineer & Zonal Superintendent Engineers`,
            action: `• Resolved ${solved} water leakage cases.\n• Deployed auxiliary supply lines.`,
            pending: `• Approvals for major reservoir trunk line replacement.`
        },
        "Roads": {
            what: `• Pavement damage and potholes accumulate ${total} reports (${active} active).\n• Vehicle flow rate dropped by average 14% on affected arterials.`,
            where: `• Central District (11 cases) & South District (6 cases).`,
            who: `• PWD Delhi Chief Engineer & Municipal Corporation Works Division`,
            action: `• Completed pothole filling on ${solved} locations.`,
            pending: `• Financial allocation for secondary road hot-mix overlays.`
        },
        "Electricity": {
            what: `• Substation load anomalies and wire sag reports total ${total} complaints (${active} active).\n• Evening peak load exceeded transformer capacity by 12%.`,
            where: `• Central District Chandni Chowk (7 cases) & South District Neb Sarai (4 cases).`,
            who: `• BSES Yamuna & BSES Rajdhani Distribution Executives`,
            action: `• Rerouted supply lines at ${solved} stations.\n• Bundled sagging overhead cables.`,
            pending: `• Municipal space allocation for transformer pods.`
        },
        "All": {
            what: `• Civic hotline registered ${total} reports (${active} active).\n• Sanitation (${sanitation} complaints) & Water Supply (${water} complaints) form 60% of workload.`,
            where: `• Central Delhi (46 cases) & South Delhi (26 cases).`,
            who: `• Joint Municipal Commissioner & Departmental Nodal Officers`,
            action: `• Resolved ${solved} reports across NCT.\n• Deployed waste clearance & water repair crews.`,
            pending: `• Digging coordination permits and road cutting NOCs from Traffic Police.`
        }
    };

    return categoryReports[category] || categoryReports["All"];
};

const getDistrictFromEmail = (email) => {
    if (!email) return null;
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes("north_west")) return "North West";
    if (lowerEmail.includes("north_east")) return "North East";
    if (lowerEmail.includes("new_delhi")) return "New Delhi";
    if (lowerEmail.includes("south_west")) return "South West";
    if (lowerEmail.includes("south_east")) return "South East";
    if (lowerEmail.includes("north")) return "North";
    if (lowerEmail.includes("shahdara")) return "Shahdara";
    if (lowerEmail.includes("east")) return "East";
    if (lowerEmail.includes("west")) return "West";
    if (lowerEmail.includes("central")) return "Central";
    if (lowerEmail.includes("south")) return "South";
    return null;
};

const MapPanel = () => {
    const { currentUser } = useAuth();
    const [districtMetrics, setDistrictMetrics] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMetrics = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('praja_token');
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

    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const geojsonLayerRef = useRef(null);

    const [geojsonData, setGeojsonData] = useState(null);
    const [activeCategory, setActiveCategory] = useState("All"); // Sanitation, Water, Roads, Electricity, All
    
    const dmDistrict = currentUser?.role === 'dm' ? getDistrictFromEmail(currentUser.email) : null;
    const [selectedDistrict, setSelectedDistrict] = useState(dmDistrict);

    useEffect(() => {
        if (currentUser?.role === 'dm') {
            const dist = getDistrictFromEmail(currentUser.email);
            if (dist) {
                setSelectedDistrict(dist);
            }
        }
    }, [currentUser]);

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

    // Load Local Delhi GeoJSON File
    useEffect(() => {
        fetch('/delhi_districts.geojson')
            .then(res => {
                if (!res.ok) throw new Error("Failed to load Delhi GeoJSON file");
                return res.json();
            })
            .then(data => setGeojsonData(data))
            .catch(err => console.error(err));
    }, []);

    // Initialize Map
    useEffect(() => {
        if (typeof window !== 'undefined' && mapContainerRef.current && !mapRef.current) {
            const L = require('leaflet');
            
            // Strict bounds for Delhi NCT
            const southWest = L.latLng(28.38, 76.80);
            const northEast = L.latLng(28.90, 77.40);
            const bounds = L.latLngBounds(southWest, northEast);

            const map = L.map(mapContainerRef.current, {
                center: [28.6139, 77.2090],
                zoom: 11,
                minZoom: 11,
                maxZoom: 15,
                maxBounds: bounds,
                maxBoundsViscosity: 1.0,
                zoomControl: false,
                scrollWheelZoom: false
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            L.control.zoom({ position: 'topleft' }).addTo(map);
            mapRef.current = map;
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Map Styling & Layer Refresh
    useEffect(() => {
        if (!mapRef.current || !geojsonData) return;
        const L = require('leaflet');
        const map = mapRef.current;

        // Clear existing geojson layer
        if (geojsonLayerRef.current) {
            map.removeLayer(geojsonLayerRef.current);
        }

        // Clear existing custom markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        // Add choropleth layer
        const layer = L.geoJSON(geojsonData, {
            style: (feature) => {
                const dtName = feature.properties.dtname;
                const d = districtMetrics[dtName];
                const lookupKey = activeCategory === "All" ? "Total" : activeCategory;
                const activeCount = d ? d.active[lookupKey] : 0;
                const density = getDensityLevel(activeCount);
                const colors = COLOR_MAP[density] || { fill: "#cbd5e1", border: "#94a3b8" };

                const isSelected = selectedDistrict === dtName;
                const hasSelection = selectedDistrict !== null;

                if (hasSelection) {
                    if (isSelected) {
                        return {
                            color: saffron,
                            weight: 4,
                            fillColor: colors.fill,
                            fillOpacity: 0.85
                        };
                    } else {
                        // Grayed out fully
                        return {
                            color: "#cbd5e1",
                            weight: 1,
                            fillColor: "#f1f5f9",
                            fillOpacity: 0.15
                        };
                    }
                }

                return {
                    color: colors.border,
                    weight: 2,
                    fillColor: colors.fill,
                    fillOpacity: 0.65
                };
            },
            onEachFeature: (feature, layer) => {
                const dtName = feature.properties.dtname;
                const d = districtMetrics[dtName];
                if (!d) return;

                layer.on({
                    click: (e) => {
                        if (currentUser?.role === 'dm' && dtName !== dmDistrict) {
                            return;
                        }
                        setSelectedDistrict(dtName);
                        map.fitBounds(e.target.getBounds());
                    },
                    mouseover: (e) => {
                        const l = e.target;
                        if (currentUser?.role === 'dm' && dtName !== dmDistrict) {
                            return;
                        }
                        if (selectedDistrict === null || selectedDistrict === dtName) {
                            l.setStyle({ fillOpacity: 0.8 });
                        }
                    },
                    mouseout: (e) => {
                        const l = e.target;
                        if (currentUser?.role === 'dm' && dtName !== dmDistrict) {
                            return;
                        }
                        if (selectedDistrict === null) {
                            l.setStyle({ fillOpacity: 0.65 });
                        } else if (selectedDistrict === dtName) {
                            l.setStyle({ fillOpacity: 0.85 });
                        }
                    }
                });

                // Calculate centroid dynamically using Leaflet bounds
                const center = layer.getBounds().getCenter();

                // Draw Projects layer markers (only for selected district, or all if none is selected)
                const shouldShowMarker = selectedDistrict === null || selectedDistrict === dtName;

                if (shouldShowMarker && overlays.projects && d.project && d.project.name !== "N/A") {
                    const color = d.project.status === "Active" ? '#22c55e' : '#3b82f6';
                    const pulseHtml = `
                        <div style="position: relative; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;">
                            <div style="position: absolute; width: 100%; height: 100%; background-color: ${color}; opacity: 0.6; animation: pulse 2s infinite; border-radius: 50%;"></div>
                            <div style="width: 8px; height: 8px; background-color: ${color}; border: 1.5px solid white; border-radius: 50%;"></div>
                        </div>
                    `;
                    const customIcon = L.divIcon({
                        html: pulseHtml,
                        className: 'custom-leaflet-icon',
                        iconSize: [14, 14]
                    });

                    L.marker([center.lat, center.lng + 0.015], { icon: customIcon })
                        .bindPopup(`
                            <div style="font-family: sans-serif; padding: 4px; font-size: 11px;">
                                <h4 style="margin: 0 0 4px 0; color: #04122e; text-transform: uppercase; font-weight: 800;">${d.project.name}</h4>
                                <div style="color: #64748b; margin-bottom: 4px;">Location: ${dtName} District</div>
                                <div style="display: inline-block; padding: 2px 6px; font-weight: 800; font-size: 9px; color: white; background: ${color}; text-transform: uppercase;">
                                    ${d.project.status}
                                </div>
                            </div>
                        `).addTo(map);
                }

                // Draw Health Alerts Layer
                if (shouldShowMarker && overlays.health && d.alerts && d.alerts.health > 0) {
                    const pulseHtml = `
                        <div style="position: relative; width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
                            <div style="position: absolute; width: 100%; height: 100%; background-color: #06b6d4; opacity: 0.5; border-radius: 50%;"></div>
                            <div style="width: 6px; height: 6px; background-color: #06b6d4; border: 1px solid white; border-radius: 50%;"></div>
                        </div>
                    `;
                    const customIcon = L.divIcon({
                        html: pulseHtml,
                        className: 'custom-leaflet-icon',
                        iconSize: [12, 12]
                    });

                    L.marker([center.lat - 0.01, center.lng - 0.01], { icon: customIcon })
                        .bindPopup(`
                            <div style="font-family: sans-serif; padding: 4px; font-size: 11px;">
                                <h4 style="margin: 0 0 4px 0; color: #04122e; text-transform: uppercase; font-weight: 800;">Health Service Alerts</h4>
                                <div style="font-weight: 700; color: #0891b2;">Active Alerts: ${d.alerts.health} Cases</div>
                                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">District: ${dtName}</div>
                            </div>
                        `).addTo(map);
                }

                // Draw Education Alerts Layer
                if (shouldShowMarker && overlays.education && d.alerts && d.alerts.education > 0) {
                    const pulseHtml = `
                        <div style="position: relative; width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
                            <div style="position: absolute; width: 100%; height: 100%; background-color: #8b5cf6; opacity: 0.5; border-radius: 50%;"></div>
                            <div style="width: 6px; height: 6px; background-color: #8b5cf6; border: 1px solid white; border-radius: 50%;"></div>
                        </div>
                    `;
                    const customIcon = L.divIcon({
                        html: pulseHtml,
                        className: 'custom-leaflet-icon',
                        iconSize: [12, 12]
                    });

                    L.marker([center.lat + 0.01, center.lng - 0.01], { icon: customIcon })
                        .bindPopup(`
                            <div style="font-family: sans-serif; padding: 4px; font-size: 11px;">
                                <h4 style="margin: 0 0 4px 0; color: #04122e; text-transform: uppercase; font-weight: 800;">Education Welfare Alerts</h4>
                                <div style="font-weight: 700; color: #7c3aed;">Active Alerts: ${d.alerts.education} Cases</div>
                                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">District: ${dtName}</div>
                            </div>
                        `).addTo(map);
                }
            }
        }).addTo(map);

        geojsonLayerRef.current = layer;

        // Auto-focus on DM's district at load
        if (currentUser?.role === 'dm' && layer) {
            layer.eachLayer((l) => {
                if (l.feature.properties.dtname === dmDistrict) {
                    map.fitBounds(l.getBounds());
                }
            });
        }

        // Reset style highlights on click outside
        map.on('click', (e) => {
            if (currentUser?.role === 'dm') return; // Do not reset selection for DM
            if (e.originalEvent.target.id === mapContainerRef.current.id || e.originalEvent.target.tagName === 'svg') {
                setSelectedDistrict(null);
                map.setView([28.6139, 77.2090], 11);
            }
        });

    }, [geojsonData, activeCategory, selectedDistrict, overlays, districtMetrics]);

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: '"Public Sans", "Inter", sans-serif', background: '#f8fafc', padding: '16px 0' }}>
            
            {/* Header controls & Pills */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 style={{ margin: 0, color: navy, fontSize: '22px', fontWeight: '900', letterSpacing: '-0.03em' }}>
                        Civic Hotline Hotspots
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        Select a category to filter active voter reports and assigned command metrics
                    </p>
                </div>
                
                {/* Category Pills */}
                <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 6 }}>
                    {categories.map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => {
                                setActiveCategory(cat.key);
                                if (currentUser?.role !== 'dm') {
                                    setSelectedDistrict(null); // Reset selection to prevent mismatch
                                }
                            }}
                            style={{
                                border: 'none',
                                outline: 'none',
                                padding: '8px 16px',
                                borderRadius: 4,
                                fontSize: '12px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                background: activeCategory === cat.key ? navy : 'transparent',
                                color: activeCategory === cat.key ? '#ffffff' : '#475569'
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

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
                <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: navy, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                Interactive Boundary Mapper
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>Click on district boundary polygons to view accountability logs</span>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 8px', background: '#e2e8f0', color: '#475569', borderRadius: 2 }}>DELHI_NCT</span>
                    </div>

                    <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 380 }}>
                        {/* Leaflet map container */}
                        <div id="leaflet-map" ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 380 }} />

                        {/* Floating Map Legend (Bottom-Left) */}
                        <div style={{
                            position: 'absolute',
                            bottom: 20,
                            left: 20,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            padding: '12px 16px',
                            zIndex: 1000,
                            borderRadius: 4,
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                        }}>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: navy, letterSpacing: '0.08em' }}>DENSITY</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, background: '#ef4444', borderRadius: 2 }} />
                                    Very High
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, background: '#f97316', borderRadius: 2 }} />
                                    High
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, background: '#eab308', borderRadius: 2 }} />
                                    Medium
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 2 }} />
                                    Low
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, background: '#16a34a', borderRadius: 2 }} />
                                    Very Low
                                </div>
                            </div>
                        </div>

                        {/* Updated overlay label (Bottom-Right) */}
                        <div style={{
                            position: 'absolute',
                            bottom: 20,
                            right: 20,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            padding: '8px 12px',
                            zIndex: 1000,
                            borderRadius: 4,
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#475569'
                        }}>
                            Last Updated Today, 08:30 AM
                        </div>
                    </div>
                </div>

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
                    <div className="card" style={{ background: navyLight, color: '#ffffff', border: '1px solid ' + navy, borderRadius: 4, padding: 20 }}>
                        <h3 style={{ margin: '0 0 16px 0', color: saffron, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
                            Informational Report to the DM
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '12px' }}>
                            <div>
                                <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    INCIDENT SUMMARY
                                </span>
                                <span style={{ display: 'block', marginTop: 3, fontWeight: '600', color: '#f1f5f9', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                                    {details.what}
                                </span>
                            </div>

                            <div>
                                <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    AFFECTED LOCATIONS
                                </span>
                                <span style={{ display: 'block', marginTop: 3, fontWeight: '600', color: '#f1f5f9', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                                    {details.where}
                                </span>
                            </div>

                            <div>
                                <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    ACCOUNTABLE OFFICER
                                </span>
                                <span style={{ display: 'block', marginTop: 3, fontWeight: '800', color: '#ffffff', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                                    {details.who}
                                </span>
                            </div>

                            <div>
                                <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    COMPLETED ACTIONS
                                </span>
                                <span style={{ display: 'block', marginTop: 3, fontWeight: '600', color: '#f1f5f9', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                                    {details.action}
                                </span>
                            </div>

                            <div>
                                <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    PENDING BLOCKERS
                                </span>
                                <span style={{ display: 'block', marginTop: 3, fontWeight: '600', color: '#f1f5f9', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                                    {details.pending}
                                </span>
                            </div>
                        </div>
                    </div>
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
