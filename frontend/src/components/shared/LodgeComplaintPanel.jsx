import React, { useState } from 'react';
import logo from '../../assets/logo.png';

// ── Aakar Design Tokens ────────────────────────────────────────────────────────
const NAVY       = '#0F172A';
const NAVY_2     = '#17233B';
const NAVY_3     = '#1E2D47';
const GOLD       = '#C9A227';
const GOLD_LIGHT = '#E6C76A';
const WHITE      = '#FFFFFF';
const BG         = '#F8FAFC';
const BORDER     = '#D9DEE8';
const MUTED      = '#64748B';
const MUTED_LIGHT = '#94A3B8';

// ── Shared input style ─────────────────────────────────────────────────────────
const inputBase = {
  width: '100%',
  padding: '13px 16px',
  border: `1.5px solid ${BORDER}`,
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  color: NAVY,
  background: WHITE,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  fontFamily: 'inherit',
};

// ── Focus helpers (inline — no CSS class needed) ───────────────────────────────
const onFocus = (e) => {
  e.target.style.borderColor = GOLD;
  e.target.style.boxShadow = `0 0 0 3px rgba(201,162,39,0.12)`;
};
const onBlur = (e) => {
  e.target.style.borderColor = BORDER;
  e.target.style.boxShadow = 'none';
};

