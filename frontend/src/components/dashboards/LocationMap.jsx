"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const BOUNDARY_RADII = {
  state: 25000,
  district: 12000,
  constituency: 4000,
  mandal: 1500,
  booth: 500,
};

const ZOOM_LEVELS = {
  state: 10,
  district: 11,
  constituency: 13,
  mandal: 14,
  booth: 16,
};

const navy = '#04122e';
const saffron = '#D4A843';

function norm(s) {
  return (s || '').toLowerCase().replace(/[\s\-_]/g, '');
}

function matchDistrict(geoName, dbName) {
  const gn = norm(geoName);
  const dn = norm(dbName);
  if (gn === dn) return true;
  if (dn.endsWith('delhi') && gn === dn.slice(0, -5)) return true;
  return false;
}

function computeCentroid(feature) {
  const coords = feature.geometry.coordinates;
  let ring = coords[0];
  if (feature.geometry.type === 'MultiPolygon') {
    ring = coords.reduce((a, b) => a[0].length > b[0].length ? a : b)[0];
  }
  let sumX = 0, sumY = 0, count = 0;
  for (const [x, y] of ring) {
    sumX += x;
    sumY += y;
    count++;
  }
  return { lat: sumY / count, lng: sumX / count };
}

function findMatchingFeature(geoData, level, code, locationName) {
  if (!geoData) return null;
  if (level === 'state') {
    const lats = [], lngs = [];
    for (const f of geoData.features) {
      const c = computeCentroid(f);
      lats.push(c.lat); lngs.push(c.lng);
    }
    if (lats.length) {
      const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      return { lat: avgLat, lng: avgLng };
    }
    return null;
  }
  let match = null;
  if (level === 'district') {
    match = geoData.features.find(f => matchDistrict(f.properties.dtname, locationName));
  } else if (level === 'constituency') {
    match = geoData.features.find(f => matchConstituency(f.properties.ac_name, locationName));
  } else if (level === 'mandal') {
    match = geoData.features.find(f => f.properties.mandal_code === code);
  }
  if (!match) return null;
  return computeCentroid(match);
}

