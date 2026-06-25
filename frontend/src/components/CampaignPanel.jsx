'use client';
/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import 'leaflet/dist/leaflet.css';
import {
  DELHI_DISTRICTS,
  CONSTITUENCIES_OLD,
  CONSTITUENCIES_NEW,
  DISTRICT_CENTERS,
  normDistrict,
  normConstit,
  getDistrictFromEmail,
} from '../constants/constituencies';

/* ─── Constants imported from ../constants/constituencies ──── */

const pointInPolygon = (x, y, poly) => {
  let inside = false;
  const n = poly.length;
  if (n === 0) return false;
  let p1x = poly[0][0], p1y = poly[0][1];
  for (let i = 1; i <= n; i++) {
    const p2x = poly[i % n][0], p2y = poly[i % n][1];
    if (y > Math.min(p1y, p2y)) {
      if (y <= Math.max(p1y, p2y)) {
        if (x <= Math.max(p1x, p2x)) {
          if (p1y !== p2y) {
            const xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x;
            if (p1x === p2x || x <= xints) {
              inside = !inside;
            }
          }
        }
      }
    }
    p1x = p2x; p1y = p2y;
  }
  return inside;
};

const isPointInGeometry = (lng, lat, geom) => {
  if (!geom) return false;
  const coords = geom.coordinates;
  if (geom.type === 'Polygon') {
    return pointInPolygon(lng, lat, coords[0]);
  } else if (geom.type === 'MultiPolygon') {
    return coords.some(poly => pointInPolygon(lng, lat, poly[0]));
  }
  return false;
};




// same navy/saffron palette as MapPanel
const navy    = '#04122e';
const saffron = '#D4A843';



/* ─── API helpers ──────────────────────────────────────────── */
const API = '/api/v1';

