import React from 'react';

const DEPARTMENTS = ['Health', 'Education', 'PWD', 'Agriculture'];

const ProjectForms = ({
  isCreating,
  isEditing,
  newProject,
  setNewProject,
  editProjectData,
  setEditProjectData,
  onSubmit,
  onCancel,
  error
}) => {
  if (isCreating) {
    return (
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
            onClick={onSubmit}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Save Project
          </button>
          <button
            className="btn"
            onClick={onCancel}
            style={{ flex: 1, justifyContent: 'center', background: 'var(--gray-200)', color: 'var(--gray-700)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
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
            onClick={onSubmit}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Update Project
          </button>
          <button
            className="btn"
            onClick={onCancel}
            style={{ flex: 1, justifyContent: 'center', background: 'var(--gray-200)', color: 'var(--gray-700)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ProjectForms;
