import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const INITIAL_PROJECTS = [
  {
    id: 'drishti-1',
    name: 'Smart Water Supply Metering',
    department: 'Public Works Department (PWD)',
    budget: '₹1.2 Crores',
    deadline: '2026-12-15',
    progress: 65,
    officer: 'Suresh Kumar (Executive Engineer)',
    status: 'In Progress',
    justificationHistory: []
  },
  {
    id: 'drishti-2',
    name: 'Government School Solarization',
    department: 'Power Department',
    budget: '₹45 Lakhs',
    deadline: '2026-08-20',
    progress: 40,
    officer: 'Amit Verma (Assistant Engineer)',
    status: 'In Progress',
    justificationHistory: []
  },
  {
    id: 'drishti-3',
    name: 'Primary Health Center Digitalization',
    department: 'Health Department',
    budget: '₹2.4 Crores',
    deadline: '2026-11-01',
    progress: 90,
    officer: 'Dr. Rakesh Sharma (Chief Medical Officer)',
    status: 'Pending Approval',
    justificationHistory: []
  },
  {
    id: 'drishti-4',
    name: 'CCTV Traffic Surveillance Expansion',
    department: 'Police Department',
    budget: '₹85 Lakhs',
    deadline: '2026-07-30',
    progress: 15,
    officer: 'Priya Sen (DCP Traffic)',
    status: 'In Progress',
    justificationHistory: []
  },
  {
    id: 'drishti-5',
    name: 'Drainage Desilting Phase 2',
    department: 'Municipal Corporation',
    budget: '₹60 Lakhs',
    deadline: '2026-06-25',
    progress: 50,
    officer: 'Vinod Rawat (Superintending Engineer)',
    status: 'Delayed',
    justificationHistory: []
  }
];