// ── Label ──────────────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label style={{
      display: 'block',
      marginBottom: '7px',
      fontSize: '10px',
      fontWeight: 900,
      color: MUTED,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}>
      {children}
    </label>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '24px',
      paddingBottom: '12px',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{ width: '3px', height: '16px', background: GOLD, borderRadius: '2px', flexShrink: 0 }} />
      <span style={{
        fontSize: '11px',
        fontWeight: 900,
        color: NAVY,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
      }}>
        {children}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const LodgeComplaintPanel = ({ boothId }) => {
  const [epic, setEpic] = useState('');
  const [type, setType] = useState('Water Supply');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [drives, setDrives] = useState([]);
  const [phone, setPhone] = useState('');

  React.useEffect(() => {
    if (boothId) {
      fetch(`/api/v1/drives/${boothId}`)
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => setDrives(data))
        .catch(err => console.error("Failed to fetch drives:", err));
    }
  }, [boothId]);

  const issueTypes = [
    'Water Supply',
    'Road Repair',
    'Street Light',
    'Garbage Collection',
    'Power Cut',
    'Drainage Issue',
    'Safety/Security',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/v1/complaints/lodge-complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booth_id: boothId || "",
          epic: epic,
          phone: phone,
          type: type,
          description: description
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP ${response.status}`);
      }
      const data = await response.json();

      setMessage({ type: 'success', text: `INCIDENT REPORT #${data.complaint_id} REGISTERED SUCCESSFULLY.` });
      setEpic('');
      setPhone('');
      setDescription('');
    } catch (err) {
      setMessage({ type: 'error', text: 'CONNECTION ERROR: VERIFY NODE STATUS.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: BG, minHeight: 'calc(100vh - 64px)', fontFamily: '"Inter", "Public Sans", sans-serif' }}>

      {/* ── Inner header band ── */}
      <div style={{
        background: NAVY_2,
        padding: '32px 48px',
        borderBottom: `1px solid rgba(201,162,39,0.2)`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        <div>
          <div style={{
            fontSize: '10px', fontWeight: 900, color: GOLD,
            letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '10px'
          }}>
            Voter Services Portal &nbsp;·&nbsp; Booth-Level Intelligence
          </div>
          <h1 style={{
            fontSize: '26px', fontWeight: 900, color: WHITE,
            letterSpacing: '-0.02em', textTransform: 'uppercase',
            margin: 0, lineHeight: 1,
          }}>
            Lodge Voter Complaint
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
            DOC_ID: CS_INTEL_2026_99X
          </div>
          <div style={{ fontSize: '13px', fontWeight: 900, color: GOLD, letterSpacing: '0.05em' }}>
            FORM CV-442
          </div>
          {boothId && (
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontFamily: 'monospace' }}>
              {boothId}
            </div>
          )}
        </div>
      </div>

      {/* ── Toast notification ── */}
      {message && (
        <div style={{
          padding: '14px 48px',
          background: message.type === 'success' ? '#F0FDF4' : '#FFF1F2',
          borderBottom: `2px solid ${message.type === 'success' ? '#22C55E' : '#F43F5E'}`,
          color: message.type === 'success' ? '#15803D' : '#BE123C',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px', height: '8px',
            borderRadius: '50%',
            background: message.type === 'success' ? '#22C55E' : '#F43F5E',
            flexShrink: 0,
          }} />
          {message.text}
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        minHeight: 'calc(100vh - 160px)',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>

        {/* ── Left: Form ── */}
        <div style={{
          background: WHITE,
          borderRight: `1px solid ${BORDER}`,
          padding: '48px 56px',
        }}>
          <form onSubmit={handleSubmit}>

            {/* Section 1: Recipient */}
            <SectionHeading>Recipient Identification</SectionHeading>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '20px',
              marginBottom: '40px',
            }}>
              {/* EPIC ID */}
              <div>
                <FieldLabel>Voter EPIC ID / Serial</FieldLabel>
                <input
                  type="text"
                  required
                  placeholder="e.g. HPV2108181"
                  value={epic}
                  onChange={(e) => setEpic(e.target.value.toUpperCase())}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={{ ...inputBase, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                />
              </div>

              {/* Phone */}
              <div>
                <FieldLabel>Contact Number</FieldLabel>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inputBase}
                />
              </div>

              {/* Type */}
              <div>
                <FieldLabel>Complaint Classification</FieldLabel>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={{ ...inputBase, cursor: 'pointer', appearance: 'auto' }}
                >
                  {issueTypes.map(t => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section 2: Incident Details */}
            <SectionHeading>Incident Details</SectionHeading>

            <div style={{ marginBottom: '36px' }}>
              <FieldLabel>Detailed Intelligence / Description</FieldLabel>
              <textarea
                required
                rows={6}
                placeholder="PROVIDE FULL CONTEXTUAL DETAILS FOR CLASSIFICATION..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={{
                  ...inputBase,
                  resize: 'none',
                  lineHeight: '1.7',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                background: loading ? NAVY_3 : NAVY,
                color: GOLD,
                border: `2px solid ${loading ? NAVY_3 : NAVY}`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 900,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = GOLD;
                  e.currentTarget.style.color = NAVY;
                  e.currentTarget.style.borderColor = GOLD;
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = NAVY;
                  e.currentTarget.style.color = GOLD;
                  e.currentTarget.style.borderColor = NAVY;
                }
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '14px', height: '14px',
                    border: `2px solid rgba(201,162,39,0.3)`,
                    borderTopColor: GOLD,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Submitting to Central Registry...
                </>
              ) : (
                'Finalize & Submit Complaint'
              )}
            </button>

          </form>
        </div>

        {/* ── Right: Sidebar ── */}
        <div style={{
          background: BG,
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}>

          {/* Submission context */}
          <div style={{
            background: NAVY,
            padding: '36px 32px',
            borderBottom: `1px solid rgba(201,162,39,0.15)`,
          }}>
            <div style={{
              fontSize: '9px', fontWeight: 900, color: GOLD,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '20px'
            }}>
              Submission Context
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Timestamp', value: new Date().toLocaleString('en-IN') },
                { label: 'Booth Identifier', value: `ZONE-A / BH-${boothId || '442'}` },
                { label: 'Authorization', value: 'OFFICIAL_ACCESS_GRANTED' },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(201,162,39,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Intelligence Feed */}
          <div style={{ padding: '32px', borderBottom: `1px solid ${BORDER}`, flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px',
            }}>
              <div style={{ width: '3px', height: '14px', background: GOLD, borderRadius: '2px' }} />
              <span style={{
                fontSize: '9px', fontWeight: 900, color: NAVY,
                letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>
                Live Intelligence Feed
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {drives.length === 0 ? (
                <div style={{
                  fontSize: '11px', color: MUTED_LIGHT, fontStyle: 'italic',
                  padding: '16px', border: `1px dashed ${BORDER}`,
                  borderRadius: '4px', textAlign: 'center', lineHeight: '1.6',
                }}>
                  No active operational drives identified<br />for this jurisdiction.
                </div>
              ) : (
                drives.map((d, i) => (
                  <div key={i} style={{
                    padding: '16px',
                    background: WHITE,
                    border: `1px solid ${BORDER}`,
                    borderLeft: `4px solid ${d.type === 'Security' ? '#EF4444' : GOLD}`,
                    borderRadius: '4px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {d.title}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: MUTED_LIGHT, fontFamily: 'monospace' }}>
                        [{d.date}]
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: MUTED, margin: 0, lineHeight: '1.5', fontWeight: 500 }}>
                      {d.description}
                    </p>
                    <div style={{
                      marginTop: '10px',
                      display: 'inline-block',
                      fontSize: '9px', fontWeight: 900,
                      color: d.type === 'Security' ? '#EF4444' : GOLD,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      background: d.type === 'Security' ? '#FFF1F2' : '#FEF9EC',
                      padding: '3px 8px',
                      border: `1px solid ${d.type === 'Security' ? '#FCA5A5' : '#F3D98B'}`,
                      borderRadius: '2px',
                    }}>
                      {d.type} ALERT // ACTIVE
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Protocol notice */}
          <div style={{
            background: '#FFFBEB',
            border: `1px solid #FDE68A`,
            borderLeft: `4px solid ${GOLD}`,
            margin: '0',
            padding: '24px 32px',
          }}>
            <div style={{
              fontSize: '9px', fontWeight: 900, color: '#92400E',
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px',
            }}>
              Protocol Notice
            </div>
            <p style={{
              fontSize: '11px', color: '#78350F', lineHeight: '1.7',
              fontWeight: 600, margin: 0,
            }}>
              All complaints are processed by the National Intelligence Layer for immediate risk reassessment.
              Ensure accuracy in EPIC ID for graph relationship mapping.
            </p>
          </div>

          {/* Barcode strip */}
          <div style={{ padding: '20px 32px', textAlign: 'center', opacity: 0.2 }}>
            <div style={{
              height: '32px',
              background: `repeating-linear-gradient(90deg, ${NAVY}, ${NAVY} 2px, transparent 2px, transparent 5px)`,
              marginBottom: '6px',
              borderRadius: '1px',
            }} />
            <div style={{ fontSize: '8px', fontWeight: 700, fontFamily: 'monospace', color: NAVY }}>
              * 2026-CV-INTEL-99X *
            </div>
          </div>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LodgeComplaintPanel;
