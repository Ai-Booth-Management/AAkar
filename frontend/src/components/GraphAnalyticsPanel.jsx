import React, { useState, useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

const API_BASE = '/api/v1/admin';

// Custom government-themed palette for communities
const COMMUNITY_COLORS = [
  { background: '#D4A843', border: '#b48a2d' },
  { background: '#f59e0b', border: '#d97706' },
  { background: '#3b82f6', border: '#2563eb' },
  { background: '#ef4444', border: '#dc2626' },
  { background: '#10b981', border: '#059669' },
  { background: '#8b5cf6', border: '#7c3aed' },
  { background: '#06b6d4', border: '#0891b2' },
  { background: '#f43f5e', border: '#e11d48' },
];

const GraphAnalyticsPanel = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, text: '' });
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/analytics/network`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch intelligence graph');
        return res.json();
      })
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && !error && containerRef.current && graphData.nodes.length > 0) {
      const nodes = new DataSet(
        graphData.nodes.map(n => {
          const cIdx = (n.community || 0) % COMMUNITY_COLORS.length;
          return {
            id: n.id,
            label: n.name,
            value: n.val,
            hoverText: `Type: ${n.label} | Risk: ${n.risk_level}`,
            color: COMMUNITY_COLORS[cIdx],
            font: { color: '#ffffff', size: 10 }
          };
        })
      );

      const edges = new DataSet(
        graphData.links.map((l, i) => ({
          id: `e${i}`,
          from: l.source,
          to: l.target,
          label: l.type,
          font: { color: 'rgba(255,255,255,0.4)', size: 8, align: 'middle' },
          color: { color: 'rgba(255,255,255,0.15)' }
        }))
      );

      const options = {
        nodes: {
          shape: 'dot',
          size: 16,
          scaling: {
            min: 10,
            max: 30,
            label: { enabled: true, min: 8, max: 20 }
          }
        },
        edges: {
          arrows: { to: { enabled: true, scaleFactor: 0.5 } },
          smooth: { type: 'continuous' }
        },
        layout: {
          improvedLayout: false
        },
        interaction: {
          hover: true,
          tooltipDelay: 200
        },
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -50,
            centralGravity: 0.01,
            springLength: 100,
            springConstant: 0.08
          },
          stabilization: { iterations: 150 }
        }
      };

      const network = new Network(containerRef.current, { nodes, edges }, options);
      networkRef.current = network;

      // Ensure graph fits container once stabilized or resized
      const resizeObserver = new ResizeObserver(() => {
        if (networkRef.current) networkRef.current.fit();
      });
      resizeObserver.observe(containerRef.current);

      network.once('stabilized', () => {
        network.fit();
      });

      network.on("hoverNode", function (params) {
        const nodeId = params.node;
        const posDOM = network.canvasToDOM(network.getPositions([nodeId])[nodeId]);
        const node = nodes.get(nodeId);
        
        setTooltip({
          show: true,
          x: posDOM.x + 15,
          y: posDOM.y - 15,
          text: node.hoverText
        });
      });

      network.on("blurNode", function () {
        setTooltip({ show: false, x: 0, y: 0, text: '' });
      });

      network.on("zoom", () => setTooltip(t => ({ ...t, show: false })));
      network.on("dragStart", () => setTooltip(t => ({ ...t, show: false })));

      return () => {
        resizeObserver.disconnect();
        if (networkRef.current) {
          networkRef.current.off("hoverNode");
          networkRef.current.off("blurNode");
          networkRef.current.off("zoom");
          networkRef.current.off("dragStart");
          networkRef.current.destroy();
          networkRef.current = null;
        }
      };
    }
  }, [loading, error, graphData]);

  const topTargets = [...(graphData.nodes || [])]
    .sort((a, b) => (b.val || 0) - (a.val || 0))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="card fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--gray-500)', fontSize: 13, letterSpacing: '0.05em' }}>
          INITIALIZING LOUVAIN ALGORITHM...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner fade-in">
        <strong>Graph Analysis Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', gap: 24, height: 'calc(100vh - 120px)' }}>
      <div className="card card-dark" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--white)', border: 'none', padding: 0 }}>INTELLIGENCE NETWORK TOPOLOGY</h3>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--blue-100)', marginTop: 4 }}>Powered by Neo4j Louvain Community Detection</p>
          </div>
          <span className="badge badge-high">LIVE GRAPH</span>
        </div>
        <div style={{ flex: 1, position: 'relative', minHeight: '500px' }}>
          {graphData.nodes.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '500px' }}>
              <div 
                ref={containerRef} 
                style={{ width: '100%', height: '100%', minHeight: '500px', background: '#1a2744' }} 
              />
              {tooltip.show && (
                <div style={{
                  position: 'absolute',
                  left: tooltip.x,
                  top: tooltip.y,
                  background: 'rgba(15, 23, 42, 0.95)',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  pointerEvents: 'none',
                  zIndex: 100,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {tooltip.text}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--blue-100)' }}>
              No active nodes detected in the knowledge graph.
            </div>
          )}
        </div>
      </div>

      <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Critical Threat Vectors</h3>
          <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: 20 }}>
            The nodes below possess the highest <strong>PageRank</strong> scores globally, indicating they act as central focal points for surrounding complaints or actor networks.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topTargets.map((node, i) => (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ 
                  background: 'var(--red-50)', color: 'var(--red-500)', 
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{node.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{node.label}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gray-900)' }}>
                  {(node.val || 0).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-dark" style={{ border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-900)' }}>
          <h3 style={{ color: 'var(--gray-900)', borderBottom: '1px solid var(--gray-100)' }}>Analytic Parameters</h3>
          <div className="summary-stats">
            <div className="summary-row">
              <span className="summary-label">Total Entities</span>
              <span className="summary-value badge badge-low">{graphData.nodes.length}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Connections</span>
              <span className="summary-value badge badge-low">{graphData.links.length}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Modularity Model</span>
              <span className="summary-value">Louvain</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Criticality Model</span>
              <span className="summary-value">PageRank</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphAnalyticsPanel;