const DrishtiPanel = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(INITIAL_PROJECTS[0]);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [auditLog, setAuditLog] = useState([]);

  const handleAction = (actionType) => {
    setError(null);
    setSuccess(null);

    // Validation
    if (!justification.trim()) {
      setError('Decision Justification is mandatory before taking action.');
      return;
    }

    if (justification.trim().length < 10) {
      setError('Justification must be at least 10 characters long.');
      return;
    }

    // Determine new status and progress
    let newStatus = selectedProject.status;
    let newProgress = selectedProject.progress;

    switch (actionType) {
      case 'Approve':
        newStatus = 'Approved';
        newProgress = 100;
        break;
      case 'Reject':
        newStatus = 'Rejected';
        break;
      case 'Escalate':
        newStatus = 'Escalated';
        break;
      case 'Request Inspection':
        newStatus = 'Inspection Requested';
        break;
      case 'Mark Delayed':
        newStatus = 'Delayed';
        break;
      default:
        break;
    }

    // Update Project State
    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        const updated = {
          ...p,
          status: newStatus,
          progress: newProgress,
          justificationHistory: [
            {
              action: actionType,
              user: currentUser?.displayName || currentUser?.role || 'DM',
              text: justification,
              timestamp: new Date().toLocaleTimeString()
            },
            ...p.justificationHistory
          ]
        };
        setSelectedProject(updated);
        return updated;
      }
      return p;
    });

    setProjects(updatedProjects);

    // Add to audit log
    const logEntry = {
      id: Date.now(),
      project: selectedProject.name,
      action: actionType,
      user: currentUser?.displayName || currentUser?.role || 'DM',
      justification: justification,
      timestamp: new Date().toLocaleTimeString()
    };
    setAuditLog([logEntry, ...auditLog]);

    setSuccess(`Successfully executed action "${actionType}" for project: ${selectedProject.name}`);
    setJustification('');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
      case 'Completed':
        return 'badge-low'; // Green
      case 'Pending Approval':
        return 'badge-med'; // Amber/Yellow
      case 'Delayed':
      case 'Rejected':
        return 'badge-high'; // Red
      case 'Escalated':
        return 'badge-high'; // Red
      case 'Inspection Requested':
        return 'badge-med';
      default:
        return '';
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header Card ── */}
      <div className="card card-dark" style={{ background: 'linear-gradient(135deg, var(--blue-700) 0%, var(--blue-600) 100%)', border: '1px solid var(--blue-700)' }}>
        <h2 style={{ color: 'var(--white)', margin: '0 0 8px 0' }}>Project Drishti</h2>
        <p style={{ color: 'var(--blue-100)', margin: 0, opacity: 0.8, fontSize: 13 }}>
          District Project Monitoring & Action Portal. Review active initiatives, allocate checks, and approve developmental milestones.
        </p>
      </div>

      <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        {/* ── Left Column: Projects List ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0 }}>Active Projects</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 8px' }}>Project Name</th>
                  <th style={{ padding: '12px 8px' }}>Department</th>
                  <th style={{ padding: '12px 8px' }}>Budget</th>
                  <th style={{ padding: '12px 8px' }}>Progress</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => {
                      setSelectedProject(p);
                      setJustification('');
                      setError(null);
                      setSuccess(null);
                    }}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--gray-100)',
                      background: selectedProject?.id === p.id ? 'var(--gray-100)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                    className="hover-row"
                  >
                    <td style={{ padding: '14px 8px', fontWeight: 600, fontSize: 13, color: 'var(--gray-900)' }}>{p.name}</td>
                    <td style={{ padding: '14px 8px', color: 'var(--gray-600)', fontSize: 12 }}>{p.department}</td>
                    <td style={{ padding: '14px 8px', fontWeight: 500, fontSize: 12, color: 'var(--gray-800)' }}>{p.budget}</td>
                    <td style={{ padding: '14px 8px', width: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--gray-200)', borderRadius: 0, overflow: 'hidden' }}>
                          <div style={{ width: `${p.progress}%`, height: '100%', background: 'var(--blue-500)' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-800)' }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <span className={`badge ${getStatusBadgeClass(p.status)}`} style={{ fontSize: 9 }}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right Column: Selected Project Actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selectedProject ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--blue-600)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selected Project</span>
                <h3 style={{ margin: '4px 0 8px 0', color: 'var(--gray-900)' }}>{selectedProject.name}</h3>
                <span className={`badge ${getStatusBadgeClass(selectedProject.status)}`}>{selectedProject.status}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--gray-500)' }}>Department:</span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedProject.department}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--gray-500)' }}>Budget:</span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedProject.budget}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--gray-500)' }}>Deadline:</span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedProject.deadline}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--gray-500)' }}>Current Officer:</span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedProject.officer}</span>
                </div>
              </div>

              {/* ── Feedback Message ── */}
              {error && <div className="error-msg" style={{ margin: 0, padding: '10px 12px', borderRadius: 0, fontSize: 12 }}>{error}</div>}
              {success && <div className="success-msg" style={{ margin: 0, padding: '10px 12px', borderRadius: 0, fontSize: 12, background: 'rgba(16,185,129,0.1)', color: 'var(--green-600)', border: '1px solid rgba(16,185,129,0.2)' }}>{success}</div>}

              {/* ── DM Action justification inputs ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Decision Justification <span style={{ color: 'var(--high-risk)' }}>*</span>
                </label>
                <textarea
                  placeholder="Provide detailed justification or directive before taking action..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  style={{
                    width: '100%',
                    height: 80,
                    background: 'var(--white)',
                    border: '1px solid var(--gray-300)',
                    borderRadius: 0,
                    color: 'var(--gray-900)',
                    padding: '10px 12px',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>

              {/* ── DM Action buttons ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => handleAction('Approve')}
                    style={{ background: 'var(--green-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
                  >
                    Approve
                  </button>
                  <button
                    className="btn"
                    onClick={() => handleAction('Reject')}
                    style={{ background: 'var(--red-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
                  >
                    Reject
                  </button>
                </div>
                <button
                  className="btn"
                  onClick={() => handleAction('Escalate')}
                  style={{ background: 'var(--amber-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
                >
                  Escalate
                </button>
                <button
                  className="btn"
                  onClick={() => handleAction('Request Inspection')}
                  style={{ background: 'var(--blue-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
                >
                  Request Inspection
                </button>
                <button
                  className="btn"
                  onClick={() => handleAction('Mark Delayed')}
                  style={{ background: 'var(--gray-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
                >
                  Mark Delayed
                </button>
              </div>

              {/* ── Justification History ── */}
              {selectedProject.justificationHistory && selectedProject.justificationHistory.length > 0 && (
                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>History Log</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    {selectedProject.justificationHistory.map((h, index) => (
                      <div key={index} style={{ background: 'var(--gray-50)', padding: 10, borderLeft: '3px solid var(--blue-600)', fontSize: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: 'var(--blue-600)' }}>{h.action}</span>
                          <span style={{ color: 'var(--gray-500)' }}>{h.timestamp}</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--gray-800)' }}>{h.text}</p>
                        <span style={{ fontSize: 9, color: 'var(--gray-500)', display: 'block', marginTop: 4 }}>By: {h.user}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--gray-400)' }}>
              Select a project from the left to view details and take actions.
            </div>
          )}

          {/* ── Session Audit Log ── */}
          {auditLog.length > 0 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h4 style={{ margin: 0, color: 'var(--gray-900)' }}>Session Audit Log</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                {auditLog.map((log) => (
                  <div key={log.id} style={{ fontSize: 11, borderBottom: '1px solid var(--gray-100)', paddingBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--gray-800)' }}>
                      <span>{log.action} - {log.project}</span>
                      <span style={{ color: 'var(--gray-500)' }}>{log.timestamp}</span>
                    </div>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--gray-600)' }}>Justification: {log.justification}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .hover-row:hover {
          background: var(--gray-50) !important;
        }
      `}</style>
    </div>
  );
};

export default DrishtiPanel;