const fetchVolunteers = async (district, constituency, mode) => {
  try {
    const params = new URLSearchParams({ mode: mode || 'new' });
    if (district) params.append('district', district);
    if (constituency) params.append('constituency', constituency);
    const r = await fetch(`${API}/campaign/volunteers?${params}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.volunteers;
  } catch { return null; }
};

const fetchCoverage = async (district, mode) => {
  try {
    const params = new URLSearchParams({ mode: mode || 'new' });
    if (district) params.append('district', district);
    const r = await fetch(`${API}/campaign/coverage?${params}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.coverage;   // array of {district,constituency,covered,...}
  } catch { return null; }
};

const fetchSummary = async (mode) => {
  try {
    const r = await fetch(`${API}/campaign/summary?mode=${mode || 'new'}`);
    if (!r.ok) return null;
    return (await r.json()).summary;
  } catch { return null; }
};

const apiMarkCovered = async (volunteerId, mode) => {
  try {
    await fetch(`${API}/campaign/volunteers/${volunteerId}/mark-covered?mode=${mode || 'new'}`, { method: 'PATCH' });
  } catch {}
};

const apiMarkAllCovered = async (district, coveredBy, mode) => {
  try {
    await fetch(`${API}/campaign/coverage/mark-all/${encodeURIComponent(district)}?covered_by=${encodeURIComponent(coveredBy || 'Admin')}&mode=${mode || 'new'}`, { method: 'POST' });
  } catch {}
};

const apiUpdateLocation = async (volunteerId, lat, lng) => {
  try {
    await fetch(`${API}/campaign/volunteers/${volunteerId}/location?lat=${lat}&lng=${lng}`, { method: 'PATCH' });
  } catch {}
};

/* ─── Coverage lookup helpers ─────────────────────────────── */
const buildCovMap = (coverageArr) => {
  const m = {};
  (coverageArr || []).forEach(c => {
    if (!m[c.district]) m[c.district] = {};
    m[c.district][c.constituency] = c.covered;
  });
  return m;
};

const normUserGeo = (s) => (s || '').toLowerCase().replace(/^c-/, '').replace(/[\s\-\._]/g, '');

const getDisplayDistrict = (districtId) => {
  if (!districtId) return null;
  return DELHI_DISTRICTS.find(d => normUserGeo(d) === normUserGeo(districtId)) || null;
};

const getDisplayConstituency = (districtName, constituencyId) => {
  if (!districtName || !constituencyId) return '';
  const list = [...(CONSTITUENCIES_NEW[districtName] || []), ...(CONSTITUENCIES_OLD[districtName] || [])];
  return list.find(c => normUserGeo(c) === normUserGeo(constituencyId)) || '';
};

/* ─── Main Component ───────────────────────────────────────── */
const CampaignPanel = () => {
  const { currentUser } = useAuth();

  // Map refs — identical pattern to MapPanel
  const mapRef           = useRef(null);
  const mapContainerRef  = useRef(null);
  const geojsonLayerRef  = useRef(null);
  const constitLayerRef  = useRef(null);
  const boundaryLayerRef = useRef(null);
  const wardLayerRef      = useRef(null);
  const volLayerRef      = useRef([]);
  const heatLayerRef     = useRef(null);

  const dmDistrict = (currentUser?.role || '').toLowerCase() === 'dm'
    ? (currentUser?.district_id ? getDisplayDistrict(currentUser.district_id) : getDistrictFromEmail(currentUser.email))
    : null;

  const userRole = (currentUser?.role || '').toUpperCase();
  const lockDistrict = (userRole === 'DISTRICT_ADMIN' || userRole === 'CONSTITUENCY_MGR' || userRole === 'MANDAL_MGR' || userRole === 'DM') && currentUser?.district_id
    ? getDisplayDistrict(currentUser.district_id)
    : null;

  const lockConstituency = (userRole === 'CONSTITUENCY_MGR' || userRole === 'MANDAL_MGR') && currentUser?.constituency_id && lockDistrict
    ? getDisplayConstituency(lockDistrict, currentUser.constituency_id)
    : null;

  const lockWard = userRole === 'MANDAL_MGR' && currentUser?.mandal_id
    ? currentUser.mandal_id.replace(/^w-/i, '')
    : null;

  const [mode,               setMode]               = useState('abs'); // 'abs' only
  const [geojsonData,        setGeojsonData]        = useState(null);
  const [constitsData,       setConstitsData]       = useState(null);
  const [boundaryData,       setBoundaryData]       = useState(null);
  const [wardsData,          setWardsData]          = useState(null);
  const [wardToConstit,      setWardToConstit]      = useState([]);
  const [selectedDistrict,   setSelectedDistrict]   = useState(null);
  const [selectedConstit,    setSelectedConstit]    = useState('');
  const [selectedWard,       setSelectedWard]       = useState('');

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!currentUser || initializedRef.current) return;

    const uRole = (currentUser.role || '').toUpperCase();
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const dParam = params ? params.get('district') : null;
    const cParam = params ? params.get('constituency') : null;
    const wParam = params ? params.get('ward') : null;

    let defaultDist = dParam || null;
    let defaultConst = cParam || '';
    let defaultWard = wParam || '';

    if (!dParam && !cParam) {
      if ((uRole === 'DISTRICT_ADMIN' || uRole === 'CONSTITUENCY_MGR' || uRole === 'MANDAL_MGR') && currentUser.district_id) {
        defaultDist = getDisplayDistrict(currentUser.district_id);
      }
      if ((uRole === 'CONSTITUENCY_MGR' || uRole === 'MANDAL_MGR') && currentUser.constituency_id && defaultDist) {
        defaultConst = getDisplayConstituency(defaultDist, currentUser.constituency_id);
      }
      if (uRole === 'MANDAL_MGR' && currentUser.mandal_id) {
        defaultWard = currentUser.mandal_id.replace(/^w-/i, '');
      }
    }

    if (defaultDist) setSelectedDistrict(defaultDist);
    if (defaultConst) setSelectedConstit(defaultConst);
    if (defaultWard) setSelectedWard(defaultWard);

    initializedRef.current = true;
  }, [currentUser]);
  const [volunteers,         setVolunteers]         = useState([]);
  const [selectedVol,        setSelectedVol]        = useState(null);
  const [coverageMap,        setCoverageMap]        = useState({});  // {district: {constit: bool}}
  const [summary,            setSummary]            = useState({});  // from /campaign/summary
  const [simulateLive,       setSimulateLive]       = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [activeTab,          setActiveTab]          = useState('volunteers'); // 'volunteers' | 'coverage'
  const [newTaskText,        setNewTaskText]        = useState('');
  const [newTaskStatus,      setNewTaskStatus]      = useState('unassigned');

  const [searchQuery,        setSearchQuery]        = useState('');
  const [searchResults,      setSearchResults]      = useState([]);
  const [searching,          setSearching]          = useState(false);
  const [pinModeActive,      setPinModeActive]      = useState(false);
  const [newVolPin,          setNewVolPin]          = useState(null);

  const [newVolName,         setNewVolName]         = useState('');
  const [newVolPhone,        setNewVolPhone]        = useState('');
  const [newVolAreaName,     setNewVolAreaName]     = useState('');
  const [newVolTask,         setNewVolTask]         = useState('');
  const [newVolStatus,       setNewVolStatus]       = useState('unassigned');

  const CONSTITUENCIES = mode === 'new' || mode === 'blended' || mode === 'abs' ? CONSTITUENCIES_NEW : CONSTITUENCIES_OLD;

  const pinModeActiveRef = useRef(pinModeActive);
  useEffect(() => {
    pinModeActiveRef.current = pinModeActive;
  }, [pinModeActive]);

  const findBoundariesForCoords = useCallback((lat, lng) => {
    let resolvedDistrict = '';
    let resolvedConstituency = '';
    let resolvedWard = '';

    if (geojsonData) {
      const found = geojsonData.features.find(f => isPointInGeometry(lng, lat, f.geometry));
      if (found) resolvedDistrict = found.properties.dtname;
    }

    if (constitsData && resolvedDistrict) {
      const found = constitsData.features.find(f => 
        normDistrict(f.properties.district || '') === normDistrict(resolvedDistrict) &&
        isPointInGeometry(lng, lat, f.geometry)
      );
      if (found) {
        const rawName = found.properties.AC_NAME || '';
        const districtConstits = CONSTITUENCIES[resolvedDistrict] || [];
        const matchedConstit = districtConstits.find(c => normConstit(c) === normConstit(rawName));
        resolvedConstituency = matchedConstit || rawName.replace(/\s*\(sc\)|\s*\(st\)/gi, '').trim();
      }
    }

    if (wardsData) {
      const found = wardsData.features.find(f => isPointInGeometry(lng, lat, f.geometry));
      if (found) resolvedWard = found.properties.Ward_No;
    }

    return {
      district: resolvedDistrict,
      constituency: resolvedConstituency,
      ward: resolvedWard
    };
  }, [geojsonData, constitsData, wardsData, CONSTITUENCIES]);

  const handleSearchLocality = async (q) => {
    if (!q) return;
    setSearching(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ", Delhi")}&viewbox=76.80,28.38,77.40,28.90&bounded=1`);
      if (r.ok) {
        const data = await r.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (res) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 14, { animate: true });
    }
    const info = findBoundariesForCoords(lat, lng);
    setNewVolPin({
      lat,
      lng,
      address: res.display_name,
      ...info
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleCreateVolunteer = async (customData = null) => {
    const isFromCustom = customData !== null;
    const name = isFromCustom ? customData.name : newVolName;
    const phone = isFromCustom ? customData.phone : newVolPhone;

    if (!name || !phone) {
      alert("Name and phone are required!");
      return;
    }
    const body = isFromCustom ? { ...customData, status: 'inactive' } : {
      name: newVolName,
      phone: newVolPhone,
      district: newVolPin.district || selectedDistrict || 'Central',
      constituency: newVolPin.constituency || selectedConstit || '',
      assigned_area: newVolAreaName || newVolPin.address || 'Custom Location',
      assigned_task: newVolTask,
      task_status: newVolStatus,
      lat: newVolPin.lat,
      lng: newVolPin.lng,
      status: 'inactive'
    };
    try {
      const r = await fetch(`${API}/campaign/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (r.ok) {
        const saved = await r.json();
        setVolunteers(prev => [saved, ...prev]);
        setNewVolPin(null);
        setNewVolName('');
        setNewVolPhone('');
        setNewVolAreaName('');
        setNewVolTask('');
        setNewVolStatus('unassigned');
      } else {
        alert("Failed to save volunteer. Please check inputs.");
      }
    } catch (err) {
      console.error("Failed to save volunteer:", err);
    }
  };

  /* ── Load GeoJSON ─────────────────────────────────────────── */
  useEffect(() => {
    const geojsonMode = mode === 'blended' ? 'new' : mode;
    fetch(`/delhi_districts_${geojsonMode}.geojson`)
      .then(r => r.json())
      .then(setGeojsonData)
      .catch(console.error);

    fetch(`/delhi_constituencies_${geojsonMode}.geojson`)
      .then(r => r.json())
      .then(setConstitsData)
      .catch(console.error);

    fetch('/delhi_boundary.geojson')
      .then(r => r.json())
      .then(setBoundaryData)
      .catch(console.error);

    fetch('/delhi_wards.geojson')
      .then(r => r.json())
      .then(setWardsData)
      .catch(console.error);

    fetch('/ward_to_constituency.json')
      .then(r => r.json())
      .then(setWardToConstit)
      .catch(console.error);
  }, [mode]);

  /* ── URL History Syncing ─────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const dParam = params.get('district');
    const cParam = params.get('constituency');
    if (dParam) setSelectedDistrict(dParam);
    if (cParam) setSelectedConstit(cParam || '');

    const handlePopState = (event) => {
      const state = event.state || {};
      setSelectedDistrict(state.district || null);
      setSelectedConstit(state.constituency || '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const curDist = params.get('district') || null;
    const curConst = params.get('constituency') || '';

    if (selectedDistrict !== curDist || selectedConstit !== curConst) {
      const newParams = new URLSearchParams(window.location.search);
      if (selectedDistrict) {
        newParams.set('district', selectedDistrict);
      } else {
        newParams.delete('district');
      }
      if (selectedConstit) {
        newParams.set('constituency', selectedConstit);
      } else {
        newParams.delete('constituency');
      }
      const search = newParams.toString();
      const url = search ? `?${search}` : window.location.pathname;
      window.history.pushState({ district: selectedDistrict, constituency: selectedConstit }, '', url);
    }
  }, [selectedDistrict, selectedConstit]);

  /* ── Load coverage + summary ─────────────────────────────── */
  const loadCoverage = useCallback(async () => {
    const apiMode = mode === 'blended' ? 'new' : mode;
    const [covArr, sumObj] = await Promise.all([fetchCoverage(null, apiMode), fetchSummary(apiMode)]);
    if (covArr)  setCoverageMap(buildCovMap(covArr));
    if (sumObj)  setSummary(sumObj);
  }, [mode]);

  useEffect(() => { loadCoverage(); }, [loadCoverage]);

  /* ── Load volunteers on district/constit change ──────────── */
  const loadVolunteers = useCallback(async (district, constit) => {
    setLoading(true);
    const apiMode = mode === 'blended' ? 'new' : mode;

    let fetchDist = district;
    let fetchConst = constit;
    if (lockDistrict) fetchDist = lockDistrict;
    if (lockConstituency) fetchConst = lockConstituency;

    const dbVols = await fetchVolunteers(fetchDist, fetchConst, apiMode);
    setVolunteers(dbVols || []);
    setLoading(false);
  }, [mode, lockDistrict, lockConstituency]);

  useEffect(() => {
    loadVolunteers(selectedDistrict, selectedConstit);
    setSelectedVol(null);
  }, [selectedDistrict, selectedConstit, loadVolunteers]);

  /* ── Live simulation ─────────────────────────────────────── */
  useEffect(() => {
    if (!simulateLive) return;
    const iv = setInterval(() => {
      setVolunteers(prev => prev.map(v => {
        const updated = {
          ...v,
          lat: v.lat + (Math.random() - 0.5) * 0.002,
          lng: v.lng + (Math.random() - 0.5) * 0.002,
          last_location_update: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
        apiUpdateLocation(updated.id, updated.lat, updated.lng);
        return updated;
      }));
    }, 4000);
    return () => clearInterval(iv);
  }, [simulateLive]);

  /* ── Init map (MapPanel-identical) ───────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;
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
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);
    mapRef.current = map;
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  /* ── GeoJSON layer (re-render on selection/coverage change) ─ */
  useEffect(() => {
    if (!mapRef.current || !geojsonData) return;
    const L = require('leaflet');
    const map = mapRef.current;

    // Clear existing layers
    if (geojsonLayerRef.current) map.removeLayer(geojsonLayerRef.current);
    if (constitLayerRef.current) map.removeLayer(constitLayerRef.current);
    constitLayerRef.current = null;
    if (wardLayerRef.current) map.removeLayer(wardLayerRef.current);
    wardLayerRef.current = null;

    // 1. Draw background district boundaries
    const layer = L.geoJSON(geojsonData, {
      style: (feature) => {
        const dt = feature.properties.dtname;
        const isSelected = dt === selectedDistrict;
        const hasSel = selectedDistrict !== null;

        if (mode === 'blended') {
          if (hasSel) {
            return isSelected
              ? { color: '#1e40af', weight: 2.5, fillColor: 'transparent', fillOpacity: 0 }
              : { color: '#cbd5e1', weight: 1, fillColor: '#f1f5f9', fillOpacity: 0.02 };
          }
          return { color: '#1e40af', weight: 1.5, fillColor: 'transparent', fillOpacity: 0 };
        }

        // Coverage colour
        const dcov = coverageMap[dt] || {};
        const dcNames = CONSTITUENCIES[dt] || [];
        const ratio = dcNames.length ? dcNames.filter(c => dcov[c]).length / dcNames.length : 0;
        const covFill = ratio >= 1 ? '#22c55e' : ratio >= 0.6 ? '#84cc16' : ratio >= 0.3 ? '#f59e0b' : '#ef4444';

        if (hasSel) {
          // Grayed out or faint outline
          return isSelected
            ? { color: '#1e40af', weight: 2.5, fillColor: 'transparent', fillOpacity: 0 }
            : { color: '#cbd5e1', weight: 1, fillColor: '#f1f5f9', fillOpacity: 0.05 };
        }
        return { color: '#1e40af', weight: 1.5, fillColor: covFill, fillOpacity: 0.65 };
      },
      onEachFeature: (feature, lyr) => {
        const dt = feature.properties.dtname;
        const dcov = coverageMap[dt] || {};
        const dcNames = CONSTITUENCIES[dt] || [];
        const covered = dcNames.filter(c => dcov[c]).length;

        // Tooltip only active if no district is selected and not in blended mode
        if (!selectedDistrict && mode !== 'blended') {
          lyr.bindTooltip(
            `<strong>${dt} Delhi</strong><br/>Coverage: ${covered}/${dcNames.length} constituencies`,
            { sticky: true }
          );
        }

        lyr.on({
          click: (e) => {
            L.DomEvent.stopPropagation(e);
            if (pinModeActiveRef.current) {
              const { lat, lng } = e.latlng;
              const info = findBoundariesForCoords(lat, lng);
              setNewVolPin({ lat, lng, address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, ...info });
              setPinModeActive(false);
              return;
            }
            if (lockDistrict && lockDistrict !== dt) return;
            setSelectedDistrict(dt);
            setSelectedConstit('');
            setSelectedWard('');
          },
          mouseover: (e) => {
            if (selectedDistrict || mode === 'blended') return;
            e.target.setStyle({ fillOpacity: 0.8 });
          },
          mouseout: (e) => {
            if (selectedDistrict || mode === 'blended') return;
            e.target.setStyle({ fillOpacity: 0.65 });
          },
        });
      },
    }).addTo(map);

    geojsonLayerRef.current = layer;

    // 2. Draw constituency polygons within the selected district (datameet geojson: uses `district` property)
    let cLayer = null;
    if (selectedDistrict && constitsData) {
      const districtConstits = CONSTITUENCIES[selectedDistrict] || [];

      // Filter by `district` property set during pre-processing
      const filteredFeatures = {
        type: 'FeatureCollection',
        features: (constitsData.features || []).filter(f =>
          normDistrict(f.properties.district || '') === normDistrict(selectedDistrict)
        )
      };

      cLayer = L.geoJSON(filteredFeatures, {
        style: (feature) => {
          const rawName = feature.properties.AC_NAME || '';
          // match ignoring (SC)/(ST) suffixes and spacing
          const matchedConstit = districtConstits.find(c => normConstit(c) === normConstit(rawName));
          const displayName = matchedConstit || rawName.replace(/\s*\(sc\)|\s*\(st\)/gi, '').trim();
          const isCovered = coverageMap[selectedDistrict]?.[displayName] || false;
          const isSelected = selectedConstit === displayName;

          if (mode === 'blended') {
            return {
              color: isSelected ? saffron : '#94a3b8',
              weight: isSelected ? 2 : 1,
              fillColor: 'transparent',
              fillOpacity: 0
            };
          }

          return {
            color: isSelected ? saffron : '#1e293b',
            weight: isSelected ? 3 : 1.5,
            fillColor: isCovered ? '#22c55e' : '#ef4444',
            fillOpacity: isSelected ? 0.8 : 0.45
          };
        },
        onEachFeature: (feature, lyr) => {
          const rawName = feature.properties.AC_NAME || '';
          const matchedConstit = districtConstits.find(c => normConstit(c) === normConstit(rawName));
          const displayName = matchedConstit || rawName.replace(/\s*\(sc\)|\s*\(st\)/gi, '').trim();
          const isCovered = coverageMap[selectedDistrict]?.[displayName] || false;

          if (mode !== 'blended') {
            lyr.bindTooltip(
              `<strong>${displayName} Constituency</strong><br/>Status: ${isCovered ? 'Covered' : 'Pending'}`,
              { sticky: true }
            );
          }

          lyr.on({
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (pinModeActiveRef.current) {
                const { lat, lng } = e.latlng;
                const info = findBoundariesForCoords(lat, lng);
                setNewVolPin({ lat, lng, address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, ...info });
                setPinModeActive(false);
                return;
              }
              if (lockConstituency && lockConstituency !== displayName) return;
              setSelectedConstit(displayName);
              setSelectedWard('');
            },
            mouseover: (e) => {
              if (mode === 'blended') return;
              const isSel = selectedConstit === displayName;
              e.target.setStyle({ fillOpacity: 0.7, weight: isSel ? 3.5 : 2 });
            },
            mouseout: (e) => {
              if (mode === 'blended') return;
              const isSel = selectedConstit === displayName;
              e.target.setStyle({ fillOpacity: isSel ? 0.8 : 0.45, weight: isSel ? 3 : 1.5 });
            }
          });
        }
      }).addTo(map);

      constitLayerRef.current = cLayer;
    }

    // 2b. Draw ward polygons within the selected constituency
    let wLayer = null;
    if (selectedConstit && wardsData && wardToConstit.length) {
      const activeWardIds = new Set(
        wardToConstit
          .filter(w => normConstit(w.Constituency) === normConstit(selectedConstit))
          .map(w => w.Ward_No)
      );

      const filteredWardFeatures = {
        type: 'FeatureCollection',
        features: (wardsData.features || []).filter(f => activeWardIds.has(f.properties.Ward_No))
      };

      wLayer = L.geoJSON(filteredWardFeatures, {
        style: (feature) => {
          const isSelected = selectedWard === feature.properties.Ward_No;
          return {
            color: isSelected ? saffron : '#4f46e5', // Indigo color for ward borders
            weight: isSelected ? 3 : 1.5,
            dashArray: '4, 4',
            fillColor: '#818cf8',
            fillOpacity: isSelected ? 0.3 : 0.1
          };
        },
        onEachFeature: (feature, lyr) => {
          const wName = feature.properties.Ward_Name || '';
          const wNo = feature.properties.Ward_No || '';
          
          // Calculate volunteers inside this ward
          const volsInWard = volunteers.filter(v => 
            v.lat && v.lng && isPointInGeometry(v.lng, v.lat, feature.geometry)
          );
          
          const unassignedCount = volsInWard.filter(v => v.task_status === 'unassigned').length;
          const assignedCount = volsInWard.filter(v => v.task_status === 'assigned').length;
          const acceptedCount = volsInWard.filter(v => v.task_status === 'accepted').length;
          const completedCount = volsInWard.filter(v => v.task_status === 'completed').length;

          lyr.bindTooltip(
            `<strong>Ward: ${wName} (${wNo})</strong><br/>` +
            `Volunteers: ${volsInWard.length}<br/>` +
            `<span style="color:#64748b">●</span> Unassigned: ${unassignedCount}<br/>` +
            `<span style="color:#d1d5db;text-shadow:0 0 2px #000">●</span> Assigned: ${assignedCount}<br/>` +
            `<span style="color:#3b82f6">●</span> Accepted: ${acceptedCount}<br/>` +
            `<span style="color:#22c55e">●</span> Completed: ${completedCount}`,
            { sticky: true }
          );

          lyr.on({
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (pinModeActiveRef.current) {
                const { lat, lng } = e.latlng;
                const info = findBoundariesForCoords(lat, lng);
                setNewVolPin({ lat, lng, address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, ...info });
                setPinModeActive(false);
                return;
              }
              if (lockWard && lockWard !== wNo) return;
              setSelectedWard(wNo);
            },
            mouseover: (e) => {
              const isSelected = selectedWard === wNo;
              e.target.setStyle({ fillOpacity: 0.3, weight: isSelected ? 3.5 : 2.5 });
            },
            mouseout: (e) => {
              const isSelected = selectedWard === wNo;
              e.target.setStyle({ fillOpacity: isSelected ? 0.3 : 0.1, weight: isSelected ? 3 : 1.5 });
            }
          });
        }
      }).addTo(map);

      wardLayerRef.current = wLayer;
    }

    // 3. Keep map view centered and zoomed to selected area
    if (!selectedDistrict) {
      map.setView([28.6139, 77.2090], 11);
    } else {
      let zoomed = false;
      if (selectedWard && wLayer) {
        wLayer.eachLayer(l => {
          if (l.feature?.properties?.Ward_No === selectedWard) {
            map.fitBounds(l.getBounds());
            zoomed = true;
          }
        });
      }
      if (!zoomed && selectedConstit && cLayer) {
        cLayer.eachLayer(l => {
          const rawName = l.feature?.properties?.AC_NAME || '';
          if (normConstit(selectedConstit) === normConstit(rawName)) {
            map.fitBounds(l.getBounds());
            zoomed = true;
          }
        });
      }
      if (!zoomed && layer) {
        layer.eachLayer(l => {
          if (l.feature?.properties?.dtname === selectedDistrict) {
            map.fitBounds(l.getBounds());
            zoomed = true;
          }
        });
      }
    }

    // Outside click resets
    map.off('click');
    map.on('click', (e) => {
      if (pinModeActiveRef.current) {
        const { lat, lng } = e.latlng;
        const info = findBoundariesForCoords(lat, lng);
        setNewVolPin({ lat, lng, address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, ...info });
        setPinModeActive(false);
        return;
      }
      if (e.originalEvent.target.id === mapContainerRef.current.id ||
          e.originalEvent.target.tagName === 'svg') {
        if (!lockDistrict) {
          setSelectedDistrict(null);
          setSelectedConstit('');
          setSelectedWard('');
        } else if (!lockConstituency) {
          setSelectedConstit('');
          setSelectedWard('');
        } else if (!lockWard) {
          setSelectedWard('');
        }
      }
    });
  }, [geojsonData, constitsData, wardsData, wardToConstit, volunteers, selectedDistrict, selectedConstit, selectedWard, coverageMap, currentUser, dmDistrict, mode]);

  /* ── Temporary pin marker effect ─────────────────────────── */
  const handleCreateVolunteerRef = useRef(handleCreateVolunteer);
  handleCreateVolunteerRef.current = handleCreateVolunteer;

  const tempMarkerRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current) return;
    const L = require('leaflet');
    const map = mapRef.current;
    
    if (tempMarkerRef.current) {
      map.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
    
    if (newVolPin) {
      const icon = L.divIcon({
        className: 'camp-vol-icon-temp',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#D4A843;border:3px solid #04122e;box-shadow:0 3px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#04122e;animation:camp-pulse 1.5s infinite">📍</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([newVolPin.lat, newVolPin.lng], { icon });

      const popupDiv = document.createElement('div');
      popupDiv.style.minWidth = '240px';
      popupDiv.style.padding = '4px';
      popupDiv.style.fontFamily = "'Inter', system-ui, sans-serif";
      
      popupDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1.5px solid #D4A843; padding-bottom: 4px;">
          <h4 style="margin: 0; color: #04122e; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">New Volunteer</h4>
        </div>
        <div style="font-size: 10px; display: flex; flex-direction: column; gap: 2px; color: #64748b; margin-bottom: 8px; background: #f8fafc; padding: 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
          <div><strong>District:</strong> ${newVolPin.district || 'Central'}</div>
          <div><strong>Constituency:</strong> ${newVolPin.constituency || 'None'}</div>
          <div><strong>Ward:</strong> ${newVolPin.ward ? 'Ward ' + newVolPin.ward : 'None'}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div>
            <label style="font-size: 8px; font-weight: 700; color: #04122e; display: block; margin-bottom: 2px; text-transform: uppercase;">Name *</label>
            <input type="text" id="popup-new-vol-name" placeholder="Name" style="width: 100%; padding: 5px 8px; font-size: 11px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; outline: none;" />
          </div>
          <div>
            <label style="font-size: 8px; font-weight: 700; color: #04122e; display: block; margin-bottom: 2px; text-transform: uppercase;">Phone *</label>
            <input type="text" id="popup-new-vol-phone" placeholder="Phone" style="width: 100%; padding: 5px 8px; font-size: 11px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; outline: none;" />
          </div>
          <div>
            <label style="font-size: 8px; font-weight: 700; color: #04122e; display: block; margin-bottom: 2px; text-transform: uppercase;">Assigned Area</label>
            <input type="text" id="popup-new-vol-area" value="${newVolPin.address || ''}" placeholder="Assigned Area" style="width: 100%; padding: 5px 8px; font-size: 11px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; outline: none;" />
          </div>
          <div>
            <label style="font-size: 8px; font-weight: 700; color: #04122e; display: block; margin-bottom: 2px; text-transform: uppercase;">Initial Task</label>
            <input type="text" id="popup-new-vol-task" placeholder="Task" style="width: 100%; padding: 5px 8px; font-size: 11px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; outline: none;" />
          </div>
          <div>
            <label style="font-size: 8px; font-weight: 700; color: #04122e; display: block; margin-bottom: 2px; text-transform: uppercase;">Status</label>
            <select id="popup-new-vol-status" style="width: 100%; padding: 5px 8px; font-size: 11px; border-radius: 4px; border: 1px solid #cbd5e1; background: white; box-sizing: border-box; outline: none; cursor: pointer;">
              <option value="unassigned">Unassigned (Grey)</option>
              <option value="assigned">Assigned (White)</option>
              <option value="accepted">Accepted (Blue)</option>
              <option value="completed">Completed (Green)</option>
            </select>
          </div>
          <button id="popup-new-vol-btn" style="padding: 6px 10px; font-size: 10px; font-weight: 700; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 4px; width: 100%; text-transform: uppercase; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);">
            Save Volunteer
          </button>
        </div>
      `;

      L.DomEvent.disableClickPropagation(popupDiv);
      L.DomEvent.disableScrollPropagation(popupDiv);
      L.DomEvent.on(popupDiv, 'keydown', (e) => {
        e.stopPropagation();
      });

      const btn = popupDiv.querySelector('#popup-new-vol-btn');
      if (btn) {
        btn.onclick = () => {
          const name = popupDiv.querySelector('#popup-new-vol-name').value.trim();
          const phone = popupDiv.querySelector('#popup-new-vol-phone').value.trim();
          const area = popupDiv.querySelector('#popup-new-vol-area').value.trim();
          const task = popupDiv.querySelector('#popup-new-vol-task').value.trim();
          const status = popupDiv.querySelector('#popup-new-vol-status').value;
          
          if (!name || !phone) {
            alert("Name and phone are required!");
            return;
          }
          
          handleCreateVolunteerRef.current({
            name,
            phone,
            district: newVolPin.district || selectedDistrict || 'Central',
            constituency: newVolPin.constituency || selectedConstit || '',
            assigned_area: area || newVolPin.address || 'Custom Location',
            assigned_task: task,
            task_status: status,
            lat: newVolPin.lat,
            lng: newVolPin.lng
          });
        };
      }

      marker.bindPopup(popupDiv, {
        maxWidth: 300,
        minWidth: 250,
        closeOnClick: false,
        autoClose: false
      }).addTo(map);

      marker.on('popupclose', () => {
        setNewVolPin(null);
      });

      marker.openPopup();
      tempMarkerRef.current = marker;
    }
  }, [newVolPin]);

  /* ── Volunteer markers ───────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current) return;
    const L = require('leaflet');
    const map = mapRef.current;
    volLayerRef.current.forEach(m => map.removeLayer(m));
    volLayerRef.current = [];

    if (mode === 'blended') return;

    volunteers.forEach(v => {
      if (!v.lat || !v.lng) return;

      // Enforce role locks
      if (lockDistrict && v.district !== lockDistrict) return;
      if (lockConstituency && v.constituency !== lockConstituency) return;
      if (lockWard && wardsData) {
        const wardFeature = (wardsData.features || []).find(f => f.properties.Ward_No === lockWard);
        if (wardFeature && !isPointInGeometry(v.lng, v.lat, wardFeature.geometry)) {
          return;
        }
      }

      // Enforce active selections
      if (selectedDistrict && v.district !== selectedDistrict) return;
      if (selectedConstit && v.constituency !== selectedConstit) return;
      if (selectedWard && wardsData) {
        const wardFeature = (wardsData.features || []).find(f => f.properties.Ward_No === selectedWard);
        if (wardFeature && !isPointInGeometry(v.lng, v.lat, wardFeature.geometry)) {
          return;
        }
      }
      
      const taskStatus = v.task_status || 'unassigned';
      const color = taskStatus === 'completed' ? '#22c55e' // green
                  : taskStatus === 'accepted'  ? '#3b82f6' // blue
                  : taskStatus === 'assigned'  ? '#ffffff' // white
                  : '#9ca3af';                            // grey
      
      const border = taskStatus === 'assigned' ? '2.5px solid #04122e' : '2.5px solid white';
      const textColor = taskStatus === 'assigned' ? '#04122e' : 'white';

      const icon = L.divIcon({
        className: 'camp-vol-icon',
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:${border};box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:${textColor};${v.status==='active'?'animation:camp-pulse 2s infinite;':''}">V</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker([v.lat, v.lng], { icon });
      marker.bindPopup(`
        <div style="min-width:150px;font-family:sans-serif;font-size:12px;line-height:1.5">
          <b style="font-size:13px">${v.name}</b><br/>
          <span style="color:#6b7280">${v.assigned_area}</span><br/>
          <span>Task: ${v.assigned_task || 'None'}</span><br/>
          <span style="text-transform:uppercase;font-weight:bold;color:${taskStatus === 'assigned' ? '#04122e' : color}">Status: ${taskStatus}</span><br/>
          <span style="color:#2563eb;font-weight:700">${v.phone}</span><br/>
          <span style="color:#9ca3af;font-size:10px">Updated ${v.last_location_update || '—'}</span>
        </div>
      `);
      marker.on('click', () => {
        setSelectedVol(v);
        setActiveTab('volunteers');
      });
      marker.addTo(map);
      volLayerRef.current.push(marker);
    });
  }, [volunteers, mode, lockDistrict, lockConstituency, lockWard, selectedDistrict, selectedConstit, selectedWard, wardsData]);

  /* ── Heatmap Layer for Blended Mode ──────────────────────── */
  useEffect(() => {
    if (!mapRef.current) return;
    const L = require('leaflet');
    require('leaflet.heat');
    const map = mapRef.current;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (mode === 'blended') {
      const points = volunteers
        .filter(v => v.lat && v.lng)
        .map(v => {
          let intensity = 0.5;
          if (v.status === 'active') intensity = 1.0;
          if (v.coverage_status === 'covered') intensity = 0.8;
          return [v.lat, v.lng, intensity];
        });

      if (points.length > 0) {
        const heatLayer = L.heatLayer(points, {
          radius: 45,
          blur: 30,
          maxZoom: 15,
          minOpacity: 0.15,
          gradient: {
            0.2: 'rgba(59, 130, 246, 0.4)',  // Blue
            0.4: 'rgba(168, 85, 247, 0.6)',  // Purple
            0.7: 'rgba(249, 115, 22, 0.85)', // Orange
            1.0: 'rgba(239, 68, 68, 0.95)'   // Red
          }
        }).addTo(map);
        heatLayerRef.current = heatLayer;
      }
    }
  }, [volunteers, mode]);

  /* ── Handlers ────────────────────────────────────────────── */
  useEffect(() => {
    if (selectedVol) {
      setNewTaskText(selectedVol.assigned_task || '');
      setNewTaskStatus(selectedVol.task_status || 'unassigned');
    }
  }, [selectedVol]);

  const handleSaveTask = async () => {
    if (!selectedVol) return;
    try {
      const r = await fetch(`${API}/campaign/volunteers/${selectedVol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_task: newTaskText,
          task_status: newTaskStatus,
        }),
      });
      if (r.ok) {
        const updated = await r.json();
        setVolunteers(prev => prev.map(v => v.id === selectedVol.id ? { ...v, ...updated } : v));
        setSelectedVol(prev => prev ? { ...prev, ...updated } : null);
      }
    } catch (err) {
      console.error("Failed to save task:", err);
    }
  };

  const handleMarkCovered = useCallback(async (volId) => {
    await apiMarkCovered(volId, mode);
    setVolunteers(prev => prev.map(v => v.id === volId ? { ...v, coverage_status: 'covered' } : v));
    // update local coverage map
    const vol = volunteers.find(v => v.id === volId);
    if (vol?.constituency) {
      setCoverageMap(prev => ({
        ...prev,
        [vol.district]: { ...prev[vol.district], [vol.constituency]: true },
      }));
    }
  }, [volunteers, mode]);

  const handleMarkAllCovered = useCallback(async () => {
    if (selectedDistrict) {
      await apiMarkAllCovered(selectedDistrict, currentUser?.name, mode);
      setVolunteers(prev => prev.map(v => ({ ...v, coverage_status: 'covered' })));
      const newDC = {};
      (CONSTITUENCIES[selectedDistrict] || []).forEach(c => { newDC[c] = true; });
      setCoverageMap(prev => ({ ...prev, [selectedDistrict]: newDC }));
      loadCoverage();
    }
  }, [selectedDistrict, currentUser, loadCoverage, mode, CONSTITUENCIES]);

  const handleDistrictClick = (d) => {
    setSelectedDistrict(d);
    setSelectedConstit('');
    if (mapRef.current && geojsonLayerRef.current) {
      geojsonLayerRef.current.eachLayer(l => {
        if (l.feature?.properties?.dtname === d) mapRef.current.fitBounds(l.getBounds());
      });
    }
  };

  /* ── Derived stats ───────────────────────────────────────── */
  const activeVols   = volunteers.filter(v => v.status === 'active').length;
  const coveredVols  = volunteers.filter(v => v.coverage_status === 'covered').length;
  const pctVols      = volunteers.length ? Math.round((coveredVols / volunteers.length) * 100) : 0;
  const constitNames = selectedDistrict ? (CONSTITUENCIES[selectedDistrict] || []) : [];
  const distCov      = coverageMap[selectedDistrict] || {};
  const constitCovered = constitNames.filter(c => distCov[c]).length;

  const filteredVolunteersList = volunteers.filter(v => {
    if (lockDistrict && v.district !== lockDistrict) return false;
    if (lockConstituency && v.constituency !== lockConstituency) return false;
    if (lockWard && wardsData) {
      const wardFeature = (wardsData.features || []).find(f => f.properties.Ward_No === lockWard);
      if (wardFeature && v.lat && v.lng && !isPointInGeometry(v.lng, v.lat, wardFeature.geometry)) return false;
    }
    if (selectedDistrict && v.district !== selectedDistrict) return false;
    if (selectedConstit && v.constituency !== selectedConstit) return false;
    if (selectedWard && wardsData && wardToConstit.length) {
      const wardFeature = (wardsData.features || []).find(f => f.properties.Ward_No === selectedWard);
      if (wardFeature && v.lat && v.lng) {
        return isPointInGeometry(v.lng, v.lat, wardFeature.geometry);
      }
    }
    return true;
  });

  const totalConstit  = Object.values(CONSTITUENCIES).reduce((s, a) => s + a.length, 0);
  const totalCovered  = Object.entries(coverageMap).reduce((s, [d, dc]) =>
    s + (CONSTITUENCIES[d] || []).filter(c => dc[c]).length, 0);

  // Calculate Delhi-wide aggregate stats
  const getDelhiWideStats = () => {
    const dbVolsCount = Object.values(summary).reduce((acc, curr) => acc + (curr.total_volunteers || 0), 0);
    const dbActiveCount = Object.values(summary).reduce((acc, curr) => acc + (curr.active_volunteers || 0), 0);
    return {
      totalVols: dbVolsCount,
      activeVols: dbActiveCount,
      coveredConstit: totalCovered,
      totalConstit: totalConstit,
      pct: totalConstit ? Math.round((totalCovered / totalConstit) * 100) : 0
    };
  };

  const delhiStats = getDelhiWideStats();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: '"Public Sans", "Inter", sans-serif', background: '#f8fafc', padding: '16px 0', overflowX: 'hidden', maxWidth: '100%' }}>
      <style>{`
        @keyframes camp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.5)}50%{box-shadow:0 0 0 8px rgba(59,130,246,0)}}
        .camp-vol-icon{background:transparent!important;border:none!important;box-shadow:none!important}
        .leaflet-tooltip{font-size:12px!important}
        .leaflet-interactive:focus { outline: none !important; }
      `}</style>

      {/* ── Header controls & Title ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: navy, fontSize: '22px', fontWeight: '900', letterSpacing: '-0.03em' }}>
            🗳️ Campaign Management
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            {userRole === 'DM'
              ? `DM — ${lockDistrict || dmDistrict} District`
              : userRole === 'DISTRICT_ADMIN'
              ? `District Admin — ${lockDistrict} District`
              : userRole === 'CONSTITUENCY_MGR'
              ? `Constituency Manager — ${lockConstituency} (${lockDistrict})`
              : userRole === 'MANDAL_MGR'
              ? `Mandal Manager — Ward ${lockWard} (${lockConstituency})`
              : 'Real-time volunteer tracking · Constituency coverage · Delhi-wide overview'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setSimulateLive(p => !p)} style={{
            padding: '8px 16px', fontSize: '12px', fontWeight: '800', borderRadius: 4, border: 'none', cursor: 'pointer',
            background: simulateLive ? '#22c55e' : 'rgba(4,18,46,0.15)',
            color: simulateLive ? 'white' : navy, display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s ease'
          }}>
            <span style={{ width:8,height:8,borderRadius:'50%',background:simulateLive?'white':navy,display:'inline-block',
              animation:simulateLive?'camp-pulse 1s infinite':undefined }} />
            {simulateLive ? 'Live ON' : 'Live OFF'}
          </button>
          {selectedDistrict && !lockDistrict && (
            <button onClick={() => { setSelectedDistrict(null); setSelectedConstit(''); if (mapRef.current) mapRef.current.setView([28.6139, 77.2090], 11); }}
              style={{
                padding: '8px 16px', fontSize: '12px', fontWeight: '800', borderRadius: 4, border: 'none', cursor: 'pointer',
                background: navy, color: 'white', transition: 'all 0.15s ease'
              }}>
              ← All Districts
            </button>
          )}
        </div>
      </div>

      {/* ── Stats row (Styled like MapPanel metrics) ── */}
      <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Volunteers', val: selectedDistrict ? volunteers.length : delhiStats.totalVols, sub: selectedDistrict ? selectedDistrict : 'All Delhi', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Active Now', val: selectedDistrict ? activeVols : delhiStats.activeVols, sub: selectedDistrict ? 'Sending location' : 'Delhi-wide active', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Area Covered', val: selectedDistrict ? `${pctVols}%` : `${delhiStats.pct}%`, sub: selectedDistrict ? `${coveredVols}/${volunteers.length}` : `${delhiStats.coveredConstit}/${delhiStats.totalConstit} Constituencies`, color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
            { label: 'Constituencies', val: selectedDistrict ? `${constitCovered}/${constitNames.length}` : `${DELHI_DISTRICTS.length} Districts`, sub: selectedDistrict ? 'Constituencies Covered' : 'Delhi-wide districts', color: '#8b5cf6', bg: '#faf5ff', border: '#e9d5ff' },
          ].map(({ label, val, sub, color, bg, border }) => (
            <div key={label} style={{
              background: bg, padding: '12px 14px', border: `1px solid ${border}`, borderRadius: 4, textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: navy }}>{val}</div>
              <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-Column Workspace Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24, minHeight: 480 }}>

        {/* Map Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0 }}>
          {/* Map Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: navy, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {selectedDistrict ? `${selectedDistrict} District — Boundary Mapper` : 'Delhi NCT — Boundary Mapper'}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>
                {selectedDistrict ? `${selectedConstit || 'All constituencies'}` : 'Click on district boundary polygons to zoom and view volunteers'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 8px', background: '#e2e8f0', color: '#475569', borderRadius: 2 }}>DELHI_NCT</span>
            </div>
          </div>

          {/* Leaflet map container */}
          <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 960 }}>
            <div id="leaflet-map" ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 960, cursor: pinModeActive ? 'crosshair' : 'grab' }} />

            {/* Search and drop pin controls overlay */}
            <div style={{
              position: 'absolute',
              top: 20,
              right: 20,
              zIndex: 1000,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '12px 14px',
              borderRadius: 4,
              width: 320,
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <span style={{ fontSize: '10px', fontWeight: '900', color: navy, letterSpacing: '0.08em' }}>SEARCH OR DEPLOY VOLUNTEER</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchLocality(searchQuery); }}
                  placeholder="Enter location or locality name..."
                  style={{ flex: 1, padding: '6px 10px', fontSize: '11px', borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none' }}
                />
                <button 
                  onClick={() => handleSearchLocality(searchQuery)}
                  disabled={searching}
                  style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '800', background: navy, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  {searching ? '...' : 'Go'}
                </button>
              </div>
              
              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div style={{ maxHeight: 150, overflowY: 'auto', background: 'white', border: '1px solid #cbd5e1', borderRadius: 4, display: 'flex', flexDirection: 'column' }}>
                  {searchResults.map((res, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleSelectSearchResult(res)}
                      style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      📍 {res.display_name}
                    </div>
                  ))}
                </div>
              )}

              {/* Pin Mode Button */}
              <button 
                onClick={() => setPinModeActive(p => !p)}
                style={{
                  padding: '8px 10px', fontSize: '11px', fontWeight: '800', borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: pinModeActive ? '#ef4444' : saffron,
                  color: pinModeActive ? 'white' : navy,
                  transition: 'all 0.15s ease'
                }}
              >
                {pinModeActive ? '🔴 Cancel Placement (Click Map)' : '📍 Drop Pin on Map to Deploy'}
              </button>
            </div>

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
              <span style={{ fontSize: '10px', fontWeight: '900', color: navy, letterSpacing: '0.08em' }}>COVERAGE STATUS</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 2 }} />
                  Fully covered
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: 2 }} />
                  Partial
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, background: '#ef4444', borderRadius: 2 }} />
                  Not started
                </div>
              </div>

              <span style={{ fontSize: '10px', fontWeight: '900', color: navy, letterSpacing: '0.08em', marginTop: 4 }}>VOLUNTEERS</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: '50%' }} />
                  Completed work (Green)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: '50%' }} />
                  Accepted (Blue)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, background: '#ffffff', border: '1.5px solid #04122e', borderRadius: '50%' }} />
                  Assigned (White)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, background: '#9ca3af', borderRadius: '50%' }} />
                  Unassigned (Grey)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Columns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* District Selector & Overview Card */}
          <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: navy, fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}>
                {selectedDistrict ? `${selectedDistrict} District` : "NCT of Delhi"}
              </h3>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 8px',
                background: selectedDistrict ? '#eff6ff' : '#f0fdf4',
                color: selectedDistrict ? '#1d4ed8' : '#166534',
                borderRadius: 2
              }}>
                {selectedDistrict ? `${constitCovered}/${constitNames.length} Covered` : 'OVERVIEW'}
              </span>
            </div>

            {/* District list grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {DELHI_DISTRICTS.map(d => {
                const dc = coverageMap[d] || {};
                const dcn = CONSTITUENCIES[d] || [];
                const pct = dcn.length ? Math.round(dcn.filter(c => dc[c]).length / dcn.length * 100) : 0;
                const isLocked = lockDistrict && lockDistrict !== d;
                const isSel = d === selectedDistrict;
                return (
                  <button key={d} onClick={() => handleDistrictClick(d)} disabled={isLocked} style={{
                    padding: '6px 8px', borderRadius: 4, border: `1px solid ${isSel ? saffron : '#e2e8f0'}`,
                    background: isSel ? '#fef3c7' : 'white',
                    cursor: isLocked ? 'not-allowed' : 'pointer', textAlign: 'left',
                    opacity: isLocked ? 0.4 : 1,
                    transition: 'all 0.1s ease',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: isSel ? 800 : 500, color: isSel ? '#92400e' : navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <div style={{ flex: 1, height: 3, borderRadius: 99, background: '#e2e8f0' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: pct === 100 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#ef4444', width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: 8, fontWeight: 800, color: '#64748b' }}>{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Constituency Filter Selector Card */}
          {selectedDistrict && (
            <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 16 }}>
              <h4 style={{ margin: '0 0 10px 0', color: navy, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Constituency Filter
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {!lockConstituency && (
                  <button onClick={() => { setSelectedConstit(''); setSelectedWard(''); }} style={{
                    padding: '4px 10px', fontSize: 10, fontWeight: 800, borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: !selectedConstit ? navy : '#f1f5f9', color: !selectedConstit ? 'white' : '#475569',
                  }}>All</button>
                )}
                {constitNames.map(c => {
                  const isConstLocked = lockConstituency && lockConstituency !== c;
                  if (isConstLocked) return null;
                  return (
                    <button key={c} onClick={() => { setSelectedConstit(c); setSelectedWard(''); }} style={{
                      padding: '4px 10px', fontSize: 10, fontWeight: 800, borderRadius: 4, border: 'none', cursor: 'pointer',
                      background: selectedConstit === c ? navy : '#f1f5f9', color: selectedConstit === c ? 'white' : '#475569',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {distCov[c] && <span style={{ color: '#22c55e' }}>✓</span>}
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wards in Constituency Selector Card */}
          {selectedDistrict && selectedConstit && (
            <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 16 }}>
              <h4 style={{ margin: '0 0 10px 0', color: navy, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Wards in {selectedConstit}</span>
                {selectedWard && !lockWard && (
                  <button onClick={() => setSelectedWard('')} style={{ border: 'none', background: 'transparent', fontSize: '9px', fontWeight: '800', color: '#ef4444', cursor: 'pointer' }}>
                    [Clear Filter]
                  </button>
                )}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {wardToConstit
                  .filter(w => normConstit(w.Constituency) === normConstit(selectedConstit))
                  .map(w => {
                    const isWardLocked = lockWard && lockWard !== w.Ward_No;
                    if (isWardLocked) return null;
                    const wardGeom = (wardsData?.features || []).find(f => f.properties.Ward_No === w.Ward_No)?.geometry;
                    const volsInWard = volunteers.filter(v => 
                      v.lat && v.lng && isPointInGeometry(v.lng, v.lat, wardGeom)
                    );
                    const isSel = selectedWard === w.Ward_No;
                    return (
                      <div 
                        key={w.Ward_No}
                        onClick={() => {
                          if (lockWard) return;
                          setSelectedWard(isSel ? '' : w.Ward_No);
                        }}
                        style={{
                          padding: '6px 8px', borderRadius: 4, border: `1px solid ${isSel ? saffron : '#e2e8f0'}`,
                          background: isSel ? '#fef3c7' : 'white', cursor: lockWard ? 'default' : 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'all 0.1s ease',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: navy }}>{w.Ward_Name}</div>
                          <div style={{ fontSize: 8, color: '#64748b' }}>Code: {w.Ward_No}</div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 10, background: volsInWard.length ? '#eff6ff' : '#f1f5f9', color: volsInWard.length ? '#1d4ed8' : '#64748b' }}>
                          {volsInWard.length} Vols
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Volunteers / Coverage Tabs and List Container */}
          <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {['volunteers', 'coverage', 'analytics'].map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  flex: 1, padding: '12px 0', fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.06em',
                  background: 'transparent', color: activeTab === t ? navy : '#94a3b8',
                  borderBottom: activeTab === t ? `2px solid ${saffron}` : '2px solid transparent',
                  transition: 'all 0.15s ease'
                }}>{t}</button>
              ))}
            </div>

            {/* List and Tables Scroll Container */}
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: 16 }}>
              {/* Volunteer list tab */}
              {activeTab === 'volunteers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {newVolPin && (
                    <div style={{ border: `1.5px dashed ${saffron}`, padding: '12px 16px', borderRadius: 6, background: '#fffbeb', marginBottom: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: '700', color: navy, marginBottom: 4 }}>📍 Pin Dropped on Map</div>
                      <div style={{ fontSize: 11, color: '#475569', lineHeight: '1.4' }}>
                        Fill in name, phone, and task details directly in the map popup to register the volunteer.
                      </div>
                      <button 
                        onClick={() => setNewVolPin(null)} 
                        style={{ marginTop: 8, padding: '4px 10px', fontSize: 10, fontWeight: '800', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      >
                        Cancel Pin
                      </button>
                    </div>
                  )}

                  {/* Task Assignment Card for Selected Volunteer */}
                  {selectedVol && (
                    <div style={{ border: '1px solid #cbd5e1', padding: 12, borderRadius: 4, background: '#f8fafc', marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                        <h4 style={{ margin: 0, color: navy, fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Assign Task to Volunteer</h4>
                        <button onClick={() => setSelectedVol(null)} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer', color: '#64748b', fontWeight: '800' }}>×</button>
                      </div>
                      
                      <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, color: '#334155' }}>
                        <div><strong>Name:</strong> {selectedVol.name}</div>
                        <div><strong>Phone:</strong> {selectedVol.phone}</div>
                        <div><strong>District:</strong> {selectedVol.district}</div>
                        <div><strong>Constituency:</strong> {selectedVol.constituency || 'None'}</div>
                        <div><strong>Area:</strong> {selectedVol.assigned_area}</div>
                        <div><strong>Current Task:</strong> {selectedVol.assigned_task || 'None'}</div>
                        <div>
                          <strong>Status:</strong>{' '}
                          <span style={{
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            color: selectedVol.task_status === 'completed' ? '#22c55e'
                                 : selectedVol.task_status === 'accepted' ? '#3b82f6'
                                 : selectedVol.task_status === 'assigned' ? '#0f172a'
                                 : '#64748b'
                          }}>
                            {selectedVol.task_status || 'unassigned'}
                          </span>
                        </div>
                      </div>

                      {/* Edit Task Form */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                        <div>
                          <label style={{ fontSize: 9, fontWeight: '800', color: navy, display: 'block', marginBottom: 3 }}>ASSIGN NEW TASK</label>
                          <input 
                            type="text" 
                            value={newTaskText} 
                            onChange={(e) => setNewTaskText(e.target.value)} 
                            placeholder="Enter task details..."
                            style={{ width: '100%', padding: '5px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, fontWeight: '800', color: navy, display: 'block', marginBottom: 3 }}>STATUS</label>
                          <select 
                            value={newTaskStatus} 
                            onChange={(e) => setNewTaskStatus(e.target.value)} 
                            style={{ width: '100%', padding: '5px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                          >
                            <option value="unassigned">Unassigned (Grey)</option>
                            <option value="assigned">Assigned (White)</option>
                            <option value="accepted">Accepted (Blue)</option>
                            <option value="completed">Completed (Green)</option>
                          </select>
                        </div>
                        <button 
                          onClick={handleSaveTask}
                          style={{ padding: '6px 10px', fontSize: 10, fontWeight: '800', background: navy, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 2, display: 'block', width: '100%' }}
                        >
                          Save Task & Status
                        </button>
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>Loading volunteers…</div>
                  ) : filteredVolunteersList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>No volunteers in this area.</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
                        Volunteers ({filteredVolunteersList.length})
                      </div>
                      {filteredVolunteersList.map(v => {
                        const taskStatus = v.task_status || 'unassigned';
                        const color = taskStatus === 'completed' ? '#22c55e'
                                    : taskStatus === 'accepted' ? '#3b82f6'
                                    : taskStatus === 'assigned' ? '#0f172a'
                                    : '#64748b';
                        return (
                          <div key={v.id} onClick={() => { setSelectedVol(v); if (v.lat && v.lng && mapRef.current) mapRef.current.setView([v.lat, v.lng], 14, { animate: true }); }}
                            style={{
                              padding: '10px 12px', borderRadius: 4, cursor: 'pointer',
                              border: `1px solid ${selectedVol?.id === v.id ? saffron : '#e2e8f0'}`,
                              background: selectedVol?.id === v.id ? '#fef3c7' : 'white',
                              transition: 'all .12s'
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: 12, color: navy }}>{v.name}</span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 2, background: v.status === 'active' ? '#dcfce7' : '#f3f4f6', color: v.status === 'active' ? '#166534' : '#6b7280', textTransform: 'uppercase' }}>{v.status}</span>
                                <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 2, background: taskStatus === 'completed' ? '#dcfce7' : taskStatus === 'accepted' ? '#eff6ff' : taskStatus === 'assigned' ? '#f3f4f6' : '#f9fafb', color: color, textTransform: 'uppercase', border: taskStatus === 'assigned' ? '1px solid #cbd5e1' : 'none' }}>
                                  {taskStatus}
                                </span>
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', margin: '3px 0' }}>📍 {v.assigned_area}</div>
                            {v.assigned_task && <div style={{ fontSize: 11, color: '#0f172a', fontStyle: 'italic' }}>📝 {v.assigned_task}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                              <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>{v.phone}</span>
                              <span style={{ fontSize: 10, color: '#94a3b8' }}>{v.last_location_update ? new Date(v.last_location_update).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}) : '—'}</span>
                            </div>
                            {v.coverage_status !== 'covered' && (
                              <button onClick={(e) => { e.stopPropagation(); handleMarkCovered(v.id); }} style={{
                                marginTop: 6, padding: '3px 10px', fontSize: 10, fontWeight: 800,
                                background: '#2563eb', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer',
                              }}>Mark Area Covered</button>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* Coverage table tab */}
              {activeTab === 'coverage' && (
                <div>
                  {selectedDistrict ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: navy }}>{selectedDistrict} Coverage</span>
                        <button onClick={handleMarkAllCovered} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 800, background: '#16a34a', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}>
                          ✓ Mark All
                        </button>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>Constituency</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {constitNames.map((c, i) => (
                            <tr key={c} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                              <td style={{ padding: '7px 8px', color: navy, fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>{c}</td>
                              <td style={{ padding: '7px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 2, background: distCov[c] ? '#dcfce7' : '#fee2e2', color: distCov[c] ? '#166534' : '#991b1b' }}>
                                  {distCov[c] ? '✓ COVERED' : 'NOT STARTED'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <div>
                      <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 700, color: navy }}>Delhi — All Districts Coverage</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['District', 'Covered', 'Total', '%'].map(h => (
                              <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DELHI_DISTRICTS.map((d, i) => {
                            const dc = coverageMap[d] || {};
                            const dcn = CONSTITUENCIES[d] || [];
                            const cnt = dcn.filter(c => dc[c]).length;
                            const pct = dcn.length ? Math.round(cnt / dcn.length * 100) : 0;
                            return (
                              <tr key={d} onClick={() => handleDistrictClick(d)} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', cursor: 'pointer' }}>
                                <td style={{ padding: '7px 8px', color: navy, fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{d}</td>
                                <td style={{ padding: '7px 8px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#22c55e' }}>{cnt}</td>
                                <td style={{ padding: '7px 8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{dcn.length}</td>
                                <td style={{ padding: '7px 8px', borderBottom: '1px solid #f1f5f9' }}>
                                  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 2, background: pct === 100 ? '#dcfce7' : pct > 50 ? '#fef9c3' : '#fee2e2', color: pct === 100 ? '#166534' : pct > 50 ? '#92400e' : '#991b1b' }}>{pct}%</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Analytics tab */}
              {activeTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
                    Campaign Density Analytics
                  </div>
                  
                  {/* 1. Highest & Lowest density districts */}
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: navy, textTransform: 'uppercase', marginBottom: 6 }}>District Distribution</div>
                    {(() => {
                      const distCounts = {};
                      DELHI_DISTRICTS.forEach(d => { distCounts[d] = 0; });
                      volunteers.forEach(v => {
                        if (v.district) distCounts[v.district] = (distCounts[v.district] || 0) + 1;
                      });
                      const entries = Object.entries(distCounts).sort((a, b) => b[1] - a[1]);
                      const highest = entries[0];
                      const lowest = entries[entries.length - 1];
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                          <div><strong>Highest Density:</strong> {highest ? `${highest[0]} (${highest[1]} Vols)` : '—'}</div>
                          <div><strong>Lowest Density:</strong> {lowest ? `${lowest[0]} (${lowest[1]} Vols)` : '—'}</div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 2. Top constituencies by count */}
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: navy, textTransform: 'uppercase', marginBottom: 6 }}>Top Constituencies</div>
                    {(() => {
                      const constCounts = {};
                      volunteers.forEach(v => {
                        if (v.constituency) {
                          constCounts[v.constituency] = (constCounts[v.constituency] || 0) + 1;
                        }
                      });
                      const sorted = Object.entries(constCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                          {sorted.length === 0 ? <div>No volunteer data available.</div> : sorted.map(([name, count], idx) => (
                            <div key={name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{idx + 1}. {name}</span>
                              <span style={{ fontWeight: 800 }}>{count} Vols</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 3. Task Status Distribution progress bar */}
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: navy, textTransform: 'uppercase', marginBottom: 8 }}>Task Status breakdown</div>
                    {(() => {
                      const unassigned = volunteers.filter(v => (v.task_status || 'unassigned') === 'unassigned').length;
                      const assigned = volunteers.filter(v => v.task_status === 'assigned').length;
                      const accepted = volunteers.filter(v => v.task_status === 'accepted').length;
                      const completed = volunteers.filter(v => v.task_status === 'completed').length;
                      const total = volunteers.length || 1;

                      const pct = (val) => Math.round((val / total) * 100);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                          {[
                            { label: 'Unassigned', val: unassigned, color: '#9ca3af' },
                            { label: 'Assigned', val: assigned, color: '#4b5563' },
                            { label: 'Accepted', val: accepted, color: '#3b82f6' },
                            { label: 'Completed', val: completed, color: '#22c55e' }
                          ].map(s => (
                            <div key={s.label}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                                <span>{s.label} ({s.val})</span>
                                <span style={{ fontWeight: 800 }}>{pct(s.val)}%</span>
                              </div>
                              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                                <div style={{ height: '100%', background: s.color, borderRadius: 2, width: `${pct(s.val)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 4. Active Ratio */}
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 4, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: navy, textTransform: 'uppercase' }}>Active Ratio</div>
                      <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Sending real-time location logs</div>
                    </div>
                    {(() => {
                      const active = volunteers.filter(v => v.status === 'active').length;
                      const total = volunteers.length || 1;
                      const ratio = Math.round((active / total) * 100);
                      return (
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e' }}>{ratio}%</div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignPanel;
