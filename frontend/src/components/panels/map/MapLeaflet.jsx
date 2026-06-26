import React, { useEffect, useRef } from 'react';
import { COLOR_MAP, getDensityLevel } from './mapUtils';

const MapLeaflet = ({
    geojsonData,
    activeCategory,
    selectedDistrict,
    setSelectedDistrict,
    overlays,
    districtMetrics
}) => {
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const geojsonLayerRef = useRef(null);

    const navy = "#04122e";
    const saffron = "#D4A843";

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
                        setSelectedDistrict(dtName);
                        map.fitBounds(e.target.getBounds());
                    },
                    mouseover: (e) => {
                        const l = e.target;
                        if (selectedDistrict === null || selectedDistrict === dtName) {
                            l.setStyle({ fillOpacity: 0.8 });
                        }
                    },
                    mouseout: (e) => {
                        const l = e.target;
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

        // Reset style highlights on click outside
        map.on('click', (e) => {
            if (e.originalEvent.target.id === mapContainerRef.current.id || e.originalEvent.target.tagName === 'svg') {
                setSelectedDistrict(null);
                map.setView([28.6139, 77.2090], 11);
            }
        });

    }, [geojsonData, activeCategory, selectedDistrict, overlays, districtMetrics, setSelectedDistrict]);

    return (
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
    );
};

export default MapLeaflet;
