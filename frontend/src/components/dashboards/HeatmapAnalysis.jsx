"use client";
import React, { useState } from 'react';
import { Map as MapIcon, Layers, ChevronRight, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function HeatmapAnalysis({ level, hierarchy }) {
  const [activeOverlay, setActiveOverlay] = useState([]);
  
  const toggleOverlay = (id) => {
    setActiveOverlay(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fade-in" style={{ color: 'var(--navy)' }}>
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Geographic Analysis</div>
          <div className="dash-page-subtitle">Heatmap View</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 900, background: '#f8fafc', color: '#64748b', padding: '6px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>LEVEL: {level}</span>
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>A</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginTop: 24 }}>
        {/* Left: Map Area */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 600, position: 'relative', background: '#e5e7eb' }}>
          {/* Map Header */}
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--navy)' }}>No map data available</h3>
          </div>

          {/* Placeholder for Map Visual */}
          <div style={{ width: '100%', height: '100%', background: '#f1f5f9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <div style={{ textAlign: 'center', zIndex: 5 }}>
                <MapIcon size={64} color="var(--blue-400)" style={{ opacity: 0.3 }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginTop: 12 }}>NO GEOSPATIAL DATA AVAILABLE</p>
             </div>
          </div>
        </div>

        {/* Right: Analytics Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Issues Card */}
          <div className="card" style={{ padding: 20 }}>
             <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>ISSUE PRIORITY</h3>
             <div style={{ textAlign: 'center', padding: '16px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No data available</div>
          </div>

          {/* Temporal Patterns */}
          <div className="card" style={{ padding: 20 }}>
             <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>TEMPORAL PATTERNS</h3>
             <div style={{ textAlign: 'center', padding: '16px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No pattern data available</div>
          </div>

          {/* Map Overlay Selector */}
          <div className="card" style={{ padding: 20 }}>
             <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>MAP OVERLAY LAYERS</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <OverlayToggle label="Active Projects & Deployments" icon={<CheckCircle2 size={14} color="#22c55e" />} active={activeOverlay.includes('projects')} onToggle={() => toggleOverlay('projects')} />
                <OverlayToggle label="Sanitation & Health Alerts" icon={<AlertTriangle size={14} color="#0ea5e9" />} active={activeOverlay.includes('sanitation')} onToggle={() => toggleOverlay('sanitation')} />
                <OverlayToggle label="Education Welfare Alerts" icon={<Info size={14} color="#a855f7" />} active={activeOverlay.includes('education')} onToggle={() => toggleOverlay('education')} />
             </div>
          </div>

          {/* Informational Report Sidebar */}
          <div className="dash-section-dark" style={{ padding: 20, flex: 1, borderRadius: 12 }}>
             <h3 style={{ color: 'var(--amber-500)', fontSize: 12, fontWeight: 900, letterSpacing: '0.05em', marginBottom: 16 }}>INFORMATIONAL REPORT</h3>
             <div style={{ textAlign: 'center', padding: '16px', color: 'var(--blue-100)', fontSize: 12, fontWeight: 600 }}>
                No report data available
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 10, height: 10, background: color }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{label}</span>
    </div>
  );
}

function OverlayToggle({ label, icon, active, onToggle }) {
  return (
    <div 
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.2s ease', opacity: active ? 1 : 0.5 }}
    >
      <div style={{ width: 14, height: 14, border: '1.5px solid #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         {active && <div style={{ width: 8, height: 8, background: 'var(--blue-500)', borderRadius: 1 }} />}
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#475569' }}>
         {icon} {label}
      </span>
    </div>
  );
}
