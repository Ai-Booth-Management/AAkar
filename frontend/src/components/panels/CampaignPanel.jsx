'use client';
/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import 'leaflet/dist/leaflet.css';

import {
  DELHI_DISTRICTS,
  CONSTITUENCIES_NEW,
  CONSTITUENCIES_OLD,
  normConstit,
  getDisplayDistrict,
  getDisplayConstituency,
  fetchVolunteers,
  fetchCoverage,
  fetchSummary,
  apiMarkCovered,
  apiMarkAllCovered,
  apiUpdateLocation,
  buildCovMap,
  isPointInGeometry
} from '../campaign/campaignUtils';

import CampaignStats from '../campaign/CampaignStats';
import DistrictSelector from '../campaign/DistrictSelector';
import ConstituencyFilter from '../campaign/ConstituencyFilter';
import WardSelector from '../campaign/WardSelector';
import VolunteerList from '../campaign/VolunteerList';
import CoverageTable from '../campaign/CoverageTable';
import CampaignMap from '../campaign/CampaignMap';
import CampaignCreator from '../campaign/CampaignCreator';

const API = '/api/v1';

const CampaignPanel = () => {
  const navy = '#04122e';
  const saffron = '#D4A843';
  const { currentUser } = useAuth();
  const mapRef = useRef(null);

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
  const [coverageMap,        setCoverageMap]        = useState({});
  const [summary,            setSummary]            = useState({});
  const [simulateLive,       setSimulateLive]       = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [activeTab,          setActiveTab]          = useState('volunteers'); // 'volunteers' | 'coverage' | 'analytics'
  const [newTaskText,        setNewTaskText]        = useState('');
  const [newTaskStatus,      setNewTaskStatus]      = useState('unassigned');

  const [pinModeActive,      setPinModeActive]      = useState(false);
  const [newVolPin,          setNewVolPin]          = useState(null);
  const [campaignMode,       setCampaignMode]       = useState(false);
  const [campaignPin,        setCampaignPin]        = useState(null);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);
  const [activeCampaigns,    setActiveCampaigns]    = useState([]);
  const [campaignsLoaded,    setCampaignsLoaded]    = useState(false);

  const CONSTITUENCIES = mode === 'new' || mode === 'blended' || mode === 'abs' ? CONSTITUENCIES_NEW : CONSTITUENCIES_OLD;

  // Load GeoJSON
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

  // URL Sync
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

  // Load coverage + summary
  const loadCoverage = useCallback(async () => {
    const apiMode = mode === 'blended' ? 'new' : mode;
    const [covArr, sumObj] = await Promise.all([fetchCoverage(null, apiMode), fetchSummary(apiMode)]);
    if (covArr)  setCoverageMap(buildCovMap(covArr));
    if (sumObj)  setSummary(sumObj);
  }, [mode]);

  useEffect(() => { loadCoverage(); }, [loadCoverage]);

  // Load volunteers
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

  // Live simulation
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

  // Volunteer selection callback
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
    setSelectedWard('');
  };

  const handleCreateVolunteer = async (body) => {
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
      } else {
        alert("Failed to save volunteer. Please check inputs.");
      }
    } catch (err) {
      console.error("Failed to save volunteer:", err);
    }
  };

  // Load active campaigns (scoped to user's area)
  const loadActiveCampaigns = useCallback(async () => {
    try {
      const r = await fetch(`${API}/campaign/campaigns/active`);
      if (r.ok) {
        const data = await r.json();
        setActiveCampaigns(data.campaigns || []);
      }
    } catch {}
    setCampaignsLoaded(true);
  }, []);

  useEffect(() => {
    if (campaignsLoaded) return;
    loadActiveCampaigns();
  }, [campaignsLoaded, loadActiveCampaigns]);

  const handleCampaignPinDrop = useCallback((location) => {
    setCampaignPin(location);
    setShowCampaignCreator(true);
  }, []);

  const handleCampaignCreated = useCallback((campaign) => {
    setActiveCampaigns(prev => [campaign, ...prev]);
    setCampaignMode(false);
    setPinModeActive(false);
    setNewVolPin(null);
    setCampaignPin(null);
    setCampaignsLoaded(false);
  }, []);

  // Stats derivations
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

      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: navy, fontSize: '22px', fontWeight: '900', letterSpacing: '-0.03em' }}>
            🗳️ Campaign Management
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            {userRole === 'DM'
              ? `DM — ${lockDistrict} District`
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
            <button onClick={() => { setSelectedDistrict(null); setSelectedConstit(''); setSelectedWard(''); }}
              style={{
                padding: '8px 16px', fontSize: '12px', fontWeight: '800', borderRadius: 4, border: 'none', cursor: 'pointer',
                background: navy, color: 'white', transition: 'all 0.15s ease'
              }}>
              ← All Districts
            </button>
          )}
          <button
            onClick={() => {
              setCampaignMode(p => !p);
              if (!campaignMode) {
                setPinModeActive(true);
              } else {
                setPinModeActive(false);
                setNewVolPin(null);
                setCampaignPin(null);
              }
            }}
            style={{
              padding: '8px 16px', fontSize: '12px', fontWeight: '800', borderRadius: 4, border: 'none', cursor: 'pointer',
              background: campaignMode ? '#ef4444' : '#D4A843',
              color: campaignMode ? 'white' : navy,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            🎯 {campaignMode ? 'Cancel Campaign' : 'Launch Campaign'}
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <CampaignStats
        selectedDistrict={selectedDistrict}
        volunteers={volunteers}
        delhiStats={delhiStats}
        activeVols={activeVols}
        pctVols={pctVols}
        coveredVols={coveredVols}
        constitCovered={constitCovered}
        constitNames={constitNames}
        DELHI_DISTRICTS={DELHI_DISTRICTS}
      />

      {/* Workspace columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24, minHeight: 480 }}>
        {/* Map Column */}
        <CampaignMap
          mode={mode}
          geojsonData={geojsonData}
          constitsData={constitsData}
          boundaryData={boundaryData}
          wardsData={wardsData}
          wardToConstit={wardToConstit}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
          selectedConstit={selectedConstit}
          setSelectedConstit={setSelectedConstit}
          selectedWard={selectedWard}
          setSelectedWard={setSelectedWard}
          volunteers={volunteers}
          setSelectedVol={setSelectedVol}
          coverageMap={coverageMap}
          lockDistrict={lockDistrict}
          lockConstituency={lockConstituency}
          lockWard={lockWard}
          pinModeActive={pinModeActive}
          setPinModeActive={setPinModeActive}
          newVolPin={newVolPin}
          setNewVolPin={setNewVolPin}
          handleCreateVolunteer={handleCreateVolunteer}
          campaignMode={campaignMode}
          onCampaignPinDrop={handleCampaignPinDrop}
          activeCampaigns={activeCampaigns}
          mapRef={mapRef}
        />

        {/* Sidebar Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Selectors */}
          <DistrictSelector
            selectedDistrict={selectedDistrict}
            handleDistrictClick={handleDistrictClick}
            lockDistrict={lockDistrict}
            coverageMap={coverageMap}
            DELHI_DISTRICTS={DELHI_DISTRICTS}
            CONSTITUENCIES={CONSTITUENCIES}
            constitCovered={constitCovered}
            constitNames={constitNames}
          />

          <ConstituencyFilter
            selectedDistrict={selectedDistrict}
            selectedConstit={selectedConstit}
            setSelectedConstit={setSelectedConstit}
            setSelectedWard={setSelectedWard}
            lockConstituency={lockConstituency}
            constitNames={constitNames}
            distCov={distCov}
          />

          <WardSelector
            selectedDistrict={selectedDistrict}
            selectedConstit={selectedConstit}
            selectedWard={selectedWard}
            setSelectedWard={setSelectedWard}
            lockWard={lockWard}
            wardToConstit={wardToConstit}
            volunteers={volunteers}
            wardsData={wardsData}
          />

          {/* List and Tables Tabs */}
          <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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

            <div style={{ maxHeight: 380, overflowY: 'auto', padding: 16 }}>
              {activeTab === 'volunteers' && (
                <VolunteerList
                  selectedVol={selectedVol}
                  setSelectedVol={setSelectedVol}
                  newTaskText={newTaskText}
                  setNewTaskText={setNewTaskText}
                  newTaskStatus={newTaskStatus}
                  setNewTaskStatus={setNewTaskStatus}
                  handleSaveTask={handleSaveTask}
                  loading={loading}
                  filteredVolunteersList={filteredVolunteersList}
                  newVolPin={newVolPin}
                  setNewVolPin={setNewVolPin}
                  handleMarkCovered={handleMarkCovered}
                  mapRef={mapRef}
                />
              )}

              {activeTab === 'coverage' && (
                <CoverageTable
                  selectedDistrict={selectedDistrict}
                  handleDistrictClick={handleDistrictClick}
                  handleMarkAllCovered={handleMarkAllCovered}
                  constitNames={constitNames}
                  distCov={distCov}
                  coverageMap={coverageMap}
                  DELHI_DISTRICTS={DELHI_DISTRICTS}
                  CONSTITUENCIES={CONSTITUENCIES}
                />
              )}

              {activeTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
                    Campaign Density Analytics
                  </div>
                  
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

      {/* Campaign Creator Modal */}
      <CampaignCreator
        isOpen={showCampaignCreator}
        onClose={() => { setShowCampaignCreator(false); setCampaignMode(false); setPinModeActive(false); setCampaignPin(null); }}
        selectedLocation={campaignPin}
        onCampaignCreated={handleCampaignCreated}
        selectedDistrict={selectedDistrict}
        selectedConstit={selectedConstit}
      />
    </div>
  );
};

export default CampaignPanel;
