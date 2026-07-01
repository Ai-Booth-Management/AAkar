/**
 * constants/constituencies.js
 *
 * SINGLE SOURCE OF TRUTH for Delhi geographic data used across CampaignPanel,
 * MapPanel, and any future component that needs district/constituency mappings.
 *
 * Import what you need:
 *   import {
 *     DELHI_DISTRICTS,
 *     CONSTITUENCIES_NEW,
 *     CONSTITUENCIES_OLD,
 *     DISTRICT_CENTERS,
 *     normDistrict,
 *     normConstit,
 *     getDistrictFromEmail,
 *   } from '../constants/constituencies';
 */

// ─── District list ─────────────────────────────────────────────────────────────

export const DELHI_DISTRICTS = [
  'Central',
  'East',
  'New Delhi',
  'North',
  'North East',
  'North West',
  'Shahdara',
  'South',
  'South East',
  'South West',
  'West',
];

// ─── Constituency maps ────────────────────────────────────────────────────────
// Display names (Title Case) matching AC_NAME in the datameet GeoJSON.
// GeoJSON may include "(SC)" / "(ST)" suffixes — use normConstit() for fuzzy matching.

/** Pre-2025 assembly constituency boundaries */
export const CONSTITUENCIES_OLD = {
  'Central':    ['Ballimaran', 'Burari', 'Chandni Chowk', 'Karol Bagh', 'Matia Mahal', 'Patel Nagar', 'Sadar Bazar'],
  'East':       ['Kondli', 'Krishna Nagar', 'Laxmi Nagar', 'Patparganj', 'Trilokpuri'],
  'New Delhi':  ['Bijwasan', 'Delhi Cantt', 'Jangpura', 'Mehrauli', 'New Delhi', 'R K Puram'],
  'North':      ['Adarsh Nagar', 'Badli', 'Bawana', 'Model Town', 'Narela', 'Rohini', 'Timarpur'],
  'North East': ['Ghonda', 'Karawal Nagar', 'Mustafabad'],
  'North West': ['Kirari', 'Mangol Puri', 'Mundka', 'Rithala', 'Shalimar Bagh', 'Sultanpur Majra', 'Wazirpur'],
  'Shahdara':   ['Babarpur', 'Gandhi Nagar', 'Gokalpur', 'Rohtas Nagar', 'Seelampur', 'Seemapuri', 'Shahdara', 'Vishwas Nagar'],
  'South':      ['Ambedkar Nagar', 'Chhatarpur', 'Deoli', 'Malviya Nagar'],
  'South East': ['Badarpur', 'Greater Kailash', 'Kalkaji', 'Kasturba Nagar', 'Okhla', 'Sangam Vihar', 'Tughlakabad'],
  'South West': ['Dwarka', 'Matiala', 'Najafgarh', 'Palam', 'Uttam Nagar'],
  'West':       ['Hari Nagar', 'Janakpuri', 'Madipur', 'Moti Nagar', 'Nangloi Jat', 'Rajinder Nagar', 'Rajouri Garden', 'Shakur Basti', 'Tilak Nagar', 'Tri Nagar', 'Vikaspuri'],
};

/** 2025 assembly constituency boundaries (current / "abs" mode) */
export const CONSTITUENCIES_NEW = {
  'Central':    ['Ballimaran', 'Chandni Chowk', 'Karol Bagh', 'Matia Mahal', 'Patel Nagar', 'Sadar Bazar'],
  'East':       ['Gandhi Nagar', 'Kondli', 'Krishna Nagar', 'Laxmi Nagar', 'Patparganj', 'Trilokpuri'],
  'New Delhi':  ['Delhi Cantt', 'Jangpura', 'New Delhi', 'Rajinder Nagar'],
  'North':      ['Adarsh Nagar', 'Badli', 'Burari', 'Model Town', 'Narela', 'Timarpur'],
  'North East': ['Ghonda', 'Gokalpur', 'Karawal Nagar', 'Mustafabad', 'Seelampur'],
  'North West': ['Bawana', 'Kirari', 'Mangol Puri', 'Mundka', 'Nangloi Jat', 'Rithala', 'Rohini', 'Shakur Basti', 'Shalimar Bagh', 'Sultanpur Majra', 'Tri Nagar', 'Wazirpur'],
  'Shahdara':   ['Babarpur', 'Rohtas Nagar', 'Seemapuri', 'Shahdara', 'Vishwas Nagar'],
  'South':      ['Ambedkar Nagar', 'Chhatarpur', 'Deoli', 'Malviya Nagar', 'Mehrauli', 'R K Puram'],
  'South East': ['Badarpur', 'Greater Kailash', 'Kalkaji', 'Kasturba Nagar', 'Okhla', 'Sangam Vihar', 'Tughlakabad'],
  'South West': ['Bijwasan', 'Dwarka', 'Matiala', 'Najafgarh', 'Palam', 'Uttam Nagar'],
  'West':       ['Hari Nagar', 'Janakpuri', 'Madipur', 'Moti Nagar', 'Rajouri Garden', 'Tilak Nagar', 'Vikaspuri'],
};

// ─── District geographic centers [lat, lng] ──────────────────────────────────

export const DISTRICT_CENTERS = {
  'Central':    [28.6517, 77.2219],
  'East':       [28.6342, 77.3010],
  'New Delhi':  [28.6139, 77.2090],
  'North':      [28.7041, 77.1025],
  'North East': [28.7000, 77.2620],
  'North West': [28.7140, 77.0989],
  'Shahdara':   [28.6717, 77.2880],
  'South':      [28.5244, 77.2066],
  'South East': [28.5623, 77.2905],
  'South West': [28.5876, 77.0614],
  'West':       [28.6271, 77.0947],
};

// ─── Normalisation helpers ────────────────────────────────────────────────────

/**
 * Normalise district name for fuzzy comparison.
 * Lowercases and strips spaces + hyphens.
 * @param {string} s
 * @returns {string}
 */
export const normDistrict = (s) => (s || '').toLowerCase().replace(/[\s\-]/g, '');

/**
 * Normalise constituency name for fuzzy comparison against GeoJSON AC_NAME.
 * Strips (SC)/(ST) suffixes, then spaces/hyphens/dots.
 * @param {string} s
 * @returns {string}
 */
export const normConstit = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/\s*\(sc\)/gi, '')
    .replace(/\s*\(st\)/gi, '')
    .replace(/[\s\-\.]/g, '');

// ─── Derived lookups ──────────────────────────────────────────────────────────

/** Build a normalised-name → district map for fast reverse lookup. */

// ─── Email → district helper ──────────────────────────────────────────────────

/**
 * Infer district from a user's email address.
 * Matches subdomain-style slugs (e.g. north_west@aakar.gov.in → 'North West').
 * Order matters — check multi-word districts before single-word.
 * @param {string|null|undefined} email
 * @returns {string|null}
 */
export function getDistrictFromEmail(email) {
  if (!email) return null;
  const e = email.toLowerCase();
  if (e.includes('north_west'))  return 'North West';
  if (e.includes('north_east'))  return 'North East';
  if (e.includes('new_delhi'))   return 'New Delhi';
  if (e.includes('south_west'))  return 'South West';
  if (e.includes('south_east'))  return 'South East';
  if (e.includes('north'))       return 'North';
  if (e.includes('shahdara'))    return 'Shahdara';
  if (e.includes('east'))        return 'East';
  if (e.includes('west'))        return 'West';
  if (e.includes('central'))     return 'Central';
  if (e.includes('south'))       return 'South';
  return null;
}
