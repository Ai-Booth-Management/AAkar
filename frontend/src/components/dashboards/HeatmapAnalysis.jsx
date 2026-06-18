"use client";
import React, { useState } from 'react';
import { Map as MapIcon, Layers, ChevronRight, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function HeatmapAnalysis({ level, hierarchy }) {
  const [activeOverlay, setActiveOverlay] = useState(['projects', 'sanitation']);
  
  const toggleOverlay = (id) => {
    setActiveOverlay(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Content configuration based on level
  const config = {
    STATE: {
      title: "State Geographic Yield Analysis",
      subject: "UTTAR PRADESH",
      stats: [
        { label: "Western UP Coverage", value: "88%", color: "var(--green-500)" },
        { label: "Purvanchal Priority", value: "14 Districts", color: "var(--red-500)" },
        { label: "Central Growth", value: "72%", color: "var(--amber-500)" }
      ],
      mapLabel: "Western UP Cluster — Operational Density",
      incidentSummary: [
        "• High concentration in Western UP sugar belt.",
        "• 403 constituencies showing active volunteer sync.",
        "• Infrastructure grievances dominate rural clusters."
      ],
      affectedLocations: "Meerut, Agra, & Saharanpur (Western Cluster)."
    },
    DISTRICT: {
      title: "District Heatmap Analysis",
      subject: "GORAKHPUR",
      stats: [
        { label: "Sanitation Issues", value: "191 (32%)", color: "var(--red-500)" },
        { label: "Water Supply Deficit", value: "155 (26%)", color: "var(--amber-500)" },
        { label: "Road Infrastructure", value: "153 (28%)", color: "var(--blue-500)" }
      ],
      mapLabel: "Gorakhpur Metropolitan — Concern Density",
      incidentSummary: [
        "• Civic hotline registered 591 reports.",
        "• Sanitation & Water form 60% of workload.",
        "• High report volume in urban wards."
      ],
      affectedLocations: "Gorakhpur City, Pipraich, & Sahjanwa."
    },
    CONSTITUENCY: {
      title: "Constituency Micro-Heatmap",
      subject: "GORAKHPUR URBAN",
      stats: [
        { label: "Active Booths", value: "184/210", color: "var(--green-500)" },
        { label: "Hotspot Booths", value: "42", color: "var(--red-500)" },
        { label: "Youth Engagement", value: "68%", color: "var(--blue-500)" }
      ],
      mapLabel: "Urban Ward Grid — Sentiment Volatility",
      incidentSummary: [
        "• Ward-level grievance tracking active.",
        "• 42 booths requiring immediate mobilization.",
        "• Positive sentiment spike in student areas."
      ],
      affectedLocations: "Ward 12 (Central) & Ward 4 (North)."
    }
  };

  const current = config[level] || config.STATE;

  return (
    <div className="fade-in" style={{ color: 'var(--navy)' }}>
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">{current.title}</div>
          <div className="dash-page-subtitle">{current.subject} Control Hub</div>
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
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--navy)' }}>{current.mapLabel}</h3>
          </div>

          {/* Placeholder for Map Visual */}
          <div style={{ width: '100%', height: '100%', background: '#f1f5f9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {/* Dynamic Map Layers (SVG Mockup) */}
             <svg width="100%" height="100%" viewBox="0 0 800 600" style={{ opacity: 0.1, position: 'absolute' }}>
                <path d="M100,100 L700,50 L750,550 L50,500 Z" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
             </svg>
             
             {/* Heatmap Blobs (Mock) */}
             <div style={{ position: 'absolute', width: 300, height: 300, background: 'rgba(239, 68, 68, 0.2)', borderRadius: '50%', filter: 'blur(40px)', left: '20%', top: '30%' }} />
             <div style={{ position: 'absolute', width: 250, height: 250, background: 'rgba(34, 197, 94, 0.2)', borderRadius: '50%', filter: 'blur(40px)', right: '15%', top: '20%' }} />
             <div style={{ position: 'absolute', width: 350, height: 350, background: 'rgba(245, 158, 11, 0.2)', borderRadius: '50%', filter: 'blur(40px)', left: '40%', bottom: '10%' }} />

             <div style={{ textAlign: 'center', zIndex: 5 }}>
                <MapIcon size={64} color="var(--blue-400)" style={{ opacity: 0.3 }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginTop: 12 }}>GEOSPATIAL DATA LAYER ACTIVE ({current.subject})</p>
             </div>

             {/* Legend Overlay */}
             <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'white', padding: 12, borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
               <div style={{ fontSize: 9, fontWeight: 900, marginBottom: 8, color: '#64748b' }}>DENSITY</div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <LegendItem color="#ef4444" label="Very High" />
                  <LegendItem color="#f59e0b" label="High" />
                  <LegendItem color="#facc15" label="Medium" />
               </div>
             </div>
          </div>
        </div>

        {/* Right: Analytics Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Issues Card */}
          <div className="card" style={{ padding: 20 }}>
             <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>ISSUE PRIORITY</h3>
             {current.stats.map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      <span>{s.label}</span>
                      <span style={{ color: s.color }}>{s.value}</span>
                   </div>
                   <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: i === 0 ? '75%' : i === 1 ? '45%' : '60%', background: s.color, borderRadius: 2 }} />
                   </div>
                </div>
             ))}
          </div>

          {/* Temporal Patterns */}
          <div className="card" style={{ padding: 20 }}>
             <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>TEMPORAL PATTERNS</h3>
             <p style={{ fontSize: 11, lineheight: 1.5, color: '#475569', marginBottom: 12 }}>
                <strong>Weekly Pattern:</strong> Weekends (Fri-Sun) dominate with a 45% spike.
             </p>
             <p style={{ fontSize: 11, lineheight: 1.5, color: '#475569', marginBottom: 16 }}>
                <strong>Diurnal Rhythm:</strong> Peak activity logged between 06:00 PM - 10:00 PM.
             </p>
             <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                • Predictive modeling active for next state cycle.
             </div>
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
             
             <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 9, fontWeight: 900, color: 'var(--amber-500)', marginBottom: 6 }}>INCIDENT SUMMARY</p>
                <div style={{ color: 'white', fontSize: 10, lineHeight: 1.6 }}>
                   {current.incidentSummary.map((item, i) => <div key={i}>{item}</div>)}
                </div>
             </div>

             <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 9, fontWeight: 900, color: 'var(--amber-500)', marginBottom: 6 }}>AFFECTED LOCATIONS</p>
                <div style={{ color: 'white', fontSize: 10, lineHeight: 1.6 }}>
                   • {current.affectedLocations}
                </div>
             </div>

             <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 9, fontWeight: 900, color: 'var(--amber-500)', marginBottom: 6 }}>ROUTING & OVERSIGHT</p>
                <div style={{ color: 'white', fontSize: 10, lineHeight: 1.6 }}>
                   • Joint Node Commissioner & Departmental Ops.
                </div>
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

