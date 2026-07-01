import {
  DELHI_DISTRICTS,
  CONSTITUENCIES_OLD,
  CONSTITUENCIES_NEW,
  normDistrict,
  normConstit,
} from '../../constants/constituencies';

export {
  DELHI_DISTRICTS,
  CONSTITUENCIES_OLD,
  CONSTITUENCIES_NEW,
  normDistrict,
  normConstit,
};

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

export const isPointInGeometry = (lng, lat, geom) => {
  if (!geom) return false;
  const coords = geom.coordinates;
  if (geom.type === 'Polygon') {
    return pointInPolygon(lng, lat, coords[0]);
  } else if (geom.type === 'MultiPolygon') {
    return coords.some(poly => pointInPolygon(lng, lat, poly[0]));
  }
  return false;
};

const API = '/api/v1';

export const fetchVolunteers = async (district, constituency, mode) => {
  try {
    const params = new URLSearchParams({ mode: mode || 'new' });
    if (district) params.append('district', district);
    if (constituency) params.append('constituency', constituency);
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    const r = await fetch(`${API}/campaign/volunteers?${params}`, { headers });
    if (!r.ok) return null;
    const j = await r.json();
    return j.volunteers;
  } catch { return null; }
};

export const fetchCoverage = async (district, mode) => {
  try {
    const params = new URLSearchParams({ mode: mode || 'new' });
    if (district) params.append('district', district);
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    const r = await fetch(`${API}/campaign/coverage?${params}`, { headers });
    if (!r.ok) return null;
    const j = await r.json();
    return j.coverage;
  } catch { return null; }
};

export const fetchSummary = async (mode) => {
  try {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    const r = await fetch(`${API}/campaign/summary?mode=${mode || 'new'}`, { headers });
    if (!r.ok) return null;
    return (await r.json()).summary;
  } catch { return null; }
};

export const apiMarkCovered = async (volunteerId, mode) => {
  try {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    await fetch(`${API}/campaign/volunteers/${volunteerId}/mark-covered?mode=${mode || 'new'}`, { method: 'PATCH', headers });
  } catch {}
};

export const apiMarkAllCovered = async (district, coveredBy, mode) => {
  try {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    await fetch(`${API}/campaign/coverage/mark-all/${encodeURIComponent(district)}?covered_by=${encodeURIComponent(coveredBy || 'Admin')}&mode=${mode || 'new'}`, { method: 'POST', headers });
  } catch {}
};

export const apiUpdateLocation = async (volunteerId, lat, lng) => {
  try {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    await fetch(`${API}/campaign/volunteers/${volunteerId}/location?lat=${lat}&lng=${lng}`, { method: 'PATCH', headers });
  } catch {}
};

export const buildCovMap = (coverageArr) => {
  const m = {};
  (coverageArr || []).forEach(c => {
    if (!m[c.district]) m[c.district] = {};
    m[c.district][c.constituency] = c.covered;
  });
  return m;
};

const normUserGeo = (s) => (s || '').toLowerCase().replace(/^c-/, '').replace(/[\s\-\._]/g, '');

const DISTRICT_MAP = {
  'CD': 'Central',
  'ED': 'East',
  'ND': 'New Delhi',
  'N':  'North',
  'NE': 'North East',
  'NW': 'North West',
  'SH': 'Shahdara',
  'S':  'South',
  'SE': 'South East',
  'SW': 'South West',
  'W':  'West'
};

export const getDisplayDistrict = (districtId) => {
  if (!districtId) return null;
  const mapped = DISTRICT_MAP[districtId.toUpperCase()];
  if (mapped) return mapped;
  return DELHI_DISTRICTS.find(d => normUserGeo(d) === normUserGeo(districtId)) || null;
};

export const getDisplayConstituency = (districtName, constituencyId) => {
  if (!districtName || !constituencyId) return '';
  const list = [...(CONSTITUENCIES_NEW[districtName] || []), ...(CONSTITUENCIES_OLD[districtName] || [])];
  
  // 1. Exact or normalised match
  let found = list.find(c => normUserGeo(c) === normUserGeo(constituencyId));
  if (found) return found;

  // 2. Initial letters / abbreviation match (e.g., "KRN" for "Krishna Nagar")
  const normId = normUserGeo(constituencyId);
  found = list.find(c => {
    const words = c.toLowerCase().split(/[\s\-]+/);
    const initials = words.map(w => w[0]).join('');
    if (initials === normId) return true;
    
    const normC = normUserGeo(c);
    if (normC.startsWith(normId)) return true;

    // Check subsequence
    let idIdx = 0;
    for (let char of normC) {
      if (char === normId[idIdx]) {
        idIdx++;
        if (idIdx === normId.length) return true;
      }
    }
    return false;
  });
  
  return found || '';
};
