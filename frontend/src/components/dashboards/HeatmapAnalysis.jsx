"use client";
import React from 'react';
import LocationMap from './LocationMap';

export default function HeatmapAnalysis({ level, hierarchy }) {
  const getLevelCode = () => {
    // Bottom-up detection: use the most specific hierarchy field available,
    // but only go as deep as the `level` prop allows (or deeper if data exists).
    const levelLower = (level || '').toLowerCase();
    const order = ['booth', 'mandal', 'constituency', 'district', 'state'];
    const levelIdx = order.indexOf(levelLower);

    // First, try to match at the requested level
    if (levelLower && hierarchy?.[levelLower]) {
      return { level: levelLower, code: hierarchy[levelLower] };
    }

    // Fallback: walk bottom-up through the hierarchy to find the most specific populated field
    for (const lv of order) {
      if (hierarchy?.[lv]) {
        return { level: lv, code: hierarchy[lv] };
      }
    }

    // Ultimate fallback
    return { level: 'state', code: hierarchy?.state || 'DL' };
  };

  const { level: mapLevel, code: mapCode } = getLevelCode();
  const displayName = mapCode || '';

  return (
    <LocationMap level={mapLevel} code={mapCode} name={displayName} />
  );
}
