import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DrishtiStats from './drishti/DrishtiStats';
import ProjectList from './drishti/ProjectList';
import ProjectDetails from './drishti/ProjectDetails';
import FundsAllocation from './drishti/FundsAllocation';
import ProjectForms from './drishti/ProjectForms';

const DEPARTMENTS = ['Health', 'Education', 'PWD', 'Agriculture'];

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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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

    if (!justification.trim()) {
      setError('Decision Justification is mandatory before taking action.');
      return;
    }

    if (justification.trim().length < 10) {
      setError('Justification must be at least 10 characters long.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
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
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
          {/* ── Left Column: Projects List ── */}
          <ProjectList
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={(p) => {
              setSelectedProject(p);
              setIsEditing(false);
              setIsCreating(false);
              setShowDeleteConfirm(false);
              setJustification('');
              setError(null);
              setSuccess(null);
            }}
            onNewProjectClick={() => {
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
          />

          {/* ── Right Column: Selected Project Actions or Create/Edit Forms ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {isCreating || isEditing ? (
              <ProjectForms
                isCreating={isCreating}
                isEditing={isEditing}
                newProject={newProject}
                setNewProject={setNewProject}
                editProjectData={editProjectData}
                setEditProjectData={setEditProjectData}
                onSubmit={isCreating ? handleCreateSubmit : handleEditSubmit}
                onCancel={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                error={error}
              />
            ) : (
              <ProjectDetails
                selectedProject={selectedProject}
                onEditClick={(p) => {
                  setEditProjectData({ ...p });
                  setIsEditing(true);
                  setIsCreating(false);
                  setError(null);
                  setSuccess(null);
                }}
                onDeleteClick={() => setShowDeleteConfirm(true)}
                showDeleteConfirm={showDeleteConfirm}
                onDeleteConfirm={handleDeleteProject}
                onDeleteCancel={() => setShowDeleteConfirm(false)}
                justification={justification}
                setJustification={setJustification}
                onAction={handleAction}
                error={error}
                success={success}
              />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <DrishtiStats
            totalAllocated={totalAllocated}
            totalReleased={totalReleased}
            totalUtilized={totalUtilized}
            totalRemaining={totalRemaining}
          />
          <FundsAllocation
            deptStats={deptStats}
            totalAllocated={totalAllocated}
            totalUtilized={totalUtilized}
          />
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
