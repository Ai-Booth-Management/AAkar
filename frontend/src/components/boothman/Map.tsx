'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface Booth {
  id: number;
  partNumber: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

interface Volunteer {
  id: number;
  name: string;
  phone: string;
  status: string;
  lat: number | null;
  lng: number | null;
}

interface Task {
  id: number;
  title: string;
  status: string;
  lat: number | null;
  lng: number | null;
}

interface House {
  partNumber: string;
  houseNo: string;
  section: string;
  voterCount: number;
  lat: number | null;
  lng: number | null;
}

interface MapProps {
  booths?: Booth[];
  volunteers?: Volunteer[];
  tasks?: Task[];
  houses?: House[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  height?: string;
}

export default function LeafletMap({ 
  booths = [], 
  volunteers = [], 
  tasks = [],
  houses = [],
  centerLat = 28.6139, 
  centerLng = 77.2090, 
  zoom = 11,
  height = '500px'
}: MapProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // We use dynamic import for leaflet to avoid SSR issues with window
    import('leaflet').then((L) => {
      if (!mapRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: zoom,
          scrollWheelZoom: true,
          attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        mapRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);
      } else {
        // Just update center if it changes significantly
        mapRef.current.setView([centerLat, centerLng], zoom);
      }

      // Clear existing markers
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
      }

      // Draw booth coverage boundary polygon (convex hull of all house points)
      if (houses.length >= 3) {
        const pts = houses.filter(h => h.lat && h.lng).map(h => [h.lat!, h.lng!] as [number, number]);
        
        // Simple convex hull (gift wrapping)
        function crossProduct(O: number[], A: number[], B: number[]) {
          return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
        }
        function convexHull(points: [number, number][]) {
          const n = points.length;
          if (n < 3) return points;
          const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
          const lower: [number, number][] = [];
          for (const p of sorted) {
            while (lower.length >= 2 && crossProduct(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
            lower.push(p);
          }
          const upper: [number, number][] = [];
          for (let i = sorted.length - 1; i >= 0; i--) {
            const p = sorted[i];
            while (upper.length >= 2 && crossProduct(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
            upper.push(p);
          }
          lower.pop(); upper.pop();
          return [...lower, ...upper];
        }

        const hull = convexHull(pts);
        if (hull.length >= 3) {
          L.polygon(hull, {
            color: '#D4A843',
            weight: 2,
            fillColor: '#D4A843',
            fillOpacity: 0.08,
            dashArray: '6 4',
          }).addTo(layerGroupRef.current);
        }
      }

      // Add Booth Markers
      booths.forEach(booth => {
        if (!booth.lat || !booth.lng) return;

        const iconHtml = `
          <div style="width:36px;height:36px;border-radius:50%;background:#04122e;border:3px solid #D4A843;box-shadow:0 4px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;">
            🏢
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-booth-icon',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18]
        });

        const marker = L.marker([booth.lat, booth.lng], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-size: 10px; font-weight: bold; color: #D4A843; text-transform: uppercase;">Polling Booth</div>
            <h4 style="margin: 4px 0; color: #04122e; font-size: 14px; font-weight: 900;">${booth.partNumber}</h4>
            <div style="font-size: 11px; color: #64748b; line-height: 1.3; max-width: 200px;">${booth.name}</div>
          </div>
        `);
        layerGroupRef.current.addLayer(marker);
      });

      // Add Volunteer Markers
      volunteers.forEach(vol => {
        if (!vol.lat || !vol.lng) return;

        const isApproved = vol.status === 'APPROVED';
        const color = isApproved ? '#22c55e' : '#f59e0b';
        
        const iconHtml = `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; background-color: ${color}; opacity: 0.4; border-radius: 50%; ${isApproved ? 'animation: pulse 2s infinite;' : ''}"></div>
            <div style="width: 14px; height: 14px; background-color: ${color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.8; }
              100% { transform: scale(2.5); opacity: 0; }
            }
          </style>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-vol-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12]
        });

        const marker = L.marker([vol.lat, vol.lng], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <h4 style="margin: 0 0 4px 0; color: #04122e; font-size: 13px; font-weight: 800;">${vol.name}</h4>
            <div style="font-size: 11px; color: #2563eb; font-weight: bold; margin-bottom: 4px;">📞 ${vol.phone}</div>
            <div style="display: inline-block; padding: 2px 6px; font-weight: 800; font-size: 9px; color: white; background: ${color}; text-transform: uppercase; border-radius: 2px;">
              ${vol.status}
            </div>
          </div>
        `);
        layerGroupRef.current.addLayer(marker);
      });

      // Add Task Markers
      tasks.forEach((task, index) => {
        if (!task.lat || !task.lng) return;

        // Offset tasks slightly so they don't exactly overlap with booths
        const offsetLat = task.lat + 0.001 * Math.cos(index * 2);
        const offsetLng = task.lng + 0.001 * Math.sin(index * 2);

        const color = task.status === 'COMPLETED' ? '#10b981' : task.status === 'IN_PROGRESS' ? '#3b82f6' : '#ef4444';
        
        const iconHtml = `
          <div style="width: 20px; height: 20px; background-color: ${color}; border: 2px solid white; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-task-icon',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -10]
        });

        const marker = L.marker([offsetLat, offsetLng], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-size: 10px; font-weight: bold; color: ${color}; text-transform: uppercase; margin-bottom: 2px;">Task - ${task.status}</div>
            <h4 style="margin: 0; color: #04122e; font-size: 13px; font-weight: bold;">${task.title}</h4>
          </div>
        `);
        layerGroupRef.current.addLayer(marker);
      });

      // Add House Markers - grouped by section, spread in a grid
      // Group houses by their base lat/lng (section center)
      const sectionGroups = new Map<string, typeof houses>();
      houses.forEach(house => {
        if (!house.lat || !house.lng) return;
        const key = `${house.lat},${house.lng}`;
        if (!sectionGroups.has(key)) sectionGroups.set(key, []);
        sectionGroups.get(key)!.push(house);
      });

      sectionGroups.forEach((group) => {
        const baseLat = group[0].lat!;
        const baseLng = group[0].lng!;
        const total = group.length;

        group.forEach((house, index) => {
          // Spread houses in a grid: ~0.0008 deg ≈ 80m per cell
          const cols = Math.ceil(Math.sqrt(total));
          const col = index % cols;
          const row = Math.floor(index / cols);
          // Center the grid around the base point
          const halfCols = (cols - 1) / 2;
          const halfRows = (Math.ceil(total / cols) - 1) / 2;
          const spreadLat = baseLat + (row - halfRows) * 0.00045;
          const spreadLng = baseLng + (col - halfCols) * 0.00045;

          const iconHtml = `
            <div style="width: 10px; height: 10px; background-color: #9333ea; border: 1.5px solid white; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>
          `;

          const icon = L.divIcon({
            html: iconHtml,
            className: 'custom-house-icon',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
            popupAnchor: [0, -5]
          });

          const marker = L.marker([spreadLat, spreadLng], { icon });
          marker.bindPopup(`
            <div style="font-family: sans-serif; padding: 2px;">
              <div style="font-size: 9px; font-weight: bold; color: #9333ea; text-transform: uppercase;">Household</div>
              <h4 style="margin: 2px 0; color: #04122e; font-size: 12px; font-weight: bold;">House #${house.houseNo}</h4>
              <div style="font-size: 10px; color: #64748b;">${house.voterCount} Voters</div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${house.section}</div>
            </div>
          `);
          layerGroupRef.current.addLayer(marker);
        });
      });

    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [booths, volunteers, tasks, houses, centerLat, centerLng, zoom]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ width: '100%', height: height, borderRadius: '8px', zIndex: 1 }} 
    />
  );
}
