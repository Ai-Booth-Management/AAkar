import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  isPointInGeometry,
  normConstit,
  normDistrict,
  CONSTITUENCIES_NEW,
  CONSTITUENCIES_OLD,
} from './campaignUtils';

const navy = '#04122e';
const saffron = '#D4A843';

const CampaignMap = ({
  mode,
  geojsonData,
  constitsData,
  boundaryData,
  wardsData,
  wardToConstit,
  selectedDistrict,
  setSelectedDistrict,
  selectedConstit,
  setSelectedConstit,
  selectedWard,
  setSelectedWard,
  volunteers,
  setSelectedVol,
  coverageMap,
  lockDistrict,
  lockConstituency,
  lockWard,
  pinModeActive,
  setPinModeActive,
  newVolPin,
  setNewVolPin,
  handleCreateVolunteer,
  campaignMode,
  onCampaignPinDrop,
  activeCampaigns,
  mapRef,
  voterDemoMap = {},
  filterActive = false,
  filterSummary = null,
  setFilterDrawerOpen = () => {},
  activeFilters = null,
  filterTags = [],
  onClearFilter = () => {},
  identityMode = false,
  setIdentityMode = () => {},
  clickedWardIdentity = null,
  setClickedWardIdentity = () => {},
}) => {
  const mapContainerRef  = useRef(null);
  const geojsonLayerRef  = useRef(null);
  const constitLayerRef  = useRef(null);
  const wardLayerRef      = useRef(null);
  const volLayerRef      = useRef([]);
  const heatLayerRef     = useRef(null);

  const [searchQuery,        setSearchQuery]        = useState('');
  const [searchResults,      setSearchResults]      = useState([]);
  const [searching,          setSearching]          = useState(false);
  const [showCampaigns,      setShowCampaigns]      = useState(false);
  const [identityData,       setIdentityData]       = useState(null);  // { wards, palette, field_labels }
  const identityLayerRef = useRef(null);

  const CONSTITUENCIES = mode === 'new' || mode === 'blended' || mode === 'abs' ? CONSTITUENCIES_NEW : CONSTITUENCIES_OLD;

  const getDemoData = useCallback((cName) => {
    if (!voterDemoMap || !voterDemoMap.constituencies || !cName) return { matching: 0, total: 0 };
    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = norm(cName);
    const key = Object.keys(voterDemoMap.constituencies).find(k => norm(k) === target);
    return key ? voterDemoMap.constituencies[key] : { matching: 0, total: 0 };
  }, [voterDemoMap]);

  const getWardDemoData = useCallback((wNo) => {
    if (!voterDemoMap || !voterDemoMap.wards || !wNo) return { matching: 0, total: 0 };
    const target = String(wNo).trim().toLowerCase();
    const key = Object.keys(voterDemoMap.wards).find(k => String(k).trim().toLowerCase() === target);
    return key ? voterDemoMap.wards[key] : { matching: 0, total: 0 };
  }, [voterDemoMap]);

  const pinModeActiveRef = useRef(pinModeActive);
  useEffect(() => {
    pinModeActiveRef.current = pinModeActive;
  }, [pinModeActive]);

  // ── Ward Identity: fetch once when toggled on ──────────────────────────
  useEffect(() => {
    if (!identityMode) return;
    if (identityData) return;  // already loaded
    const token = localStorage.getItem('access_token');
    fetch('/api/v1/voters/demographics/ward-identity', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setIdentityData(d))
      .catch(err => console.error('[WardIdentity] fetch error:', err));
  }, [identityMode, identityData]);

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
    const info = findBoundariesForCoords(lat, lng);

    if (lockDistrict && normDistrict(info.district || '') !== normDistrict(lockDistrict)) {
      alert(`Location is outside your district boundary (${lockDistrict})!`);
      return;
    }
    if (lockConstituency && normConstit(info.constituency || '') !== normConstit(lockConstituency)) {
      alert(`Location is outside your constituency boundary (${lockConstituency})!`);
      return;
    }
    if (lockWard && info.ward !== lockWard) {
      alert(`Location is outside your mandal/ward boundary (Ward ${lockWard})!`);
      return;
    }

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 14, { animate: true });
    }
    if (campaignMode && onCampaignPinDrop) {
      onCampaignPinDrop({
        lat,
        lng,
        address: res.display_name,
        ...info
      });
      setSearchResults([]);
      setSearchQuery('');
      setPinModeActive(false);
      return;
    }
    setNewVolPin({
      lat,
      lng,
      address: res.display_name,
      ...info
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleCreateVolunteerRef = useRef(handleCreateVolunteer);
  useEffect(() => {
    handleCreateVolunteerRef.current = handleCreateVolunteer;
  }, [handleCreateVolunteer]);

  // Map Init
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;
    const L = require('leaflet');
    
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
  }, [mapRef]);

  // GeoJSON layer rendering
  useEffect(() => {
    if (!mapRef.current || !geojsonData) return;
    const L = require('leaflet');
    const map = mapRef.current;

    if (geojsonLayerRef.current) map.removeLayer(geojsonLayerRef.current);
    if (constitLayerRef.current) map.removeLayer(constitLayerRef.current);
    constitLayerRef.current = null;
    if (wardLayerRef.current) map.removeLayer(wardLayerRef.current);
    wardLayerRef.current = null;

    // 1. Draw district boundaries
    const filteredGeojson = lockDistrict
      ? {
          ...geojsonData,
          features: (geojsonData.features || []).filter(
            f => normDistrict(f.properties.dtname || '') === normDistrict(lockDistrict)
          )
        }
      : geojsonData;

    const layer = L.geoJSON(filteredGeojson, {
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

        const dcov = coverageMap[dt] || {};
        const dcNames = CONSTITUENCIES[dt] || [];

        if (filterActive && Object.keys(voterDemoMap).length > 0) {
          // Aggregate demographic ratio across all constituencies in this district
          const dcVoterData = dcNames.map(c => getDemoData(c)).filter(Boolean);
          const distTotal   = dcVoterData.reduce((s, d) => s + d.total,    0);
          const distMatch   = dcVoterData.reduce((s, d) => s + d.matching, 0);
          const ratio = distTotal ? distMatch / distTotal : 0;
          const covFill = ratio >= 0.6 ? '#22c55e' : ratio >= 0.3 ? '#f59e0b' : '#ef4444';
          if (hasSel) {
            return isSelected
              ? { color: '#1e40af', weight: 2.5, fillColor: 'transparent', fillOpacity: 0 }
              : { color: '#cbd5e1', weight: 1, fillColor: '#f1f5f9', fillOpacity: 0.05 };
          }
          return { color: '#1e40af', weight: 1.5, fillColor: covFill, fillOpacity: 0.65 };
        }

        const volsInDistrict = volunteers.filter(v => normDistrict(v.district || '') === normDistrict(dt));
        const completed = volsInDistrict.filter(v => v.task_status === 'completed').length;
        const totalTasks = volsInDistrict.filter(v => ['assigned', 'accepted', 'completed'].includes(v.task_status)).length;
        const taskRatio = totalTasks > 0 ? completed / totalTasks : 0;
        const covFill = taskRatio >= 0.8 ? '#22c55e' : taskRatio >= 0.3 ? '#f59e0b' : '#ef4444';

        if (hasSel) {
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

        if (!selectedDistrict && mode !== 'blended') {
          if (filterActive) {
            const dcVoterData = dcNames.map(c => getDemoData(c)).filter(Boolean);
            const distTotal   = dcVoterData.reduce((s, d) => s + d.total,    0);
            const distMatch   = dcVoterData.reduce((s, d) => s + d.matching, 0);
            const ratio = distTotal ? distMatch / distTotal : 0;
            lyr.bindTooltip(
              `<strong>${dt} Delhi</strong><br/>` +
              `<span style="color:#f59e0b;font-weight:800">🎯 Matching: ${distMatch.toLocaleString()} / ${distTotal.toLocaleString()} voters (${(ratio * 100).toFixed(0)}%)</span>`,
              { sticky: true }
            );
          } else {
            const volsInDistrict = volunteers.filter(v => normDistrict(v.district || '') === normDistrict(dt));
            const completed = volsInDistrict.filter(v => v.task_status === 'completed').length;
            const totalTasks = volsInDistrict.filter(v => ['assigned', 'accepted', 'completed'].includes(v.task_status)).length;
            const pct = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;
            lyr.bindTooltip(
              `<strong>${dt} Delhi</strong><br/>` +
              `Volunteers: ${volsInDistrict.length}<br/>` +
              `Task Completion: ${completed}/${totalTasks} (${pct.toFixed(0)}%)`,
              { sticky: true }
            );
          }
        }

        lyr.on({
          click: (e) => {
            L.DomEvent.stopPropagation(e);
              if (pinModeActiveRef.current) {
                const { lat, lng } = e.latlng;
                const info = findBoundariesForCoords(lat, lng);
                if (campaignMode && onCampaignPinDrop) {
                  onCampaignPinDrop({ lat, lng, address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, ...info });
                  setPinModeActive(false);
                  return;
                }
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

    // 2. Draw constituency boundaries
    let cLayer = null;
    if (selectedDistrict && constitsData) {
      const districtConstits = CONSTITUENCIES[selectedDistrict] || [];
      let featuresList = (constitsData.features || []).filter(f =>
        normDistrict(f.properties.district || '') === normDistrict(selectedDistrict)
      );
      if (lockConstituency) {
        featuresList = featuresList.filter(f => {
          const rawName = f.properties.AC_NAME || '';
          const matchedConstit = districtConstits.find(c => normConstit(c) === normConstit(rawName));
          const displayName = matchedConstit || rawName.replace(/\s*\(sc\)|\s*\(st\)/gi, '').trim();
          return normConstit(displayName) === normConstit(lockConstituency);
        });
      }
      const filteredFeatures = {
        type: 'FeatureCollection',
        features: featuresList
      };

      cLayer = L.geoJSON(filteredFeatures, {
        style: (feature) => {
          const rawName = feature.properties.AC_NAME || '';
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
            fillColor: (() => {
              const demoData = filterActive ? getDemoData(displayName) : null;
              if (demoData) {
                const { matching, total } = demoData;
                const r = total ? matching / total : 0;
                return r >= 0.6 ? '#22c55e' : r >= 0.3 ? '#f59e0b' : '#ef4444';
              }
              const volsInConstit = volunteers.filter(v =>
                normDistrict(v.district || '') === normDistrict(selectedDistrict) &&
                normConstit(v.constituency || '') === normConstit(displayName)
              );
              const completed = volsInConstit.filter(v => v.task_status === 'completed').length;
              const totalTasks = volsInConstit.filter(v => ['assigned', 'accepted', 'completed'].includes(v.task_status)).length;
              const taskRatio = totalTasks > 0 ? completed / totalTasks : 0;
              return taskRatio >= 0.8 ? '#22c55e' : taskRatio >= 0.3 ? '#f59e0b' : '#ef4444';
            })(),
            fillOpacity: isSelected ? 0.8 : 0.45
          };
        },
        onEachFeature: (feature, lyr) => {
          const rawName = feature.properties.AC_NAME || '';
          const matchedConstit = districtConstits.find(c => normConstit(c) === normConstit(rawName));
          const displayName = matchedConstit || rawName.replace(/\s*\(sc\)|\s*\(st\)/gi, '').trim();
          const isCovered = coverageMap[selectedDistrict]?.[displayName] || false;

          if (mode !== 'blended') {
            if (filterActive) {
              const demoData = getDemoData(displayName);
              if (demoData && demoData.total > 0) {
                const { matching, total } = demoData;
                const ratio = total ? matching / total : 0;
                lyr.bindTooltip(
                  `<strong>${displayName} Constituency</strong><br/>` +
                  `<span style="color:#f59e0b;font-weight:800">🎯 Matching: ${matching.toLocaleString()} / ${total.toLocaleString()} voters (${(ratio * 100).toFixed(0)}%)</span>`,
                  { sticky: true }
                );
              } else {
                lyr.bindTooltip(
                  `<strong>${displayName} Constituency</strong><br/>` +
                  `<span style="color:#f59e0b;font-weight:800">🎯 Matching: 0 / 0 voters (0%)</span>`,
                  { sticky: true }
                );
              }
            } else {
              const volsInConstit = volunteers.filter(v =>
                normDistrict(v.district || '') === normDistrict(selectedDistrict) &&
                normConstit(v.constituency || '') === normConstit(displayName)
              );
              const completed = volsInConstit.filter(v => v.task_status === 'completed').length;
              const totalTasks = volsInConstit.filter(v => ['assigned', 'accepted', 'completed'].includes(v.task_status)).length;
              const pct = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;
              lyr.bindTooltip(
                `<strong>${displayName} Constituency</strong><br/>` +
                `Volunteers: ${volsInConstit.length}<br/>` +
                `Task Completion: ${completed}/${totalTasks} (${pct.toFixed(0)}%)`,
                { sticky: true }
              );
            }
          }

          lyr.on({
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (pinModeActiveRef.current) {
                const { lat, lng } = e.latlng;
                const info = findBoundariesForCoords(lat, lng);
                if (campaignMode && onCampaignPinDrop) {
                  onCampaignPinDrop({ lat, lng, address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, ...info });
                  setPinModeActive(false);
                  return;
                }
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

    // 3. Draw ward boundaries
    let wLayer = null;
    if (selectedConstit && wardsData && wardToConstit.length) {
      const activeWardIds = new Set(
        wardToConstit
          .filter(w => normConstit(w.Constituency) === normConstit(selectedConstit))
          .map(w => w.Ward_No)
      );

      let featuresList = (wardsData.features || []).filter(f => activeWardIds.has(f.properties.Ward_No));
      if (lockWard) {
        featuresList = featuresList.filter(f => f.properties.Ward_No === lockWard);
      }
      const filteredWardFeatures = {
        type: 'FeatureCollection',
        features: featuresList
      };

      wLayer = L.geoJSON(filteredWardFeatures, {
        style: (feature) => {
          const isSelected = String(selectedWard) === String(feature.properties.Ward_No);
          const wNo = feature.properties.Ward_No || '';
          const mapping = wardToConstit.find(w => String(w.Ward_No) === String(wNo));
          const constName = mapping ? mapping.Constituency : '';
          const demoData = filterActive ? getWardDemoData(wNo) : null;

          let fillCol = '#ef4444';
          if (demoData) {
            const { matching, total } = demoData;
            const r = total ? matching / total : 0;
            fillCol = r >= 0.6 ? '#22c55e' : r >= 0.3 ? '#f59e0b' : '#ef4444';
          } else {
            const volsInWard = volunteers.filter(v => 
              v.lat && v.lng && isPointInGeometry(v.lng, v.lat, feature.geometry)
            );
            const completed = volsInWard.filter(v => v.task_status === 'completed').length;
            const totalTasks = volsInWard.filter(v => ['assigned', 'accepted', 'completed'].includes(v.task_status)).length;
            const taskRatio = totalTasks > 0 ? completed / totalTasks : 0;
            fillCol = taskRatio >= 0.8 ? '#22c55e' : taskRatio >= 0.3 ? '#f59e0b' : '#ef4444';
          }

          return {
            color: isSelected ? saffron : '#4f46e5',
            weight: isSelected ? 3 : 1.5,
            dashArray: '4, 4',
            fillColor: fillCol,
            fillOpacity: isSelected ? 0.5 : 0.3
          };
        },
        onEachFeature: (feature, lyr) => {
          const wName = feature.properties.Ward_Name || '';
          const wNo = feature.properties.Ward_No || '';
          
          if (filterActive) {
            const demoData = getWardDemoData(wNo);
            if (demoData && demoData.total > 0) {
              const { matching, total } = demoData;
              const ratio = total ? matching / total : 0;
              lyr.bindTooltip(
                `<strong>Ward: ${wName} (${wNo})</strong><br/>` +
                `<span style="color:#f59e0b;font-weight:800">🎯 Matching: ${matching.toLocaleString()} / ${total.toLocaleString()} voters (${(ratio * 100).toFixed(0)}%)</span>`,
                { sticky: true }
              );
            } else {
              lyr.bindTooltip(
                `<strong>Ward: ${wName} (${wNo})</strong><br/>` +
                `<span style="color:#f59e0b;font-weight:800">🎯 Matching: 0 / 0 voters (0%)</span>`,
                { sticky: true }
              );
            }
          } else {
            const volsInWard = volunteers.filter(v => 
              v.lat && v.lng && isPointInGeometry(v.lng, v.lat, feature.geometry)
            );
            const unassignedCount = volsInWard.filter(v => v.task_status === 'unassigned').length;
            const assignedCount = volsInWard.filter(v => v.task_status === 'assigned').length;
            const acceptedCount = volsInWard.filter(v => v.task_status === 'accepted').length;
            const completedCount = volsInWard.filter(v => v.task_status === 'completed').length;
            const totalTasks = assignedCount + acceptedCount + completedCount;
            const pct = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
            lyr.bindTooltip(
              `<strong>Ward: ${wName} (${wNo})</strong><br/>` +
              `Volunteers: ${volsInWard.length}<br/>` +
              `Task Completion: ${completedCount}/${totalTasks} (${pct.toFixed(0)}%)<br/>` +
              `<span style="color:#64748b">●</span> Unassigned: ${unassignedCount}<br/>` +
              `<span style="color:#d1d5db;text-shadow:0 0 2px #000">●</span> Assigned: ${assignedCount}<br/>` +
              `<span style="color:#3b82f6">●</span> Accepted: ${acceptedCount}<br/>` +
              `<span style="color:#22c55e">●</span> Completed: ${completedCount}`,
              { sticky: true }
            );
          }

          lyr.on({
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (pinModeActiveRef.current) {
                const { lat, lng } = e.latlng;
                const info = findBoundariesForCoords(lat, lng);
                if (campaignMode && onCampaignPinDrop) {
                  onCampaignPinDrop({ lat, lng, address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, ...info });
                  setPinModeActive(false);
                  return;
                }
                setNewVolPin({ lat, lng, address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, ...info });
                setPinModeActive(false);
                return;
              }
              if (lockWard && String(lockWard) !== String(wNo)) return;
              setSelectedWard(wNo);
            },
            mouseover: (e) => {
              const isSelected = String(selectedWard) === String(wNo);
              e.target.setStyle({ fillOpacity: 0.3, weight: isSelected ? 3.5 : 2.5 });
            },
            mouseout: (e) => {
              const isSelected = String(selectedWard) === String(wNo);
              e.target.setStyle({ fillOpacity: isSelected ? 0.3 : 0.1, weight: isSelected ? 3 : 1.5 });
            }
          });
        }
      }).addTo(map);

      wardLayerRef.current = wLayer;
    }

    // Centering Map view
    if (!selectedDistrict) {
      map.setView([28.6139, 77.2090], 11);
    } else {
      let zoomed = false;
      if (selectedWard && wLayer) {
        wLayer.eachLayer(l => {
          if (String(l.feature?.properties?.Ward_No) === String(selectedWard)) {
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

    // Apply dynamic maxBounds for locked roles to restrict panning/zooming out of the allowed area
    if (lockWard && wLayer) {
      wLayer.eachLayer(l => {
        if (l.feature?.properties?.Ward_No === lockWard) {
          map.setMaxBounds(l.getBounds());
        }
      });
    } else if (lockConstituency && cLayer) {
      cLayer.eachLayer(l => {
        const rawName = l.feature?.properties?.AC_NAME || '';
        if (normConstit(lockConstituency) === normConstit(rawName)) {
          map.setMaxBounds(l.getBounds());
        }
      });
    } else if (lockDistrict && layer) {
      layer.eachLayer(l => {
        if (l.feature?.properties?.dtname === lockDistrict) {
          map.setMaxBounds(l.getBounds());
        }
      });
    }

    map.off('click');
    map.on('click', (e) => {
      if (pinModeActiveRef.current) {
        const { lat, lng } = e.latlng;
        const info = findBoundariesForCoords(lat, lng);
        if (lockDistrict && normDistrict(info.district || '') !== normDistrict(lockDistrict)) {
          alert(`Cannot place pin outside your district (${lockDistrict})!`);
          return;
        }
        if (lockConstituency && normConstit(info.constituency || '') !== normConstit(lockConstituency)) {
          alert(`Cannot place pin outside your constituency (${lockConstituency})!`);
          return;
        }
        if (lockWard && info.ward !== lockWard) {
          alert(`Cannot place pin outside your ward (Ward ${lockWard})!`);
          return;
        }
        if (campaignMode && onCampaignPinDrop) {
          onCampaignPinDrop({ lat, lng, address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, ...info });
          setPinModeActive(false);
          return;
        }
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
  }, [geojsonData, constitsData, wardsData, wardToConstit, volunteers, selectedDistrict, selectedConstit, selectedWard, coverageMap, lockDistrict, lockConstituency, lockWard, mode, campaignMode, onCampaignPinDrop, findBoundariesForCoords, mapRef, voterDemoMap, filterActive]);

  // Temp pin markerpopup
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
  }, [newVolPin, selectedDistrict, selectedConstit, setNewVolPin]);

  // Volunteer markers
  useEffect(() => {
    if (!mapRef.current) return;
    const L = require('leaflet');
    const map = mapRef.current;
    volLayerRef.current.forEach(m => map.removeLayer(m));
    volLayerRef.current = [];

    if (mode === 'blended' || filterActive || identityMode) return;

    volunteers.forEach(v => {
      if (!v.lat || !v.lng) return;

      if (lockDistrict && v.district !== lockDistrict) return;
      if (lockConstituency && v.constituency !== lockConstituency) return;
      if (lockWard && wardsData) {
        const wardFeature = (wardsData.features || []).find(f => f.properties.Ward_No === lockWard);
        if (wardFeature && !isPointInGeometry(v.lng, v.lat, wardFeature.geometry)) {
          return;
        }
      }

      if (selectedDistrict && v.district !== selectedDistrict) return;
      if (selectedConstit && v.constituency !== selectedConstit) return;
      if (selectedWard && wardsData) {
        const wardFeature = (wardsData.features || []).find(f => f.properties.Ward_No === selectedWard);
        if (wardFeature && !isPointInGeometry(v.lng, v.lat, wardFeature.geometry)) {
          return;
        }
      }
      
      const taskStatus = v.task_status || 'unassigned';
      const color = taskStatus === 'completed' ? '#22c55e'
                  : taskStatus === 'accepted'  ? '#3b82f6'
                  : taskStatus === 'assigned'  ? '#ffffff'
                  : '#9ca3af';
      
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
      });
      marker.addTo(map);
      volLayerRef.current.push(marker);
    });
  }, [volunteers, mode, lockDistrict, lockConstituency, lockWard, selectedDistrict, selectedConstit, selectedWard, wardsData, setSelectedVol, mapRef, filterActive, identityMode]);

  // Campaign markers
  const campaignLayerRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current) return;
    const L = require('leaflet');
    const map = mapRef.current;

    if (campaignLayerRef.current) {
      map.removeLayer(campaignLayerRef.current);
      campaignLayerRef.current = null;
    }

    if (showCampaigns && activeCampaigns && activeCampaigns.length > 0) {
      const markers = activeCampaigns.map(c => {
        if (!c.lat || !c.lng) return null;
        const icon = L.divIcon({
          className: 'camp-campaign-icon',
          html: `<div style="width:32px;height:32px;border-radius:50%;background:#D4A843;border:3px solid #04122e;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;animation:camp-pulse 2s infinite">🎯</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const marker = L.marker([c.lat, c.lng], { icon });
        marker.bindPopup(`
          <div style="min-width:180px;font-family:sans-serif;font-size:12px;line-height:1.5">
            <b style="font-size:13px;color:#04122e">${c.title}</b><br/>
            <span style="color:#6b7280">${c.description || ''}</span><br/>
            <span style="color:#D4A843;font-weight:700">● Active Campaign</span><br/>
            <span style="color:#9ca3af;font-size:10px">By ${c.created_by_name || 'Unknown'} · ${new Date(c.created_at).toLocaleDateString()}</span>
          </div>
        `);
        return marker;
      }).filter(Boolean);

      if (markers.length > 0) {
        const layer = L.layerGroup(markers);
        layer.addTo(map);
        campaignLayerRef.current = layer;
      }
    }
  }, [activeCampaigns, campaignMode, mapRef, showCampaigns]);

  // Heatmap for Blended Mode
  useEffect(() => {
    if (!mapRef.current) return;
    const L = require('leaflet');
    require('leaflet.heat');
    const map = mapRef.current;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (mode === 'blended' && !identityMode) {
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
            0.2: 'rgba(59, 130, 246, 0.4)',
            0.4: 'rgba(168, 85, 247, 0.6)',
            0.7: 'rgba(249, 115, 22, 0.85)',
            1.0: 'rgba(239, 68, 68, 0.95)'
          }
        }).addTo(map);
        heatLayerRef.current = heatLayer;
      }
    }
  }, [volunteers, mode, mapRef, identityMode]);

  // ── Ward Identity layer rendering ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !wardsData) return;
    const L = require('leaflet');
    const map = mapRef.current;

    // Remove existing identity layer
    if (identityLayerRef.current) {
      map.removeLayer(identityLayerRef.current);
      identityLayerRef.current = null;
    }

    if (!identityMode || !identityData || !identityData.wards) return;

    const { wards, palette } = identityData;

    const layer = L.geoJSON(wardsData, {
      filter: (feature) => {
        if (!feature.properties || !feature.properties.Ward_No || !feature.properties.Ward_Name) return false;
        const wNo = String(feature.properties.Ward_No);
        if (lockWard && String(wNo) !== String(lockWard)) return false;
        if (wardToConstit && wardToConstit.length) {
          const mapping = wardToConstit.find(w => String(w.Ward_No) === String(wNo));
          if (!mapping) return false;
          if (lockConstituency && normConstit(mapping.Constituency) !== normConstit(lockConstituency)) return false;
          if (lockDistrict) {
            const allowed = CONSTITUENCIES[lockDistrict] || [];
            if (!allowed.some(c => normConstit(c) === normConstit(mapping.Constituency))) return false;
          }
        }
        return true;
      },
      style: (feature) => {
        const wNo = String(feature.properties.Ward_No || '');
        const info = wards[wNo];
        const color = info ? (palette[info.identity_value] || '#94a3b8') : '#e2e8f0';
        return {
          fillColor: color,
          fillOpacity: info ? 0.72 : 0.15,
          color: '#ffffff',
          weight: 0.8,
          opacity: 0.9,
        };
      },
      onEachFeature: (feature, lyr) => {
        const wNo   = String(feature.properties.Ward_No || '');
        const wName = feature.properties.Ward_Name || wNo;
        const info  = wards[wNo];
        if (info) {
          const fieldLabel = identityData.field_labels?.[info.identity_field] || info.identity_field;
          lyr.bindTooltip(
            `<strong>Ward ${wNo} — ${wName}</strong><br/>` +
            `<span style="color:#475569;font-size:10px">${fieldLabel}</span><br/>` +
            `<strong>${info.identity_value}</strong><br/>` +
            `Ward: <strong>${info.ward_pct}%</strong> &nbsp;|&nbsp; ` +
            `Delhi avg: ${info.city_avg_pct}% &nbsp;|&nbsp; ` +
            `<strong style="color:#16a34a">+${info.deviation}pp</strong><br/>` +
            `<small>${info.total_voters.toLocaleString()} voters</small>`,
            { sticky: true, className: 'ward-identity-tooltip' }
          );
          lyr.on('click', () => {
            if (lyr.getBounds) {
              map.fitBounds(lyr.getBounds(), { maxZoom: 14, animate: true });
            }
            setClickedWardIdentity({
              wNo,
              wName,
              ...info
            });
          });
        } else {
          lyr.bindTooltip(
            `<strong>Ward ${wNo} — ${wName}</strong><br/><em>No identity data</em>`,
            { sticky: true }
          );
        }
      },
    }).addTo(map);

    identityLayerRef.current = layer;

    if (lockDistrict || lockConstituency || lockWard) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
        map.setMaxBounds(bounds);
      }
    }
  }, [identityMode, identityData, wardsData, mapRef, lockWard, lockConstituency, lockDistrict, wardToConstit, CONSTITUENCIES]);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: navy, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {selectedDistrict ? `${selectedDistrict} District — Boundary Mapper` : 'Delhi NCT — Boundary Mapper'}
          </span>
          <span style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>
            {selectedDistrict ? `${selectedConstit || 'All constituencies'}` : 'Click on district boundary polygons to zoom and view volunteers'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Filter active: pills + matching count + clear */}
          {filterActive && activeFilters && (
            <>
              {filterTags.map(tag => (
                <span key={tag} style={{
                  padding: '4px 9px', fontSize: 10, fontWeight: 800,
                  background: '#f1f5f9', color: navy, borderRadius: 4,
                  border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center',
                  whiteSpace: 'nowrap',
                }}>
                  {tag}
                </span>
              ))}
              {filterSummary && (
                <span style={{
                  padding: '4px 9px', fontSize: 10, fontWeight: 800,
                  background: '#fefce8', color: '#92400e',
                  border: '1px solid #fde68a', borderRadius: 4,
                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                  {filterSummary.total_matching?.toLocaleString()} matching voters
                  {filterSummary.is_simulated ? ' (demo)' : ''}
                </span>
              )}
              <button
                onClick={onClearFilter}
                style={{
                  padding: '4px 9px', fontSize: 10, fontWeight: 900,
                  background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2',
                  borderRadius: 4, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: 3, whiteSpace: 'nowrap', transition: 'all 0.1s ease',
                }}
              >
                ✕ Clear
              </button>
            </>
          )}
          <button
            onClick={() => setFilterDrawerOpen(true)}
            style={{
              padding: '6px 12px', fontSize: '11px', fontWeight: '800', borderRadius: 4,
              border: filterActive ? `2px solid ${saffron}` : '1px solid #cbd5e1',
              cursor: 'pointer',
              background: filterActive ? '#fefce8' : '#ffffff',
              color: filterActive ? navy : '#64748b',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            🎯 {filterActive ? 'Filter ON' : 'Filter'}
          </button>
          <button
            onClick={() => setShowCampaigns(p => !p)}
            style={{
              padding: '6px 12px', fontSize: '11px', fontWeight: '800', borderRadius: 4,
              border: showCampaigns ? `2px solid ${saffron}` : '1px solid #cbd5e1',
              cursor: 'pointer',
              background: showCampaigns ? '#fefce8' : '#ffffff',
              color: showCampaigns ? navy : '#64748b',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            📢 {showCampaigns ? 'Campaigns ON' : 'Show Campaigns'}
          </button>
          <button
            onClick={() => setIdentityMode(p => !p)}
            style={{
              padding: '6px 12px', fontSize: '11px', fontWeight: '800', borderRadius: 4,
              border: identityMode ? '2px solid #6366f1' : '1px solid #cbd5e1',
              cursor: 'pointer',
              background: identityMode ? '#eef2ff' : '#ffffff',
              color: identityMode ? '#4338ca' : '#64748b',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            🧠 {identityMode ? 'Identity ON' : 'Ward Identity'}
          </button>
          <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 8px', background: '#e2e8f0', color: '#475569', borderRadius: 2 }}>DELHI_NCT</span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 960 }}>
        <div id="leaflet-map" ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 960, cursor: pinModeActive ? 'crosshair' : 'grab' }} />

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

          <button 
            onClick={() => setPinModeActive(p => !p)}
            style={{
              padding: '8px 10px', fontSize: '11px', fontWeight: '800', borderRadius: 4, border: 'none', cursor: 'pointer',
              background: pinModeActive ? '#ef4444' : saffron,
              color: pinModeActive ? 'white' : navy,
              transition: 'all 0.15s ease'
            }}
          >
            {pinModeActive
              ? '🔴 Cancel Placement (Click Map)'
              : campaignMode
                ? '📍 Drop Pin to Start Campaign'
                : '📍 Drop Pin on Map to Deploy'}
          </button>
        </div>

        {/* ── Ward Identity Legend / Coverage Legend swap ── */}
        {identityMode && identityData && identityData.palette ? (
          <div style={{
            position: 'absolute', bottom: 20, left: 20,
            background: '#ffffff', border: '1px solid #e2e8f0',
            padding: '12px 16px', zIndex: 1000, borderRadius: 4,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column', gap: 6,
            maxHeight: 340, overflowY: 'auto', minWidth: 200,
          }}>
            <span style={{ fontSize: '10px', fontWeight: '900', color: navy, letterSpacing: '0.08em', marginBottom: 2 }}>WARD IDENTITY</span>
            <span style={{ fontSize: '9px', color: '#64748b', marginBottom: 4 }}>Strongest demographic deviation from Delhi avg</span>
            {Object.entries(identityData.palette)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([val, color]) => (
                <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '10px', fontWeight: '700', color: '#374151' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
                  {val}
                </div>
              ))
            }
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default CampaignMap;
