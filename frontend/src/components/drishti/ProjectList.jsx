import React from 'react';

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Approved':
    case 'Completed':
      return 'badge-low'; // Green
    case 'Pending Approval':
      return 'badge-med'; // Amber/Yellow
    case 'Delayed':
    case 'Rejected':
    case 'Escalated':
      return 'badge-high'; // Red
    case 'Inspection Requested':
      return 'badge-med';
    default:
      return '';
  }
};

const ProjectList = ({ projects, selectedProject, onSelectProject, onNewProjectClick }) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Active Projects</h3>
        <button
          className="btn btn-primary"
          onClick={onNewProjectClick}
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
                onClick={() => onSelectProject(p)}
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
  );
};

export default ProjectList;
