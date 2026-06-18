import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DEPARTMENTS = ['Health', 'Education', 'PWD', 'Agriculture'];

const formatCurrency = (value) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
};

const DrishtiPanel = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'funds'
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    department: 'PWD',
    budget: '₹0.00 L',
    allocated: 0,
    released: 0,
    utilized: 0,
    deadline: '',
    progress: 0,
    officer: '',
    status: 'In Progress'
  });
  const [editProjectData, setEditProjectData] = useState(null);

  const handleCreateSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!newProject.name.trim()) {
      setError('Project Name is required.');
      return;
    }
    if (!newProject.budget.trim()) {
      setError('Budget text is required.');
      return;
    }
    if (!newProject.officer.trim()) {
      setError('Officer name is required.');
      return;
    }
    if (!newProject.deadline) {
      setError('Deadline is required.');
      return;
    }
    try {
      const token = localStorage.getItem('praja_token');
      const res = await fetch('/api/v1/drishti/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProject)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create project');
      }
      const created = await res.json();
      setSuccess(`Successfully created project: ${created.name}`);
      setProjects(prev => [...prev, created]);
      setSelectedProject(created);
      setIsCreating(false);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to create project.');
    }
  };

  const handleEditSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!editProjectData.name.trim()) {
      setError('Project Name is required.');
      return;
    }
    if (!editProjectData.budget.trim()) {
      setError('Budget text is required.');
      return;
    }
    if (!editProjectData.officer.trim()) {
      setError('Officer name is required.');
      return;
    }
    if (!editProjectData.deadline) {
      setError('Deadline is required.');
      return;
    }
    try {
      const token = localStorage.getItem('praja_token');
      const res = await fetch(`/api/v1/drishti/projects/${editProjectData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editProjectData.name,
          department: editProjectData.department,
          budget: editProjectData.budget,
          allocated: editProjectData.allocated,
          released: editProjectData.released,
          utilized: editProjectData.utilized,
          deadline: editProjectData.deadline,
          progress: editProjectData.progress,
          officer: editProjectData.officer,
          status: editProjectData.status
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update project');
      }
      const updated = await res.json();
      setSuccess(`Successfully updated project: ${updated.name}`);
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedProject(updated);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to update project.');
    }
  };

  const handleDeleteProject = async () => {
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('praja_token');
      const res = await fetch(`/api/v1/drishti/projects/${selectedProject.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to delete project');
      }
      setSuccess(`Successfully deleted project: ${selectedProject.name}`);
      const remainingProjects = projects.filter(p => p.id !== selectedProject.id);
      setProjects(remainingProjects);
      if (remainingProjects.length > 0) {
        setSelectedProject(remainingProjects[0]);
      } else {
        setSelectedProject(null);
      }
      setShowDeleteConfirm(false);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to delete project.');
    }
  };

  const fetchProjects = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('praja_token');
      const res = await fetch('/api/v1/drishti/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await res.json();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(prev => {
          if (prev) {
            const found = data.find(p => p.id === prev.id);
            return found || data[0];
          }
          return data[0];
        });
      }
    } catch (e) {
      console.error(e);
      setError('Failed to fetch projects. Please verify backend is running.');
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    const load = () => {
      if (isSubscribed) {
        fetchProjects();
      }
    };
    const timer = setTimeout(load, 0);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [currentUser]);

  // Calculate Aggregates
  const totalAllocated = projects.reduce((sum, p) => sum + (p.allocated || 0), 0);
  const totalReleased = projects.reduce((sum, p) => sum + (p.released || 0), 0);
  const totalUtilized = projects.reduce((sum, p) => sum + (p.utilized || 0), 0);
  const totalRemaining = projects.reduce((sum, p) => sum + (p.remaining || 0), 0);

  // Group by Department
  const deptStats = DEPARTMENTS.map(dept => {
    const deptProjects = projects.filter(p => p.department === dept);
    const allocated = deptProjects.reduce((sum, p) => sum + (p.allocated || 0), 0);
    const released = deptProjects.reduce((sum, p) => sum + (p.released || 0), 0);
    const utilized = deptProjects.reduce((sum, p) => sum + (p.utilized || 0), 0);
    const remaining = deptProjects.reduce((sum, p) => sum + (p.remaining || 0), 0);
    return {
      name: dept,
      count: deptProjects.length,
      allocated,
      released,
      utilized,
      remaining
    };
  });

  const handleAction = async (actionType) => {
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

    try {
      const token = localStorage.getItem('praja_token');
      const res = await fetch(`/api/v1/drishti/projects/${selectedProject.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: actionType,
          justification: justification.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to submit action');
      }

      const updatedProject = await res.json();
      setSuccess(`Successfully executed action "${actionType}" for project: ${updatedProject.name}`);
      setJustification('');

      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      setSelectedProject(updatedProject);

      // Add to audit log
      const logEntry = {
        id: Date.now(),
        project: updatedProject.name,
        action: actionType,
        user: currentUser?.displayName || currentUser?.role || 'DM',
        justification: justification,
        timestamp: new Date().toLocaleTimeString()
      };
      setAuditLog(prev => [logEntry, ...prev]);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to execute project action.');
    }
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

      {/* ── Tab Switcher ── */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--gray-200)', paddingBottom: 8 }}>
        <button
          className={`btn ${activeTab === 'projects' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('projects')}
          style={{ padding: '8px 24px', fontSize: 12 }}
        >
          Project Tracking
        </button>
        <button
          className={`btn ${activeTab === 'funds' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('funds')}
          style={{ padding: '8px 24px', fontSize: 12 }}
        >
          Fund Monitoring
        </button>
      </div>

      {activeTab === 'projects' ? (
        /* ═══════════════════════════════════════════
           PROJECTS TRACKING TAB
        ═══════════════════════════════════════════ */
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
          {/* ── Left Column: Projects List ── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Active Projects</h3>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setIsCreating(true);
                  setIsEditing(false);
                  setSelectedProject(null);
                  setNewProject({
                    name: '',
                    department: 'PWD',
                    budget: '₹0.00 L',
                    allocated: 0,
                    released: 0,
                    utilized: 0,
                    deadline: new Date().toISOString().split('T')[0],
                    progress: 0,
                    officer: '',
                    status: 'In Progress'
                  });
                  setError(null);
                  setSuccess(null);
                }}
                style={{ padding: '6px 12px', fontSize: 11 }}
              >
                + New Project
              </button>
            </div>
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
                        setIsEditing(false);
                        setIsCreating(false);
                        setShowDeleteConfirm(false);
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

          {/* ── Right Column: Selected Project Actions or Create/Edit Forms ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {isCreating ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--blue-600)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Initiate New Project</span>
                  <h3 style={{ margin: '4px 0 8px 0', color: 'var(--gray-900)' }}>Create Project</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Project Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Smart Water Supply Metering"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Department *</label>
                      <select
                        value={newProject.department}
                        onChange={(e) => setNewProject({ ...newProject, department: e.target.value })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      >
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Budget Text *</label>
                      <input
                        type="text"
                        placeholder="e.g. ₹1.20 Cr"
                        value={newProject.budget}
                        onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Allocated (₹) *</label>
                      <input
                        type="number"
                        placeholder="12000000"
                        value={newProject.allocated}
                        onChange={(e) => setNewProject({ ...newProject, allocated: parseInt(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Released (₹) *</label>
                      <input
                        type="number"
                        placeholder="8000000"
                        value={newProject.released}
                        onChange={(e) => setNewProject({ ...newProject, released: parseInt(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Utilized (₹) *</label>
                      <input
                        type="number"
                        placeholder="6000000"
                        value={newProject.utilized}
                        onChange={(e) => setNewProject({ ...newProject, utilized: parseInt(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Deadline *</label>
                      <input
                        type="date"
                        value={newProject.deadline}
                        onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Progress (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newProject.progress}
                        onChange={(e) => setNewProject({ ...newProject, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Status</label>
                      <select
                        value={newProject.status}
                        onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Escalated">Escalated</option>
                        <option value="Inspection Requested">Inspection Requested</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Officer Officer *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar (EE)"
                      value={newProject.officer}
                      onChange={(e) => setNewProject({ ...newProject, officer: e.target.value })}
                      style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                    />
                  </div>
                </div>

                {error && <div className="error-msg" style={{ margin: 0, padding: '10px 12px', fontSize: 12 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateSubmit}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Save Project
                  </button>
                  <button
                    className="btn"
                    onClick={() => setIsCreating(false)}
                    style={{ flex: 1, justifyContent: 'center', background: 'var(--gray-200)', color: 'var(--gray-700)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--blue-600)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Modify Project Details</span>
                  <h3 style={{ margin: '4px 0 8px 0', color: 'var(--gray-900)' }}>Edit Project</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Project Name *</label>
                    <input
                      type="text"
                      value={editProjectData?.name || ''}
                      onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
                      style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Department *</label>
                      <select
                        value={editProjectData?.department || 'PWD'}
                        onChange={(e) => setEditProjectData({ ...editProjectData, department: e.target.value })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      >
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Budget Text *</label>
                      <input
                        type="text"
                        value={editProjectData?.budget || ''}
                        onChange={(e) => setEditProjectData({ ...editProjectData, budget: e.target.value })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Allocated (₹) *</label>
                      <input
                        type="number"
                        value={editProjectData?.allocated || 0}
                        onChange={(e) => setEditProjectData({ ...editProjectData, allocated: parseInt(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Released (₹) *</label>
                      <input
                        type="number"
                        value={editProjectData?.released || 0}
                        onChange={(e) => setEditProjectData({ ...editProjectData, released: parseInt(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Utilized (₹) *</label>
                      <input
                        type="number"
                        value={editProjectData?.utilized || 0}
                        onChange={(e) => setEditProjectData({ ...editProjectData, utilized: parseInt(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Deadline *</label>
                      <input
                        type="date"
                        value={editProjectData?.deadline || ''}
                        onChange={(e) => setEditProjectData({ ...editProjectData, deadline: e.target.value })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Progress (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editProjectData?.progress || 0}
                        onChange={(e) => setEditProjectData({ ...editProjectData, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Status</label>
                      <select
                        value={editProjectData?.status || 'In Progress'}
                        onChange={(e) => setEditProjectData({ ...editProjectData, status: e.target.value })}
                        style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Escalated">Escalated</option>
                        <option value="Inspection Requested">Inspection Requested</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Officer Officer *</label>
                    <input
                      type="text"
                      value={editProjectData?.officer || ''}
                      onChange={(e) => setEditProjectData({ ...editProjectData, officer: e.target.value })}
                      style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
                    />
                  </div>
                </div>

                {error && <div className="error-msg" style={{ margin: 0, padding: '10px 12px', fontSize: 12 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleEditSubmit}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Update Project
                  </button>
                  <button
                    className="btn"
                    onClick={() => setIsEditing(false)}
                    style={{ flex: 1, justifyContent: 'center', background: 'var(--gray-200)', color: 'var(--gray-700)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : selectedProject ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--blue-600)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selected Project</span>
                    <h3 style={{ margin: '4px 0 8px 0', color: 'var(--gray-900)' }}>{selectedProject.name}</h3>
                    <span className={`badge ${getStatusBadgeClass(selectedProject.status)}`}>{selectedProject.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn"
                      onClick={() => {
                        setEditProjectData({ ...selectedProject });
                        setIsEditing(true);
                        setIsCreating(false);
                        setError(null);
                        setSuccess(null);
                      }}
                      style={{ padding: '4px 8px', fontSize: 11, background: 'var(--gray-100)', color: 'var(--gray-700)', border: '1px solid var(--gray-300)' }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{ padding: '4px 8px', fontSize: 11, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-600)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {showDeleteConfirm && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red-700)' }}>Are you sure you want to delete this project? This action cannot be undone.</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn"
                        onClick={handleDeleteProject}
                        style={{ padding: '6px 12px', fontSize: 11, background: 'var(--red-500)', color: 'var(--white)', border: 'none' }}
                      >
                        Yes, Delete
                      </button>
                      <button
                        className="btn"
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{ padding: '6px 12px', fontSize: 11, background: 'var(--gray-200)', color: 'var(--gray-700)', border: 'none' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--gray-500)' }}>Department:</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedProject.department}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--gray-500)' }}>Budget:</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedProject.budget}</span>
                  </div>
                  
                  {/* Fund Metrics in Detail Column */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--gray-500)' }}>Allocated:</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatCurrency(selectedProject.allocated)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--gray-500)' }}>Released:</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatCurrency(selectedProject.released)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--gray-500)' }}>Utilized:</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatCurrency(selectedProject.utilized)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--gray-500)' }}>Remaining:</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatCurrency(selectedProject.remaining)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid var(--gray-100)', paddingTop: 8 }}>
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
                {selectedProject.justifications && selectedProject.justifications.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>History Log</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                      {selectedProject.justifications.map((h, index) => (
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
      ) : (
        /* ═══════════════════════════════════════════
           FUND MONITORING TAB
        ═══════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ── Aggregate Metrics ── */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="label" style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL ALLOCATED</span>
              <span className="value" style={{ fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>{formatCurrency(totalAllocated)}</span>
            </div>
            <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="label" style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL RELEASED</span>
              <span className="value" style={{ fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>{formatCurrency(totalReleased)}</span>
            </div>
            <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="label" style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL UTILIZED</span>
              <span className="value" style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-600)' }}>{formatCurrency(totalUtilized)}</span>
            </div>
            <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="label" style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL REMAINING</span>
              <span className="value" style={{ fontSize: 24, fontWeight: 900, color: 'var(--amber-500)' }}>{formatCurrency(totalRemaining)}</span>
            </div>
          </div>

          <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            {/* ── Left Side: Department Breakdown Table ── */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ margin: 0 }}>Departmental Fund Monitoring</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px' }}>Department</th>
                    <th style={{ padding: '12px' }}>Allocated</th>
                    <th style={{ padding: '12px' }}>Released</th>
                    <th style={{ padding: '12px' }}>Utilized</th>
                    <th style={{ padding: '12px' }}>Remaining</th>
                    <th style={{ padding: '12px' }}>Util. %</th>
                  </tr>
                </thead>
                <tbody>
                  {deptStats.map(dept => {
                    const utilPercent = dept.allocated > 0 ? ((dept.utilized / dept.allocated) * 100).toFixed(0) : 0;
                    return (
                      <tr key={dept.name} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--gray-900)' }}>{dept.name}</td>
                        <td style={{ padding: '14px 12px', color: 'var(--gray-800)' }}>{formatCurrency(dept.allocated)}</td>
                        <td style={{ padding: '14px 12px', color: 'var(--gray-800)' }}>{formatCurrency(dept.released)}</td>
                        <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--blue-600)' }}>{formatCurrency(dept.utilized)}</td>
                        <td style={{ padding: '14px 12px', color: 'var(--gray-600)' }}>{formatCurrency(dept.remaining)}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 6, background: 'var(--gray-200)', borderRadius: 0, overflow: 'hidden' }}>
                              <div style={{ width: `${utilPercent}%`, height: '100%', background: 'var(--blue-500)' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-800)' }}>{utilPercent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Right Side: Funding Health Summary ── */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ margin: 0 }}>Utilization Analysis</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800, display: 'block', marginBottom: 4 }}>OVERALL UTILIZATION RATIO</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 10, background: 'var(--gray-200)', borderRadius: 0, overflow: 'hidden' }}>
                      <div style={{ width: `${((totalUtilized / totalAllocated) * 100).toFixed(0)}%`, height: '100%', background: 'var(--green-500)' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{((totalUtilized / totalAllocated) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 14 }}>
                  <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800, display: 'block', marginBottom: 6 }}>DEPT PERFORMANCE FLAG</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {deptStats.map(dept => {
                      const ratio = dept.allocated > 0 ? (dept.utilized / dept.allocated) : 0;
                      let statusText = 'Optimal';
                      let badgeCls = 'badge-low';
                      if (ratio < 0.3) {
                        statusText = 'Underutilized';
                        badgeCls = 'badge-high';
                      } else if (ratio > 0.85) {
                        statusText = 'High Burn';
                        badgeCls = 'badge-med';
                      }
                      return (
                        <div key={dept.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <span style={{ fontWeight: 600 }}>{dept.name}</span>
                          <span className={`badge ${badgeCls}`} style={{ fontSize: 9 }}>{statusText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-row:hover {
          background: var(--gray-50) !important;
        }
      `}</style>
    </div>
  );
};

export default DrishtiPanel;
