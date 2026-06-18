import React from 'react';
import { User, ScanLine, Network, Bot } from 'lucide-react';


const AboutPanel = () => {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', paddingBottom: 40 }}>
      {/* ── Header ── */}
      <div className="card card-dark" style={{ padding: '40px 32px' }}>
        <div style={{ maxWidth: 800 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.05em', color: 'var(--white)', marginBottom: 16 }}>
            ABOUT: AAkar
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.9, letterSpacing: '-0.01em' }}>
            <strong>AAkar</strong> is an advanced Civic Intelligence Platform engineered to modernize how
            local governments and civic leaders understand, predict, and respond to community needs.
            By aggregating flat datasets regarding voters and localized complaints, AAkar constructs
            a highly interconnected <strong>Knowledge Graph</strong> — moving beyond traditional reactive complaint management.
          </p>
        </div>
      </div>

      {/* ── Architecture Split Section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Left Col: Text & Capabilities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Core Architecture</h3>
            <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 20 }}>
              The platform is powered by a <strong>Neo4j Graph Intelligence</strong> layer using Louvain Clustering,
              PageRank Centrality, and Cluster Density Detection to identify structural community groups,
              highlight significant nodes, and uncover dense problem areas in real-time.
            </p>
            <div className="summary-stats">
              <div className="summary-row">
                <span className="summary-label">Graph Engine</span>
                <span className="summary-value">Neo4j + Louvain / PageRank</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">AI / LLM</span>
                <span className="summary-value">Ollama (NLP → Cypher)</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">OCR Pipeline</span>
                <span className="summary-value badge badge-low">Tesseract Multi-threaded</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Key Capabilities</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <CapabilityRow num="1" title="Booth-level Risk Prediction" desc="Evaluates risk scores based on complaint growth rates, resolution delays, and localized sentiment." />
              <CapabilityRow num="2" title="Structural Community Detection" desc="Louvain clustering uncovers hidden relationships and patterns within civic data." />
              <CapabilityRow num="3" title="Civic Score Computation" desc="Dynamically calculates community health scores based on real-time node metrics." />
              <CapabilityRow num="4" title="AI-Based Recommendations" desc="Natural language queries translated into read-only Cypher for actionable, localized deployment strategies." />
            </div>
          </div>
        </div>

        {/* Right Col: Knowledge Graph Image */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-600)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Visualization : Knowledge Graph
            </span>
            <span className="badge badge-med">LIVE</span>
          </div>
          <div style={{ flex: 1, background: 'var(--blue-600)', position: 'relative' }}>
            <img
              src="/kg_bg.png"
              alt="Knowledge Graph Visualization"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>

      </div>

      {/* ── Details Section ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Two-column cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card card-dark">
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
              Predictive Risk Engine
            </h3>
            <p style={{ fontSize: 13, color: 'var(--blue-100)', lineHeight: 1.6, marginBottom: 16 }}>
              Evaluates booth-level risk scores based on complaint growth rates, resolution delays, and
              localized sentiment. Dynamically assigns risk categories and surfaces hotspots before situations escalate.
            </p>
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.1)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--gray-400)', letterSpacing: '0.05em' }}>ENGINE STATUS</span>
                <span style={{ fontSize: 11, color: 'var(--green-500)', fontWeight: 800 }}>ONLINE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--gray-400)', letterSpacing: '0.05em' }}>RISK CATEGORIES</span>
                <span style={{ fontSize: 11, color: 'var(--amber-500)', fontWeight: 800 }}>LOW · MED · HIGH</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: 'var(--gray-900)' }}>Ethical Design & Safety</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 16, flex: 1 }}>
              <strong>No Personal Profiling</strong> — data is anonymized and aggregated at booth/ward level.
              The LLM prompt-injection barriers block any mutating queries (DELETE/CREATE).
              Designed for authorized civic administrators and planners only.
            </p>
            <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-100)', padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--red-500)', letterSpacing: '0.05em', marginBottom: 4 }}>QUERY SAFETY</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gray-900)' }}>READ-ONLY CYPHER ENFORCED</div>
            </div>
          </div>
        </div>

        {/* Workflow Animation Section */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 320, position: 'relative', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
          <style>{`
            .wf-container {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              min-height: 320px;
              background: #ffffff;
              position: relative;
              padding: 60px 40px 40px;
            }
            .wf-stage {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 90%;
              max-width: 900px;
            }
            .wf-box {
              background: #ffffff;
              border: 2px solid #e2e8f0;
              border-radius: 14px;
              padding: 16px 14px 14px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 8px;
              width: 150px;
              height: 160px;
              position: relative;
              overflow: hidden;
            }
            .wf-box-label {
              font-size: 11px;
              font-weight: 800;
              color: #1e293b;
              letter-spacing: 0.08em;
              text-align: center;
              text-transform: uppercase;
              position: absolute;
              bottom: 14px;
              left: 0; right: 0;
            }
            .wf-line {
              flex: 1;
              height: 2px;
              background: #e2e8f0;
              margin: 0 16px;
              position: relative;
            }
            .wf-line-fill {
              height: 100%;
              width: 0%;
              background: #1e3a5f;
            }
            .wf-title-bar {
              position: absolute;
              top: 24px;
              left: 32px;
              z-index: 10;
            }
            .wf-title-sub {
              font-size: 12px;
              font-weight: 800;
              color: #94a3b8;
              letter-spacing: 0.12em;
              margin-bottom: 6px;
              text-transform: uppercase;
            }
            .wf-title-main::before {
              font-size: 24px;
              font-weight: 900;
              color: #1e293b;
              letter-spacing: 0.03em;
              content: "1. VOTER DATA";
              animation: wfTitleCycle 8s infinite;
            }
            @keyframes wfTitleCycle {
              0%, 24%   { content: "1. VOTER DATA"; }
              25%, 49%  { content: "2. DATA PROCESSED"; }
              50%, 74%  { content: "3. KNOWLEDGE GRAPH"; }
              75%, 100% { content: "4. ASK AI"; }
            }

            /* ── Navy blue glow per box ── */
            .wf-b1 { animation: wfGlow1 8s infinite; }
            .wf-b2 { animation: wfGlow2 8s infinite; }
            .wf-b3 { animation: wfGlow3 8s infinite; }
            .wf-b4 { animation: wfGlow4 8s infinite; }

            @keyframes wfGlow1 {
              0%      { border-color: #e2e8f0; box-shadow: none; }
              2%,22%  { border-color: #1e3a5f; box-shadow: 0 0 24px rgba(30,58,95,0.5), 0 0 48px rgba(30,58,95,0.2); }
              24%     { border-color: #e2e8f0; box-shadow: none; }
              25%,100%{ border-color: #e2e8f0; box-shadow: none; }
            }
            @keyframes wfGlow2 {
              0%,24%  { border-color: #e2e8f0; box-shadow: none; }
              27%,47% { border-color: #1e3a5f; box-shadow: 0 0 24px rgba(30,58,95,0.5), 0 0 48px rgba(30,58,95,0.2); }
              49%,100%{ border-color: #e2e8f0; box-shadow: none; }
            }
            @keyframes wfGlow3 {
              0%,49%  { border-color: #e2e8f0; box-shadow: none; }
              52%,72% { border-color: #1e3a5f; box-shadow: 0 0 24px rgba(30,58,95,0.5), 0 0 48px rgba(30,58,95,0.2); }
              74%,100%{ border-color: #e2e8f0; box-shadow: none; }
            }
            @keyframes wfGlow4 {
              0%,74%  { border-color: #e2e8f0; box-shadow: none; }
              77%,97% { border-color: #1e3a5f; box-shadow: 0 0 24px rgba(30,58,95,0.5), 0 0 48px rgba(30,58,95,0.2); }
              99%,100%{ border-color: #e2e8f0; box-shadow: none; }
            }

            /* ── Connector fill ── */
            .wf-c1 .wf-line-fill { animation: wfCf1 8s infinite; }
            .wf-c2 .wf-line-fill { animation: wfCf2 8s infinite; }
            .wf-c3 .wf-line-fill { animation: wfCf3 8s infinite; }
            @keyframes wfCf1 { 0%,22%{ width:0%; } 25%,100%{ width:100%; } }
            @keyframes wfCf2 { 0%,47%{ width:0%; } 50%,100%{ width:100%; } }
            @keyframes wfCf3 { 0%,72%{ width:0%; } 75%,100%{ width:100%; } }

            /* ═══ STEP 1 (0-24%): Voters pop out ═══ */
            .voter-crowd {
              position: relative;
              width: 70px;
              height: 50px;
              margin-top: 4px;
            }
            .voter-fig {
              position: absolute;
              color: #94a3b8;
              opacity: 0;
            }
            .voter-fig.vf1 { left: 18px; top: -2px; animation: vPop1 8s infinite; }
            .voter-fig.vf2 { left: -4px; top: 14px; animation: vPop2 8s infinite; }
            .voter-fig.vf3 { left: 38px; top: 14px; animation: vPop3 8s infinite; }
            @keyframes vPop1 {
              0%      { opacity: 0; transform: translateY(10px) scale(0.5); }
              3%      { opacity: 1; transform: translateY(-3px) scale(1.15); color: #1e3a5f; }
              6%,22%  { opacity: 1; transform: translateY(0) scale(1); color: #1e3a5f; }
              24%,100%{ opacity: 0; transform: translateY(0) scale(1); }
            }
            @keyframes vPop2 {
              0%,3%   { opacity: 0; transform: translateY(10px) scale(0.5); }
              6%      { opacity: 1; transform: translateY(-3px) scale(1.15); color: #1e3a5f; }
              9%,22%  { opacity: 1; transform: translateY(0) scale(1); color: #1e3a5f; }
              24%,100%{ opacity: 0; transform: translateY(0) scale(1); }
            }
            @keyframes vPop3 {
              0%,6%   { opacity: 0; transform: translateY(10px) scale(0.5); }
              9%      { opacity: 1; transform: translateY(-3px) scale(1.15); color: #1e3a5f; }
              12%,22% { opacity: 1; transform: translateY(0) scale(1); color: #1e3a5f; }
              24%,100%{ opacity: 0; transform: translateY(0) scale(1); }
            }

            /* ═══ STEP 2 (25-49%): Scanner laser sweeps ═══ */
            .scan-area {
              position: relative;
              width: 48px;
              height: 48px;
              margin-top: 4px;
            }
            .scan-area .wf-scan-icon {
              color: #94a3b8;
              opacity: 0;
              animation: scanIcon 8s infinite;
            }
            @keyframes scanIcon {
              0%,25%  { opacity: 0; transform: scale(0.7); }
              27%     { opacity: 1; transform: scale(1.1); color: #1e3a5f; }
              29%,47% { opacity: 1; transform: scale(1); color: #1e3a5f; }
              49%,100%{ opacity: 0; transform: scale(1); }
            }
            .scan-sweep {
              position: absolute;
              top: 0; left: -8px;
              width: calc(100% + 16px);
              height: 2px;
              background: #1e3a5f;
              box-shadow: 0 0 8px 2px rgba(30,58,95,0.6);
              opacity: 0;
              animation: scanLine 8s infinite;
            }
            @keyframes scanLine {
              0%,25%  { opacity: 0; top: 0; }
              27%     { opacity: 1; top: 0; }
              46%     { opacity: 1; top: 100%; }
              49%,100%{ opacity: 0; top: 100%; }
            }

            /* ═══ STEP 3 (50-74%): Graph nodes form ═══ */
            .graph-anim {
              position: relative;
              width: 56px;
              height: 56px;
              margin-top: 4px;
            }
            .g-node {
              position: absolute;
              width: 8px; height: 8px;
              border-radius: 50%;
              background: #94a3b8;
              opacity: 0;
            }
            .g-node.gn1 { top: 4px;  left: 24px; animation: gN1 8s infinite; }
            .g-node.gn2 { top: 24px; left: 4px;  animation: gN2 8s infinite; }
            .g-node.gn3 { top: 24px; left: 44px; animation: gN3 8s infinite; }
            .g-node.gn4 { top: 44px; left: 14px; animation: gN4 8s infinite; }
            .g-node.gn5 { top: 44px; left: 34px; animation: gN5 8s infinite; }
            @keyframes gN1 {
              0%,50%  { opacity: 0; transform: scale(0); }
              52%     { opacity: 1; transform: scale(1.3); background: #1e3a5f; }
              54%,72% { opacity: 1; transform: scale(1); background: #1e3a5f; }
              74%,100%{ opacity: 0; transform: scale(0); }
            }
            @keyframes gN2 {
              0%,52%  { opacity: 0; transform: scale(0); }
              54%     { opacity: 1; transform: scale(1.3); background: #1e3a5f; }
              56%,72% { opacity: 1; transform: scale(1); background: #1e3a5f; }
              74%,100%{ opacity: 0; transform: scale(0); }
            }
            @keyframes gN3 {
              0%,54%  { opacity: 0; transform: scale(0); }
              56%     { opacity: 1; transform: scale(1.3); background: #1e3a5f; }
              58%,72% { opacity: 1; transform: scale(1); background: #1e3a5f; }
              74%,100%{ opacity: 0; transform: scale(0); }
            }
            @keyframes gN4 {
              0%,56%  { opacity: 0; transform: scale(0); }
              58%     { opacity: 1; transform: scale(1.3); background: #1e3a5f; }
              60%,72% { opacity: 1; transform: scale(1); background: #1e3a5f; }
              74%,100%{ opacity: 0; transform: scale(0); }
            }
            @keyframes gN5 {
              0%,58%  { opacity: 0; transform: scale(0); }
              60%     { opacity: 1; transform: scale(1.3); background: #1e3a5f; }
              62%,72% { opacity: 1; transform: scale(1); background: #1e3a5f; }
              74%,100%{ opacity: 0; transform: scale(0); }
            }
            .g-line {
              position: absolute;
              height: 1.5px;
              background: #1e3a5f;
              transform-origin: left center;
              opacity: 0;
            }
            .g-line.gl1 { top: 8px;  left: 28px; width: 0; transform: rotate(55deg);  animation: gL1 8s infinite; }
            .g-line.gl2 { top: 8px;  left: 28px; width: 0; transform: rotate(125deg); animation: gL2 8s infinite; }
            .g-line.gl3 { top: 28px; left: 8px;  width: 0; transform: rotate(70deg);  animation: gL3 8s infinite; }
            .g-line.gl4 { top: 28px; left: 48px; width: 0; transform: rotate(110deg); animation: gL4 8s infinite; }
            @keyframes gL1 {
              0%,53%  { opacity: 0; width: 0; }
              56%,72% { opacity: 0.8; width: 22px; }
              74%,100%{ opacity: 0; width: 0; }
            }
            @keyframes gL2 {
              0%,55%  { opacity: 0; width: 0; }
              58%,72% { opacity: 0.8; width: 22px; }
              74%,100%{ opacity: 0; width: 0; }
            }
            @keyframes gL3 {
              0%,57%  { opacity: 0; width: 0; }
              60%,72% { opacity: 0.8; width: 22px; }
              74%,100%{ opacity: 0; width: 0; }
            }
            @keyframes gL4 {
              0%,59%  { opacity: 0; width: 0; }
              62%,72% { opacity: 0.8; width: 22px; }
              74%,100%{ opacity: 0; width: 0; }
            }
            .g-center-pulse {
              position: absolute;
              top: 20px; left: 20px;
              width: 16px; height: 16px;
              border-radius: 50%;
              border: 2px solid #1e3a5f;
              opacity: 0;
              animation: gPulse 8s infinite;
            }
            @keyframes gPulse {
              0%,54%  { opacity: 0; transform: scale(0.5); }
              60%     { opacity: 0.8; transform: scale(1.8); }
              66%     { opacity: 0; transform: scale(2.5); }
              74%,100%{ opacity: 0; }
            }

            /* ═══ STEP 4 (75-99%): Bot blinks eyes ═══ */
            .bot-face {
              position: relative;
              width: 48px;
              height: 48px;
              margin-top: 4px;
            }
            .bot-head {
              width: 48px; height: 36px;
              border: 2.5px solid #94a3b8;
              border-radius: 10px;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              opacity: 0;
              animation: botHead 8s infinite;
            }
            @keyframes botHead {
              0%,75%  { opacity: 0; transform: scale(0.7); border-color: #94a3b8; }
              77%     { opacity: 1; transform: scale(1.05); border-color: #1e3a5f; }
              79%,97% { opacity: 1; transform: scale(1); border-color: #1e3a5f; }
              99%,100%{ opacity: 0; }
            }
            .bot-eye {
              width: 7px; height: 7px;
              border-radius: 50%;
              background: #1e3a5f;
              animation: eyeBlink 8s infinite;
            }
            @keyframes eyeBlink {
              0%,75%   { transform: scaleY(0); }
              77%      { transform: scaleY(1); }
              84%,84.8%{ transform: scaleY(0.1); }
              85.5%    { transform: scaleY(1); }
              91%,91.8%{ transform: scaleY(0.1); }
              92.5%,97%{ transform: scaleY(1); }
              99%,100% { transform: scaleY(0); }
            }
            .bot-antenna {
              position: absolute;
              top: -10px; left: 50%;
              transform: translateX(-50%);
              width: 2px; height: 10px;
              background: #1e3a5f;
              opacity: 0;
              animation: botHead 8s infinite;
            }
            .bot-antenna::after {
              content: '';
              position: absolute;
              top: -4px; left: -3px;
              width: 8px; height: 8px;
              border-radius: 50%;
              background: #1e3a5f;
              animation: aPulse 8s infinite;
            }
            @keyframes aPulse {
              0%,77%  { opacity: 0.4; }
              83%     { opacity: 1; box-shadow: 0 0 6px rgba(30,58,95,0.6); }
              88%     { opacity: 0.4; }
              93%     { opacity: 1; box-shadow: 0 0 6px rgba(30,58,95,0.6); }
              97%,100%{ opacity: 0.4; }
            }
            .bot-mouth {
              position: absolute;
              bottom: 6px; left: 50%;
              transform: translateX(-50%);
              width: 14px; height: 2px;
              background: #1e3a5f;
              border-radius: 2px;
              animation: mouthTalk 8s infinite;
            }
            @keyframes mouthTalk {
              0%,79%   { height: 2px; }
              81%      { height: 5px; border-radius: 3px; }
              82%      { height: 2px; }
              84%      { height: 5px; border-radius: 3px; }
              85%      { height: 2px; }
              87%      { height: 5px; border-radius: 3px; }
              88%,100% { height: 2px; }
            }
          `}</style>

          <div className="wf-container">
            <div className="wf-title-bar">
              <div className="wf-title-sub">System Workflow</div>
              <div className="wf-title-main"></div>
            </div>

            <div className="wf-stage">
              {/* Node 1 – Voters pop out */}
              <div className="wf-box wf-b1">
                <div className="voter-crowd">
                  <User className="voter-fig vf1" size={28} />
                  <User className="voter-fig vf2" size={22} />
                  <User className="voter-fig vf3" size={22} />
                </div>
                <div className="wf-box-label">Voter<br />Data</div>
              </div>

              <div className="wf-line wf-c1"><div className="wf-line-fill"></div></div>

              {/* Node 2 – Scanner sweeps */}
              <div className="wf-box wf-b2">
                <div className="scan-area">
                  <ScanLine className="wf-scan-icon" size={44} />
                  <div className="scan-sweep"></div>
                </div>
                <div className="wf-box-label">Data<br />Processed</div>
              </div>

              <div className="wf-line wf-c2"><div className="wf-line-fill"></div></div>

              {/* Node 3 – Graph nodes form */}
              <div className="wf-box wf-b3">
                <div className="graph-anim">
                  <div className="g-node gn1"></div>
                  <div className="g-node gn2"></div>
                  <div className="g-node gn3"></div>
                  <div className="g-node gn4"></div>
                  <div className="g-node gn5"></div>
                  <div className="g-line gl1"></div>
                  <div className="g-line gl2"></div>
                  <div className="g-line gl3"></div>
                  <div className="g-line gl4"></div>
                  <div className="g-center-pulse"></div>
                </div>
                <div className="wf-box-label">Knowledge<br />Graph</div>
              </div>

              <div className="wf-line wf-c3"><div className="wf-line-fill"></div></div>

              {/* Node 4 – Bot blinks */}
              <div className="wf-box wf-b4">
                <div className="bot-face">
                  <div className="bot-head">
                    <div className="bot-antenna"></div>
                    <div className="bot-eye"></div>
                    <div className="bot-eye"></div>
                    <div className="bot-mouth"></div>
                  </div>
                </div>
                <div className="wf-box-label">Ask<br />AI</div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

/* ── Helper Component for Capabilities ── */
function CapabilityRow({ num, title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{
        background: 'var(--amber-50)',
        color: 'var(--amber-500)',
        minWidth: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 800
      }}>
        {num}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

export default AboutPanel;
