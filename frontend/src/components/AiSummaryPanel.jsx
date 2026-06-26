import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AiSummaryPanel = () => {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/ai-summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        let errMsg = 'Failed to fetch AI summary';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load AI District Summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [currentUser]);

  const getSeverityBadgeClass = (severity) => {
    const s = String(severity).toLowerCase();
    if (s.includes('high')) return 'badge-high';
    if (s.includes('med')) return 'badge-med';
    return 'badge-low';
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'var(--font)' }}>
      
      {/* ── Top Header Card ── */}
      <div 
        className="card card-dark" 
        style={{ 
          background: 'linear-gradient(135deg, var(--blue-700) 0%, var(--blue-600) 100%)', 
          border: '1px solid var(--blue-700)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ flex: '1 1 500px' }}>
          <h2 style={{ color: 'var(--white)', margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800 }}>AI District Summary</h2>
          <p style={{ color: 'var(--blue-100)', margin: 0, opacity: 0.8, fontSize: '13px' }}>
            Real-time administrative compile: Automatically flags risks, delays, fund deficits, and generates strategic recommendations using the local Qwen 7B model.
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          style={{
            background: 'var(--amber-500)',
            color: 'var(--gray-950)',
            border: 'none',
            padding: '10px 18px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '0px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#e6b84c'}
          onMouseOut={(e) => e.currentTarget.style.background = 'var(--amber-500)'}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '12px', height: '12px' }}>
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Regenerate Summary</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--red-500)', padding: '16px', background: 'var(--red-50)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red-500)', fontWeight: 700 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Error</span>
          </div>
          <p style={{ color: 'var(--gray-700)', fontSize: '13px', marginTop: '8px' }}>{error}</p>
        </div>
      )}

      {loading && !summary && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', minHeight: '300px' }}>
          <div className="spinner" style={{ width: '36px', height: '36px', border: '4px solid var(--gray-200)', borderTopColor: 'var(--blue-600)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Running AI Governance Compilation Engine...</span>
          <span style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '4px' }}>Processing project registry, active citizen complaints, and booth metrics.</span>
        </div>
      )}

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
          
          {/* ── Section 1: Risks ── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--red-50)', padding: '6px', color: 'var(--red-500)', display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>District Risks & Vulnerabilities</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
              {(!summary.risks || summary.risks.length === 0) ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '13px', fontStyle: 'italic' }}>No active risks identified by system.</p>
              ) : (
                summary.risks.map((risk, index) => (
                  <div 
                    key={index}
                    style={{ 
                      padding: '12px', 
                      background: 'var(--gray-50)', 
                      borderLeft: `3px solid ${risk.severity?.toLowerCase() === 'high' ? 'var(--red-500)' : risk.severity?.toLowerCase() === 'medium' ? 'var(--amber-500)' : 'var(--green-500)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--gray-900)' }}>{risk.title}</span>
                      <span className={`badge ${getSeverityBadgeClass(risk.severity)}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{risk.severity}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0, lineHeight: 1.4 }}>{risk.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Section 2: Delayed Projects ── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--amber-50)', padding: '6px', color: 'var(--amber-500)', display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Delayed Projects (Drishti)</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
              {(!summary.delayed_projects || summary.delayed_projects.length === 0) ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '13px', fontStyle: 'italic' }}>No delayed projects flagged.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-100)', textAlign: 'left' }}>
                        <th style={{ padding: '8px', fontWeight: 800 }}>Project</th>
                        <th style={{ padding: '8px', fontWeight: 800 }}>Dept</th>
                        <th style={{ padding: '8px', fontWeight: 800 }}>Progress</th>
                        <th style={{ padding: '8px', fontWeight: 800 }}>Deadline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.delayed_projects.map((proj, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                          <td style={{ padding: '8px', fontWeight: 700 }}>
                            <div>{proj.name}</div>
                            {proj.delay_reason && (
                              <div style={{ fontSize: '10px', color: 'var(--gray-500)', fontWeight: 400, marginTop: '2px' }}>
                                Reason: {proj.delay_reason}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--gray-600)' }}>{proj.department}</td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '40px', background: 'var(--gray-200)', height: '6px' }}>
                                <div style={{ width: `${proj.progress}%`, background: 'var(--amber-500)', height: '100%' }} />
                              </div>
                              <span style={{ fontWeight: 700 }}>{proj.progress}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px', color: 'var(--red-500)', fontWeight: 700 }}>{proj.deadline}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Section 3: Fund Issues ── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--blue-50)', padding: '6px', color: 'var(--blue-500)', display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Budget & Fund Mismatches</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
              {(!summary.fund_issues || summary.fund_issues.length === 0) ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '13px', fontStyle: 'italic' }}>No fund utilization discrepancies reported.</p>
              ) : (
                summary.fund_issues.map((fund, index) => (
                  <div 
                    key={index}
                    style={{ 
                      padding: '12px', 
                      background: 'var(--gray-50)', 
                      borderLeft: '3px solid var(--blue-500)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--gray-900)', marginBottom: '4px' }}>{fund.project_name}</div>
                      <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0, lineHeight: 1.4 }}>{fund.issue}</p>
                    </div>
                    {fund.amount && (
                      <span 
                        className="badge" 
                        style={{ 
                          fontSize: '11px', 
                          padding: '3px 8px', 
                          background: 'rgba(58, 70, 101, 0.1)', 
                          color: 'var(--blue-500)',
                          whiteSpace: 'nowrap',
                          fontWeight: 700
                        }}
                      >
                        {fund.amount}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Section 4: Recommendations ── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--green-50)', padding: '6px', color: 'var(--green-500)', display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>AI Actionable Recommendations</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
              {(!summary.recommendations || summary.recommendations.length === 0) ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '13px', fontStyle: 'italic' }}>No strategic recommendations generated.</p>
              ) : (
                summary.recommendations.map((rec, index) => (
                  <div 
                    key={index}
                    style={{ 
                      padding: '12px', 
                      background: 'var(--gray-50)', 
                      borderLeft: `3px solid ${rec.priority?.toLowerCase() === 'high' ? 'var(--red-500)' : rec.priority?.toLowerCase() === 'medium' ? 'var(--amber-500)' : 'var(--green-500)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--gray-900)' }}>{rec.action}</span>
                      <span className={`badge ${getSeverityBadgeClass(rec.priority)}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{rec.priority}</span>
                    </div>
                    {rec.target && (
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>
                        Target: <span style={{ color: 'var(--gray-800)' }}>{rec.target}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── Keyframes for Spinner ── */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AiSummaryPanel;