export default function LocationMap({ level, code, name }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geoLayerRef = useRef(null);
  const markerRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function geoFileFor(level) {
    if (level === 'state' || level === 'district') return '/delhi_districts.geojson';
    if (level === 'constituency') return '/delhi_constituencies.geojson';
    if (level === 'mandal') return '/delhi_mandals.geojson';
    return null;
  }

  // Fetch location data and GeoJSON
  useEffect(() => {
    if (!level || !code) {
      setLoading(false);
      setError('No hierarchy data available');
      return;
    }

    setLoading(true);
    setError(null);

    const geoFile = geoFileFor(level);
    const fetches = [
      fetch(`/api/v1/admin/hierarchy/location?level=${encodeURIComponent(level)}&code=${encodeURIComponent(code)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    ];
    if (geoFile) {
      fetches.push(
        fetch(geoFile)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      );
    } else {
      fetches.push(Promise.resolve(null));
    }

    Promise.all(fetches)
      .then(([locData, geoData]) => {
        if (locData.latitude && locData.longitude) {
          setLocation(locData);
        } else {
          const centroid = findMatchingFeature(geoData, level, code, locData.name);
          if (centroid) {
            setLocation({ ...locData, latitude: centroid.lat, longitude: centroid.lng });
          } else {
            setError('No location data for this area');
          }
        }
        setGeoData(geoData);
        setLoading(false);
      })
      .catch(err => {
        setError('Could not load map location');
        setLoading(false);
      });
  }, [level, code]);

  // Init map once
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || !location) return;
    if (mapRef.current) return;

    const L = require('leaflet');

    const zoom = ZOOM_LEVELS[level] || 11;
    const map = L.map(mapContainerRef.current, {
      center: [location.latitude, location.longitude],
      zoom,
      zoomControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [location, level]);

  function matchConstituency(geoName, targetName) {
    return norm(geoName) === norm(targetName);
  }

  // Draw/update boundaries when location, level, or GeoJSON changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    const L = require('leaflet');

    // Clear previous layers
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    const addCenterMarker = () => {
      const marker = L.circleMarker([location.latitude, location.longitude], {
        radius: 6,
        color: saffron,
        weight: 3,
        fillColor: '#fff',
        fillOpacity: 1,
      }).addTo(map);
      marker.bindTooltip(`<strong>${location.name}</strong><br/>${level.toUpperCase()}`, { direction: 'top' });
      markerRef.current = marker;
    };

    let layer = null;

    if (level === 'state') {
      if (geoData) {
        layer = L.geoJSON(geoData, {
          style: {
            color: navy,
            weight: 1.5,
            fillColor: '#04122e',
            fillOpacity: 0.06,
          },
          onEachFeature: (feature, lyr) => {
            lyr.bindTooltip(`<strong>${feature.properties.dtname}</strong>`, { sticky: true });
          },
        }).addTo(map);
        map.fitBounds(layer.getBounds(), { padding: [40, 40] });
      } else {
        layer = L.circle([location.latitude, location.longitude], {
          radius: BOUNDARY_RADII.state,
          color: saffron,
          weight: 2,
          fillColor: '#D4A843',
          fillOpacity: 0.15,
        }).addTo(map);
      }
    } else if (level === 'district') {
      const districtName = location.name;
      if (geoData) {
        let found = false;
        layer = L.geoJSON(geoData, {
          style: (feature) => {
            const isMatch = matchDistrict(feature.properties.dtname, districtName);
            return {
              color: isMatch ? saffron : '#cbd5e1',
              weight: isMatch ? 3 : 0.5,
              fillColor: isMatch ? '#D4A843' : '#cbd5e1',
              fillOpacity: isMatch ? 0.55 : 0.06,
            };
          },
          onEachFeature: (feature, lyr) => {
            const isMatch = matchDistrict(feature.properties.dtname, districtName);
            if (isMatch) {
              lyr.bindTooltip(`<strong>${feature.properties.dtname} District</strong>`, { sticky: true });
              if (!found) {
                map.fitBounds(lyr.getBounds(), { padding: [40, 40] });
                found = true;
              }
            }
          },
        }).addTo(map);
      } else {
        const circle = L.circle([location.latitude, location.longitude], {
          radius: BOUNDARY_RADII.district,
          color: saffron,
          weight: 3,
          fillColor: '#D4A843',
          fillOpacity: 0.3,
        }).addTo(map);
        circle.bindTooltip(`<strong>${location.name}</strong><br/>DISTRICT`, { sticky: true });
        map.fitBounds(circle.getBounds(), { padding: [50, 50] });
      }
    } else if (level === 'constituency') {
      const targetName = location.name;
      if (geoData) {
        let found = false;
        layer = L.geoJSON(geoData, {
          style: (feature) => {
            const isMatch = matchConstituency(feature.properties.ac_name, targetName);
            return {
              color: isMatch ? saffron : '#cbd5e1',
              weight: isMatch ? 3 : 1,
              fillColor: isMatch ? '#D4A843' : '#cbd5e1',
              fillOpacity: isMatch ? 0.55 : 0.06,
            };
          },
          onEachFeature: (feature, lyr) => {
            const isMatch = matchConstituency(feature.properties.ac_name, targetName);
            if (isMatch) {
              lyr.bindTooltip(`<strong>${feature.properties.ac_name}</strong><br/>CONSTITUENCY`, { sticky: true });
              if (!found) {
                map.fitBounds(lyr.getBounds(), { padding: [40, 40] });
                found = true;
              }
            }
          },
        }).addTo(map);
        if (!found) {
          const circle = L.circle([location.latitude, location.longitude], {
            radius: BOUNDARY_RADII.constituency,
            color: saffron,
            weight: 3,
            fillColor: '#D4A843',
            fillOpacity: 0.3,
          }).addTo(map);
          circle.bindTooltip(`<strong>${location.name}</strong><br/>CONSTITUENCY`, { sticky: true });
          map.fitBounds(circle.getBounds(), { padding: [50, 50] });
          layer = circle;
        }
      } else {
        const circle = L.circle([location.latitude, location.longitude], {
          radius: BOUNDARY_RADII.constituency,
          color: saffron,
          weight: 3,
          fillColor: '#D4A843',
          fillOpacity: 0.3,
        }).addTo(map);
        circle.bindTooltip(`<strong>${location.name}</strong><br/>CONSTITUENCY`, { sticky: true });
        map.fitBounds(circle.getBounds(), { padding: [50, 50] });
        layer = circle;
      }
    } else if (level === 'mandal') {
      const targetCode = code;
      if (geoData) {
        let found = false;
        layer = L.geoJSON(geoData, {
          style: (feature) => {
            const isMatch = feature.properties.mandal_code === targetCode;
            return {
              color: isMatch ? saffron : '#cbd5e1',
              weight: isMatch ? 4 : 1,
              fillColor: isMatch ? '#D4A843' : '#cbd5e1',
              fillOpacity: isMatch ? 0.6 : 0.06,
            };
          },
          onEachFeature: (feature, lyr) => {
            const isMatch = feature.properties.mandal_code === targetCode;
            if (isMatch) {
              lyr.bindTooltip(`<strong>${feature.properties.mandal_name}</strong><br/>MANDAL`, { sticky: true });
              if (!found) {
                map.fitBounds(lyr.getBounds(), { padding: [40, 40] });
                found = true;
              }
            }
          },
        }).addTo(map);
        if (!found) {
          const circle = L.circle([location.latitude, location.longitude], {
            radius: BOUNDARY_RADII.mandal,
            color: saffron,
            weight: 3,
            fillColor: '#D4A843',
            fillOpacity: 0.3,
          }).addTo(map);
          circle.bindTooltip(`<strong>${location.name}</strong><br/>MANDAL`, { sticky: true });
          map.fitBounds(circle.getBounds(), { padding: [50, 50] });
          layer = circle;
        }
      } else {
        const circle = L.circle([location.latitude, location.longitude], {
          radius: BOUNDARY_RADII.mandal,
          color: saffron,
          weight: 3,
          fillColor: '#D4A843',
          fillOpacity: 0.3,
        }).addTo(map);
        circle.bindTooltip(`<strong>${location.name}</strong><br/>MANDAL`, { sticky: true });
        map.fitBounds(circle.getBounds(), { padding: [50, 50] });
        layer = circle;
      }
    }

    geoLayerRef.current = layer;
    addCenterMarker();
  }, [location, level, geoData, code]);

  return (
    <div className="fade-in" style={{ color: 'var(--navy)' }}>
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Geographic Location</div>
          <div className="dash-page-subtitle">{name || `${level} View`}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 900, background: '#f8fafc', color: '#64748b', padding: '6px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>LEVEL: {level?.toUpperCase()}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginTop: 24 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 600, position: 'relative', background: '#e5e7eb' }}>
          {loading && (
            <div style={{ width: '100%', height: '100%', minHeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Loading map...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div style={{ width: '100%', height: '100%', minHeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
              <div style={{ textAlign: 'center', zIndex: 5 }}>
                <MapIcon size={64} color="var(--blue-400)" style={{ opacity: 0.3 }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginTop: 12 }}>{error}</p>
              </div>
            </div>
          )}

          <div ref={mapContainerRef} style={{ width: '100%', height: 600, display: location && !loading ? 'block' : 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>LOCATION INFO</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Name</span>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)', marginTop: 2 }}>{name || location?.name || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Level</span>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)', marginTop: 2 }}>{level?.toUpperCase() || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Code</span>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)', marginTop: 2 }}>{code || '-'}</div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Boundary</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, border: `2.5px solid ${saffron}`, background: '#D4A843', opacity: 0.5, display: 'inline-block' }} />
                  {level === 'state' ? 'Delhi NCT boundary' :
                   level === 'district' ? 'District polygon' :
                   level === 'constituency' ? 'Assembly constituency polygon' :
                   level === 'mandal' ? 'Mandal boundary polygon' : 'Area'}
                </div>
              </div>
            </div>
          </div>

          <div className="dash-section-dark" style={{ padding: 20, flex: 1, borderRadius: 12 }}>
            <h3 style={{ color: 'var(--amber-500)', fontSize: 12, fontWeight: 900, letterSpacing: '0.05em', marginBottom: 16 }}>COORDINATE REFERENCE</h3>
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              <Navigation size={24} color="var(--amber-500)" />
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue-100)', lineHeight: 1.6 }}>
                {location
                  ? `Centered on ${location.name} (${level?.toUpperCase()}) at ${location.latitude?.toFixed(4)}°N, ${location.longitude?.toFixed(4)}°E`
                  : 'Location coordinates not available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
