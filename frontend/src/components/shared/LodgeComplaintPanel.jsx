import React, { useState } from 'react';
import logo from '../../assets/logo.png';

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
        .then(res => res.json())
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
          booth_id: boothId || "MH_201_003",
          epic: epic,
          phone: phone,
          type: type,
          description: description
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `INCIDENT REPORT #${data.complaint_id} REGISTERED SUCCESSFULLY.` });
        setEpic('');
        setPhone('');
        setDescription('');
      } else {
        setMessage({ type: 'error', text: data.detail || 'DISPATCH ERROR: SYSTEM UNREACHABLE.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'CONNECTION ERROR: VERIFY NODE STATUS.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: '0', width: '100%', margin: '0', minHeight: '100vh', backgroundColor: 'var(--white)' }}>
      {/* ── Institutional Header Block ── */}
      <div style={{ 
        background: 'var(--blue-600)', 
        padding: '48px 60px', 
        borderBottom: '6px solid var(--amber-500)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: '0'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: '900', 
            color: 'var(--white)', 
            letterSpacing: '-0.02em', 
            textTransform: 'uppercase',
            lineHeight: '1',
            margin: '0 0 8px 0'
          }}>
            Lodge Voter Complaint
          </h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--blue-100)', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              VOTER SERVICES PORTAL // BOOTH-LEVEL INTELLIGENCE
            </span>
            <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: '11px', color: 'var(--amber-500)', fontWeight: '800', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              NATIONAL SECRETARIAT <img src={logo?.src || logo} alt="Logo" style={{ height: '14px', filter: 'brightness(0) invert(1)' }} />
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '0.05em' }}>DOC_ID: CS_INTEL_2026_99X</div>
          <div style={{ fontSize: '12px', color: 'var(--white)', fontWeight: '900', marginTop: '4px' }}>FORM CV-442</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', minHeight: 'calc(100vh - 150px)' }}>
        {/* ── Main Dossier Form ── */}
        <div style={{ background: 'var(--white)', borderRight: '1px solid var(--gray-200)', borderRadius: '0' }}>
          {message && (
            <div style={{
              padding: '16px 24px',
              backgroundColor: message.type === 'success' ? 'var(--green-50)' : 'var(--red-50)',
              color: message.type === 'success' ? 'var(--green-500)' : 'var(--red-500)',
              borderBottom: `1px solid ${message.type === 'success' ? 'var(--green-100)' : 'var(--red-100)'}`,
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '0.02em'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ padding: '60px 80px' }}>
            <div style={{ marginBottom: '32px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--gray-900)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Recipient Identification
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '40px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '900', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Voter EPIC ID / Serial
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.G. HPV2108181"
                  value={epic}
                  onChange={(e) => setEpic(e.target.value.toUpperCase())}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '0', 
                    border: '1.5px solid var(--gray-200)', 
                    fontSize: '15px', 
                    fontWeight: '600',
                    background: 'var(--gray-50)',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '900', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="E.G. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '0', 
                    border: '1.5px solid var(--gray-200)', 
                    fontSize: '15px', 
                    fontWeight: '600',
                    background: 'var(--gray-50)'
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '900', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Complaint Classification
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '0', 
                    border: '1.5px solid var(--gray-200)', 
                    fontSize: '15px', 
                    fontWeight: '700',
                    background: 'var(--gray-50)',
                    cursor: 'pointer'
                  }}
                >
                  {issueTypes.map(type => (
                    <option key={type} value={type}>{type.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '32px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--gray-900)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Incident Details
              </h3>
            </div>

            <div className="form-group" style={{ marginBottom: '40px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '900', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Detailed Intelligence / Description
              </label>
              <textarea
                required
                rows="6"
                placeholder="PROVIDE FULL CONTEXTUAL DETAILS FOR CLASSIFICATION..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  borderRadius: '0', 
                  border: '1.5px solid var(--gray-200)', 
                  fontSize: '14px', 
                  resize: 'none',
                  background: 'var(--gray-50)',
                  lineHeight: '1.6'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: '14px',
                fontWeight: '900',
                background: 'var(--blue-600)',
                color: 'white',
                border: 'none',
                borderRadius: '0',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? 'SUBMITTING TO CENTRAL REGISTRY...' : 'Finalize & Submit Instruction'}
            </button>
          </form>
        </div>

        {/* ── Sidebar Metadata ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', background: 'var(--gray-50)', borderLeft: '1px solid var(--gray-200)' }}>
          <div style={{ background: 'var(--blue-50)', padding: '40px', borderBottom: '1px solid var(--blue-100)' }}>
            <h4 style={{ fontSize: '10px', fontWeight: '900', color: 'var(--blue-600)', letterSpacing: '0.1em', marginBottom: '16px', textTransform: 'uppercase' }}>
              Submission Context
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                <strong style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray-400)' }}>TIMESTAMP</strong>
                {new Date().toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                <strong style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray-400)' }}>BOOTH IDENTIFIER</strong>
                ZONE-A / BH-{boothId || '442'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                <strong style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray-400)' }}>AUTHORIZATION</strong>
                OFFICIAL_ACCESS_GRANTED
              </div>
            </div>
          </div>

          {/* Active Drives Section */}
          <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)' }}>
            <h4 style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gray-900)', letterSpacing: '0.2em', marginBottom: '20px', textTransform: 'uppercase', borderLeft: '4px solid #D4A843', paddingLeft: '12px' }}>
              Live Intelligence Feed
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {drives.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontStyle: 'italic', padding: '12px', border: '1px dashed var(--gray-200)' }}>
                  No active operational drives identified for this jurisdiction.
                </div>
              ) : (
                drives.map((d, i) => (
                  <div key={i} style={{ 
                    padding: '16px', 
                    background: 'white', 
                    border: '1px solid var(--gray-200)',
                    borderLeft: `4px solid ${d.type === 'Security' ? '#ef4444' : '#04122e'}`,
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.title}</span>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--gray-400)', fontFamily: 'monospace' }}>[{d.date}]</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>{d.description}</p>
                    <div style={{ 
                      marginTop: '12px', 
                      display: 'inline-block',
                      fontSize: '9px', 
                      fontWeight: '900', 
                      color: d.type === 'Security' ? '#ef4444' : '#D4A843', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.1em',
                      backgroundColor: 'var(--gray-50)',
                      padding: '4px 8px',
                      border: `1px solid ${d.type === 'Security' ? '#fecaca' : '#fef3c7'}`
                    }}>
                      {d.type} ALERT // ACTIVE
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-500)', padding: '24px' }}>
            <h4 style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(0,0,0,0.7)', letterSpacing: '0.1em', marginBottom: '12px', textTransform: 'uppercase' }}>
              Protocol Notice
            </h4>
            <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', lineHeight: '1.6', fontWeight: '600' }}>
              All complaints are processed by the National Intelligence Layer for immediate risk reassessment. Ensure accuracy in EPIC ID for graph relationship mapping.
            </p>
          </div>

          {/* Fake Barcode for Dossier Feel */}
          <div style={{ marginTop: 'auto', textAlign: 'center', opacity: 0.3 }}>
            <div style={{ height: '40px', background: 'repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 4px)', marginBottom: '4px' }} />
            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>* 2026-CV-INTEL-99X *</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LodgeComplaintPanel;

