'use client';
import React, { useState } from 'react';

const navy = '#04122e';
const saffron = '#D4A843';

const GENDER_OPTIONS    = ['Male', 'Female', 'Other'];
const QUALIFICATION_OPT = ['Illiterate', 'Primary', 'Secondary', 'Graduate', 'Post-Graduate'];
const INCOME_OPTIONS    = ['< 1L', '1L–3L', '3L–5L', '5L–10L', '10L+'];
const RELIGION_OPTIONS  = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];

const Chip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 10px',
      fontSize: 10,
      fontWeight: 800,
      border: `1px solid ${active ? saffron : '#e2e8f0'}`,
      background: active ? saffron : '#f8fafc',
      color: active ? navy : '#64748b',
      borderRadius: 4,
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      transition: 'all 0.12s',
    }}
  >
    {label}
  </button>
);

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{
      fontSize: 9, fontWeight: 900, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.12em',
      marginBottom: 8,
    }}>
      {title}
    </div>
    {children}
  </div>
);

const EMPTY = {
  age_min: '', age_max: '',
  gender: [],
  occupation: '',
  qualification: [],
  religion: [],
  income: [],
  caste: '',
};

const VoterFilterDrawer = ({ isOpen, onClose, onApply, onClear, loading }) => {
  const [filters, setFilters] = useState(EMPTY);

  const toggle = (field, val) =>
    setFilters(f => ({
      ...f,
      [field]: f[field].includes(val)
        ? f[field].filter(x => x !== val)
        : [...f[field], val],
    }));

  const handleApply = () => {
    // Build query params — multi-select fields send first selected value for now
    const out = {};
    if (filters.age_min)              out.age_min       = parseInt(filters.age_min);
    if (filters.age_max)              out.age_max       = parseInt(filters.age_max);
    if (filters.gender.length === 1)  out.gender        = filters.gender[0];
    if (filters.occupation)           out.occupation    = filters.occupation;
    if (filters.qualification.length === 1) out.qualification = filters.qualification[0];
    if (filters.religion.length)      out.religion      = filters.religion[0];
    if (filters.income.length === 1)  out.income        = filters.income[0];
    if (filters.caste)                out.caste         = filters.caste;
    onApply(out, filters);
  };

  const handleClear = () => {
    setFilters(EMPTY);
    onClear();
  };

  const hasAny =
    filters.age_min || filters.age_max ||
    filters.gender.length || filters.occupation ||
    filters.qualification.length || filters.religion.length ||
    filters.income.length || filters.caste;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(4,18,46,0.35)',
          zIndex: 1000, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, background: '#ffffff', zIndex: 1001,
        boxShadow: '-8px 0 40px rgba(4,18,46,0.18)',
        display: 'flex', flexDirection: 'column',
        fontFamily: '"Public Sans", "Inter", sans-serif',
        animation: 'slideInRight 0.22s ease',
      }}>
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '2px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: navy,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              🎯 Voter Demographics Filter
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 600 }}>
              Color map by matching voter concentration
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#ffffff', fontSize: 18, cursor: 'pointer',
            width: 32, height: 32, borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Age */}
          <Section title="Age Range">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number" placeholder="Min (18)"
                value={filters.age_min}
                onChange={e => setFilters(f => ({ ...f, age_min: e.target.value }))}
                style={inputStyle}
                min={18} max={120}
              />
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>–</span>
              <input
                type="number" placeholder="Max (100)"
                value={filters.age_max}
                onChange={e => setFilters(f => ({ ...f, age_max: e.target.value }))}
                style={inputStyle}
                min={18} max={120}
              />
            </div>
          </Section>

          {/* Gender */}
          <Section title="Gender">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {GENDER_OPTIONS.map(g => (
                <Chip key={g} label={g}
                  active={filters.gender.includes(g)}
                  onClick={() => toggle('gender', g)}
                />
              ))}
            </div>
          </Section>

          {/* Occupation */}
          <Section title="Occupation">
            <input
              type="text" placeholder="e.g. Farmer, Teacher, Business..."
              value={filters.occupation}
              onChange={e => setFilters(f => ({ ...f, occupation: e.target.value }))}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </Section>

          {/* Qualification */}
          <Section title="Qualification">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {QUALIFICATION_OPT.map(q => (
                <Chip key={q} label={q}
                  active={filters.qualification.includes(q)}
                  onClick={() => toggle('qualification', q)}
                />
              ))}
            </div>
          </Section>

          {/* Religion */}
          <Section title="Religion">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RELIGION_OPTIONS.map(r => (
                <Chip key={r} label={r}
                  active={filters.religion.includes(r)}
                  onClick={() => toggle('religion', r)}
                />
              ))}
            </div>
          </Section>

          {/* Income */}
          <Section title="Income Bracket">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {INCOME_OPTIONS.map(i => (
                <Chip key={i} label={i}
                  active={filters.income.includes(i)}
                  onClick={() => toggle('income', i)}
                />
              ))}
            </div>
          </Section>

          {/* Caste */}
          <Section title="Caste">
            <input
              type="text" placeholder="Enter caste..."
              value={filters.caste}
              onChange={e => setFilters(f => ({ ...f, caste: e.target.value }))}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </Section>

          {/* Legend */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 6, padding: '12px 14px', marginTop: 8,
          }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Map Color Legend
            </div>
            {[
              { color: '#22c55e', label: '≥ 60% matching voters', desc: 'High concentration' },
              { color: '#f59e0b', label: '30–60% matching voters', desc: 'Medium' },
              { color: '#ef4444', label: '< 30% matching voters',  desc: 'Low concentration' },
            ].map(({ color, label, desc }) => (
              <div key={color} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: navy }}>{label}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex', gap: 8,
          background: '#f8fafc',
        }}>
          <button
            onClick={handleClear}
            disabled={!hasAny}
            style={{
              flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 800,
              border: '1px solid #e2e8f0', background: '#ffffff',
              color: hasAny ? '#ef4444' : '#94a3b8', borderRadius: 4, cursor: hasAny ? 'pointer' : 'default',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            disabled={!hasAny || loading}
            style={{
              flex: 2, padding: '10px 0', fontSize: 11, fontWeight: 900,
              border: 'none',
              background: hasAny ? navy : '#e2e8f0',
              color: hasAny ? '#ffffff' : '#94a3b8',
              borderRadius: 4, cursor: hasAny && !loading ? 'pointer' : 'default',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              borderBottom: hasAny ? `3px solid ${saffron}` : 'none',
            }}
          >
            {loading ? 'Loading...' : '🎯 Apply Filter'}
          </button>
        </div>
      </div>
    </>
  );
};

const inputStyle = {
  padding: '8px 10px',
  fontSize: 11, fontWeight: 700,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#04122e',
  borderRadius: 4,
  outline: 'none',
  width: '100%',
};

export default VoterFilterDrawer;
