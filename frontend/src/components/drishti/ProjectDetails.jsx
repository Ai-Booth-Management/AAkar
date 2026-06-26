import React from 'react';

const formatCurrency = (value) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Approved':
    case 'Completed':
      return 'badge-low';
    case 'Pending Approval':
      return 'badge-med';
    case 'Delayed':
    case 'Rejected':
    case 'Escalated':
      return 'badge-high';
    case 'Inspection Requested':
      return 'badge-med';
    default:
      return '';
  }
};

const ProjectDetails = ({
  selectedProject,
  onEditClick,
  onDeleteClick,
  showDeleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  justification,
  setJustification,
  onAction,
  error,
  success
}) => {
  if (!selectedProject) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--gray-400)' }}>
        Select a project from the left to view details and take actions.
      </div>
    );
  }

  return (
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
            onClick={() => onEditClick(selectedProject)}
            style={{ padding: '4px 8px', fontSize: 11, background: 'var(--gray-100)', color: 'var(--gray-700)', border: '1px solid var(--gray-300)' }}
          >
            Edit
          </button>
          <button
            className="btn"
            onClick={onDeleteClick}
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
              onClick={onDeleteConfirm}
              style={{ padding: '6px 12px', fontSize: 11, background: 'var(--red-500)', color: 'var(--white)', border: 'none' }}
            >
              Yes, Delete
            </button>
            <button
              className="btn"
              onClick={onDeleteCancel}
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

      {error && <div className="error-msg" style={{ margin: 0, padding: '10px 12px', borderRadius: 0, fontSize: 12 }}>{error}</div>}
      {success && (
        <div className="success-msg" style={{ margin: 0, padding: '10px 12px', borderRadius: 0, fontSize: 12, background: 'rgba(16,185,129,0.1)', color: 'var(--green-600)', border: '1px solid rgba(16,185,129,0.2)' }}>
          {success}
        </div>
      )}

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            className="btn"
            onClick={() => onAction('Approve')}
            style={{ background: 'var(--green-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
          >
            Approve
          </button>
          <button
            className="btn"
            onClick={() => onAction('Reject')}
            style={{ background: 'var(--red-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
          >
            Reject
          </button>
        </div>
        <button
          className="btn"
          onClick={() => onAction('Escalate')}
          style={{ background: 'var(--amber-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
        >
          Escalate
        </button>
        <button
          className="btn"
          onClick={() => onAction('Request Inspection')}
          style={{ background: 'var(--blue-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
        >
          Request Inspection
        </button>
        <button
          className="btn"
          onClick={() => onAction('Mark Delayed')}
          style={{ background: 'var(--gray-500)', color: 'var(--white)', border: 'none', fontSize: 12, justifyContent: 'center' }}
        >
          Mark Delayed
        </button>
      </div>

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
  );
};

export default ProjectDetails;
