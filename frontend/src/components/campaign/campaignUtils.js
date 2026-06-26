import {
  DELHI_DISTRICTS,
  CONSTITUENCIES_OLD,
  CONSTITUENCIES_NEW,
  DISTRICT_CENTERS,
  normDistrict,
  normConstit,
  getDistrictFromEmail,
} from '../../constants/constituencies';

export {
  DELHI_DISTRICTS,
  CONSTITUENCIES_OLD,
  CONSTITUENCIES_NEW,
  DISTRICT_CENTERS,
  normDistrict,
  normConstit,
  getDistrictFromEmail,
};

export const pointInPolygon = (x, y, poly) => {
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
    const r = await fetch(`${API}/campaign/volunteers?${params}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.volunteers;
  } catch { return null; }
};

export const fetchCoverage = async (district, mode) => {
  try {
    const params = new URLSearchParams({ mode: mode || 'new' });
    if (district) params.append('district', district);
    const r = await fetch(`${API}/campaign/coverage?${params}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.coverage;
  } catch { return null; }
};

export const fetchSummary = async (mode) => {
  try {
    const r = await fetch(`${API}/campaign/summary?mode=${mode || 'new'}`);
    if (!r.ok) return null;
    return (await r.json()).summary;
  } catch { return null; }
};

export const apiMarkCovered = async (volunteerId, mode) => {
  try {
    await fetch(`${API}/campaign/volunteers/${volunteerId}/mark-covered?mode=${mode || 'new'}`, { method: 'PATCH' });
  } catch {}
};

export const apiMarkAllCovered = async (district, coveredBy, mode) => {
  try {
    await fetch(`${API}/campaign/coverage/mark-all/${encodeURIComponent(district)}?covered_by=${encodeURIComponent(coveredBy || 'Admin')}&mode=${mode || 'new'}`, { method: 'POST' });
  } catch {}
};

export const apiUpdateLocation = async (volunteerId, lat, lng) => {
  try {
    await fetch(`${API}/campaign/volunteers/${volunteerId}/location?lat=${lat}&lng=${lng}`, { method: 'PATCH' });
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

export const normUserGeo = (s) => (s || '').toLowerCase().replace(/^c-/, '').replace(/[\s\-\._]/g, '');

export const getDisplayDistrict = (districtId) => {
  if (!districtId) return null;
  return DELHI_DISTRICTS.find(d => normUserGeo(d) === normUserGeo(districtId)) || null;
};

export const getDisplayConstituency = (districtName, constituencyId) => {
  if (!districtName || !constituencyId) return '';
  const list = [...(CONSTITUENCIES_NEW[districtName] || []), ...(CONSTITUENCIES_OLD[districtName] || [])];
  return list.find(c => normUserGeo(c) === normUserGeo(constituencyId)) || '';
};
