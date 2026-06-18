import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

const API_URL = '/api/v1/ask';


const COLORS = {
  Voter: { bg: '#d4d4d8', border: '#a1a1aa' },
  Booth: { bg: '#1a2744', border: '#0d1b37' },
  House: { bg: '#22c55e', border: '#16a34a' },
  Area: { bg: '#D4A843', border: '#B8860B' },
  Complaint: { bg: '#a855f7', border: '#9333ea' },
  Default: { bg: '#71717a', border: '#52525b' },
};



const getColor = (label) => {
  switch (label) {
    case "Booth": return { background: "#1a2744", border: "#0d1b37", fontColor: "#050505ff" };
    case "Area": return { background: "#D4A843", border: "#B8860B", fontColor: "#18181b" };
    case "House": return { background: "#22c55e", border: "#16a34a", fontColor: "#150909ff" };
    case "Family": return { background: "#d4d4d8", border: "#a1a1aa", fontColor: "#18181b" };
    case "Voter": return { background: "#f4f4f5", border: "#d4d4d8", fontColor: "#18181b" };
    case "Complaint": return { background: "#a855f7", border: "#9333ea", fontColor: "#070000ff" };
    default: return { background: "#71717a", border: "#52525b", fontColor: "#ffffff" };
  }
};
const AskPanel = () => {
  const { currentUser } = useAuth();
  const [selectedNode, setSelectedNode] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const graphRef = useRef(null);
  const networkRef = useRef(null);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  useEffect(() => {
    // When fullscreen toggles, give a small delay for DOM to update then resize
    const timer = setTimeout(() => {
      if (networkRef.current) {
        networkRef.current.setSize('100%', '100%');
        networkRef.current.redraw();
        networkRef.current.fit();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullScreen]);

  useEffect(() => {
    if (!result?.graph || !graphRef.current) return;
    const { nodes, edges } = result.graph;
    if (!nodes.length && !edges.length) return;

    if (networkRef.current) {
      networkRef.current.destroy();
      networkRef.current = null;
    }

    const visNodes = new DataSet(
      nodes.map(n => {
        const nodeType = n.label;
        const c = getColor(nodeType);

        return {
          id: n.id,
          label:
            n.properties?.name ||
            n.properties?.epic?.toString() ||
            (n.properties?.house_no ? `House ${n.properties.house_no}` : null) ||
            n.properties?.complaint_id?.toString() ||
            n.properties?.booth_id?.toString() ||
            nodeType,

          color: {
            background: c.background,
            border: c.border,
            highlight: { background: c.background, border: '#D4A843' }
          },
          raw: n,
          font: { color: c.fontColor, size: 12, face: 'Inter, sans-serif' },
          shape: 'dot',
          size: 18,
          borderWidth: 2,
        };
      }))
      ;

    const visEdges = new DataSet(
      edges.map((e, i) => ({
        id: `e-${i}`,
        from: e.from,
        to: e.to,
        label: e.label,
        arrows: 'to',
        color: { color: '#d4d4d8', highlight: '#D4A843' },
        font: { size: 10, color: '#71717a', face: 'Inter, sans-serif' },
        smooth: { type: 'continuous' },
      }))
    );

    networkRef.current = new Network(
      graphRef.current,
      { nodes: visNodes, edges: visEdges },
      {
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -100,
            centralGravity: 0.01,
            springLength: 150,
            springConstant: 0.08
          },
          stabilization: { iterations: 150 }
        },
        interaction: { hover: true, tooltipDelay: 200, zoomView: true },
        edges: { width: 1.5, selectionWidth: 2 },
        nodes: { borderWidth: 2 },
      }
    );
    networkRef.current.on("click", function (params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = visNodes.get(nodeId);

        setSelectedNode(node.raw);
      } else {
        setSelectedNode(null);
      }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [result]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedNode(null);
    
    let targetQuestion = question.trim();
    if (currentUser?.role === 'dm') {
      targetQuestion = `For the district of ${currentUser.displayName}, ${targetQuestion}`;
    }
    
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: targetQuestion,
          shortcut: null
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || `Error ${res.status}`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const handleQuickQuery = async (shortcut) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedNode(null);

    let bodyData = { question: null, shortcut: shortcut };
    if (currentUser?.role === 'dm') {
      const shortcutQuestions = {
        "SHOW_ALL_RELATIONSHIPS": "Show relationships between voters, booths, houses, areas, and complaints in the district: " + currentUser.displayName,
        "LIST_ALL_VOTERS": "List all voters in the district: " + currentUser.displayName,
        "list_section": "List all voter sections in the district: " + currentUser.displayName,
        "LIST_HOUSES": "List all houses in the district: " + currentUser.displayName,
        "HOUSE_MEMBERS": "Show count of female voters in the district: " + currentUser.displayName,
        "SENIOR_VOTERS": "Show count of senior voters in the district: " + currentUser.displayName,
        "YOUTH_VOTERS": "Show count of youth voters in the district: " + currentUser.displayName,
        "VOTERS_BY_ISSUE": "Show voters and their complaints in the district: " + currentUser.displayName,
        "AREA_RELATIONS": "Show area relations in the district: " + currentUser.displayName,
        "FULL_GRAPH": "Show relationships between voters, booths, houses, areas, and complaints in the district: " + currentUser.displayName
      };
      const textQ = shortcutQuestions[shortcut] || (shortcut.replace(/_/g, ' ') + " in the district: " + currentUser.displayName);
      bodyData = { question: textQ, shortcut: null };
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) throw new Error("Error fetching data");

      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = result?.data?.length ? Object.keys(result.data[0]) : [];

  return (
    <div className={isFullScreen ? '' : 'fade-in'}>
      {/* ── Search Bar ── */}
      <div className="ask-search" style={{ borderRadius: 0, border: '1px solid var(--gray-200)', boxShadow: 'none' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Enter query for authoritative analysis..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAsk(); }}
          disabled={loading}
          style={{ fontSize: 13 }}
        />
        <button
          className="btn btn-primary"
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          style={{ borderRadius: 0, padding: '10px 24px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {loading ? 'ANALYZING…' : 'EXECUTE'}
        </button>
      </div>

      {/* 🔥 QUICK ACCESS PANEL */}
      <div className="quick-panel-container" style={{ border: '1px solid var(--gray-200)', borderRadius: 0, padding: '16px', background: 'var(--gray-50)', marginBottom: 24 }}>
        <div className="quick-header" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray-500)', marginBottom: 16 }}>
          Quick Insights
        </div>

        <div className="quick-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { label: "ALL RELATIONSHIPS", key: "SHOW_ALL_RELATIONSHIPS" },
            { label: "VOTER REGISTRY", key: "LIST_ALL_VOTERS" },
            { label: "SECTION ANALYSIS", key: "list_section" },
            { label: "HOUSEHOLD DATA", key: "LIST_HOUSES" },
            { label: "GENDER RATIO", key: "HOUSE_MEMBERS" },
            { label: "SENIOR CITIZENS", key: "SENIOR_VOTERS" },
            { label: "YOUTH SEGMENT", key: "YOUTH_VOTERS" },
            { label: "COMPLAINT CORRELATION", key: "VOTERS_BY_COMPLAINT" },
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => handleQuickQuery(q.key)}
              className="quick-chip"
              style={{
                borderRadius: 0,
                border: '1px solid var(--gray-300)',
                background: 'white',
                color: 'var(--gray-700)',
                fontSize: 10,
                fontWeight: 700,
                padding: '6px 14px',
                whiteSpace: 'nowrap',
                transition: 'all 0.1s ease',
                textTransform: 'uppercase'
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="loading-state" style={{ borderRadius: 0, border: '1px solid var(--gray-200)', padding: '40px', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--gray-100)', borderTopColor: 'var(--blue-600)', borderRadius: '50%' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Querying Intelligence Network…
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && <div className="error-msg" style={{ borderRadius: 0, border: '1px solid var(--red-100)', background: 'var(--red-50)', color: 'var(--red-500)', padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>{error}</div>}

      {/* ── Empty State ── */}
      {!loading && !result && !error && (
        <div className="card" style={{ borderRadius: 0, boxShadow: 'none', border: '1px solid var(--gray-200)', background: 'white' }}>
          <div className="empty-state" style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: 'var(--gray-300)' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ color: 'var(--gray-500)', fontSize: 14, fontWeight: 500 }}>Initialize query to probe knowledge graph</p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className={isFullScreen ? '' : 'fade-in'}>
          {/* Answer */}
          <div className="answer-card" style={{ borderRadius: 0, boxShadow: 'none', border: '1px solid var(--gray-200)', padding: '24px', background: 'white', marginBottom: 24 }}>
            <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Executive Summary</h4>
            <p style={{ fontSize: 15, color: 'var(--gray-900)', lineHeight: 1.6, fontWeight: 500 }}>{result.answer}</p>
          </div>

          <div style={{ marginBottom: 24 }}>
            {/* Cypher + Graph Area */}
            <div className="cypher-block" style={{ borderRadius: 0, borderLeft: '4px solid var(--amber-500)', background: 'var(--gray-900)', padding: '20px', marginBottom: 24 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Logic Protocol (Cypher)</h4>
              <pre style={{ color: '#E0E0E0', fontSize: 12, opacity: 0.9 }}>{result.cypher}</pre>
            </div>

            {result.graph?.nodes?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className={`graph-wrapper ${isFullScreen ? 'fullscreen' : ''}`} style={{ borderRadius: 0, border: '1px solid var(--gray-200)', boxShadow: 'none', overflow: 'hidden', background: 'white', position: 'relative' }}>
                  <button
                    className="fullscreen-btn"
                    onClick={toggleFullScreen}
                    title={isFullScreen ? "Minimize" : "Maximize"}
                  >
                    {isFullScreen ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                        </svg>
                        <span style={{ marginLeft: 6, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Minimize View</span>
                      </>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    )}
                  </button>

                  <div className="graph-container" ref={graphRef} style={{ height: isFullScreen ? '100vh' : '800px', border: 'none' }} />
                </div>

                {/* 🔥 NODE DETAILS - AUTH STYLE */}
                {selectedNode && (
                  <div className="card" style={{ borderRadius: 0, border: '1px solid var(--gray-200)', padding: 0, background: 'white' }}>
                    <div style={{ background: 'var(--blue-700)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 40, height: 40, background: 'var(--amber-500)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: 'var(--blue-700)', fontWeight: 900
                      }}>
                        {selectedNode.label ? selectedNode.label.charAt(0) : '#'}
                      </div>
                      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        ENTITY: {selectedNode.label || 'IDENTIFIED NODE'}
                      </h2>
                    </div>

                    <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px', background: 'var(--gray-100)' }}>
                      {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                        <div key={key} style={{
                          backgroundColor: 'white',
                          padding: '16px 20px',
                        }}>
                          <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--gray-400)', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 800 }}>
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--gray-900)', fontWeight: 600 }}>
                            {value !== null && value !== undefined ? String(value) : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>NULL</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ borderRadius: 0, border: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
                <div className="empty-state" style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 32, height: 32, color: 'var(--gray-300)' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <p style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No relational data mapped</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export default AskPanel;
