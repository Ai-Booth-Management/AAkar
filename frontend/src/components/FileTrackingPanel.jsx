import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DEPARTMENTS = ['Health', 'Education', 'PWD', 'Agriculture'];
const STATUSES = ['Pending', 'Approved', 'Rejected', 'Forwarded', 'Escalated'];

const FileTrackingPanel = () => {
  const { currentUser } = useAuth();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states (new file)
  const [form, setForm] = useState({
    title: '',
    department: 'PWD',
    current_holder: '',
    days_pending: 0
  });

  // Action input states
  const [rejectionReason, setRejectionReason] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [activeActionForm, setActiveActionForm] = useState(null); // 'reject' | 'forward' | null

  // Filters
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Local file upload preview states
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [filePreviews, setFilePreviews] = useState({});

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/files/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch files (Status ${res.status})`);
      }
      const data = await res.json();
      setFiles(data);
      if (data.length > 0) {
        setSelectedFile(prev => {
          if (prev) {
            const found = data.find(f => f.id === prev.id);
            return found || data[0];
          }
          return data[0];
        });
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load files. Verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.title.trim()) {
      setError('File Title is required.');
      return;
    }
    if (!form.current_holder.trim()) {
      setError('Current Holder is required.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/files/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to register file');
      }

      const newFile = await res.json();
      setSuccess(`File "${newFile.title}" registered successfully.`);
      
      // Store local object URL for preview if file was attached
      if (selectedUploadFile) {
        const objectUrl = URL.createObjectURL(selectedUploadFile);
        setFilePreviews(prev => ({ ...prev, [newFile.id]: objectUrl }));
      }

      setForm({
        title: '',
        department: 'PWD',
        current_holder: '',
        days_pending: 0
      });
      setSelectedUploadFile(null);
      // Reset file input element
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';

      setFiles(prev => [newFile, ...prev]);
      setSelectedFile(newFile);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to register file.');
    }
  };

  const handleAction = async (actionType, payload = {}) => {
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/files/${selectedFile.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: actionType,
          ...payload
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Action execution failed');
      }

      const updated = await res.json();
      setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
      setSelectedFile(updated);
      setSuccess(`Successfully executed action "${actionType}" on file: ${updated.title}`);
      
      // Reset action states
      setActiveActionForm(null);
      setRejectionReason('');
      setForwardTo('');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Action failed.');
    }
  };

  // Filtered files
  const filteredFiles = files.filter(f => {
    if (filterDept !== 'All' && f.department !== filterDept) return false;
    if (filterStatus !== 'All' && f.status !== filterStatus) return false;
    return true;
  });

  // Aggregates
  const totalFiles = files.length;
  const pendingFiles = files.filter(f => f.status === 'Pending' || f.status === 'Forwarded' || f.status === 'Escalated').length;
  const approvedFiles = files.filter(f => f.status === 'Approved').length;
  const rejectedFiles = files.filter(f => f.status === 'Rejected').length;

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved': return 'badge-low'; // Green
      case 'Pending': return 'badge-med'; // Amber/Yellow
      case 'Forwarded': return 'badge-med'; // Amber
      case 'Escalated': return 'badge-high'; // Red
      case 'Rejected': return 'badge-high'; // Red
      default: return '';
    }
  };

  const getTimelineBadgeClass = (stage) => {
    switch (stage) {
      case 'Approved': return 'badge-low';
      case 'Rejected': return 'badge-high';
      case 'Escalated': return 'badge-high';
      case 'Created': return 'badge-med';
      default: return 'badge-med';
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden', minWidth: 0 }}>
      {/* Header Card */}
      <div className="card card-dark" style={{ background: 'linear-gradient(135deg, var(--blue-700) 0%, var(--blue-600) 100%)', border: '1px solid var(--blue-700)' }}>
        <h2 style={{ color: 'var(--white)', margin: '0 0 8px 0' }}>File Tracking</h2>
        <p style={{ color: 'var(--blue-100)', margin: 0, opacity: 0.8, fontSize: 13 }}>
          Monitor the lifecycle, timeline, and transitions of administrative files across departments. Perform reviews, forwards, approvals, and escalations.
        </p>
      </div>

      {/* Aggregate Metrics */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL TRACKED</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>{totalFiles}</span>
        </div>
        <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>ACTIVE OPERATIONS</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-600)' }}>{pendingFiles}</span>
        </div>
        <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>APPROVED</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--green-600)' }}>{approvedFiles}</span>
        </div>
        <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>REJECTED</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--red-600)' }}>{rejectedFiles}</span>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)', gap: 20, minWidth: 0 }}>
        {/* Left Column: File List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ margin: 0 }}>File Registry</h3>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 11, border: '1px solid var(--gray-300)', borderRadius: 4 }}
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 11, border: '1px solid var(--gray-300)', borderRadius: 4 }}
              >
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', minWidth: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px', width: '35%', wordBreak: 'break-word' }}>File Title</th>
                  <th style={{ padding: '12px', width: '15%' }}>Dept</th>
                  <th style={{ padding: '12px', width: '25%', wordBreak: 'break-word' }}>Holder</th>
                  <th style={{ padding: '12px', width: '15%' }}>Status</th>
                  <th style={{ padding: '12px', width: '10%', textAlign: 'center' }}>Days</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)' }}>
                      No files found matching the filters.
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map(file => (
                    <tr
                      key={file.id}
                      onClick={() => {
                        setSelectedFile(file);
                        setActiveActionForm(null);
                      }}
                      style={{
                        borderBottom: '1px solid var(--gray-100)',
                        cursor: 'pointer',
                        background: selectedFile?.id === file.id ? '#f8fafc' : 'transparent',
                        fontWeight: selectedFile?.id === file.id ? '600' : 'normal'
                      }}
                    >
                      <td style={{ padding: '14px 12px', color: 'var(--gray-900)', wordBreak: 'break-word', overflow: 'hidden' }}>{file.title}</td>
                      <td style={{ padding: '14px 12px', fontSize: 12, overflow: 'hidden' }}>{file.department}</td>
                      <td style={{ padding: '14px 12px', fontSize: 12, wordBreak: 'break-word', overflow: 'hidden' }}>{file.current_holder}</td>
                      <td style={{ padding: '14px 12px', overflow: 'hidden' }}>
                        <span className={`badge ${getStatusBadgeClass(file.status)}`}>{file.status}</span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: file.days_pending > 10 ? 'var(--red-600)' : 'var(--gray-800)' }}>
                        {file.days_pending}d
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <hr style={{ margin: '16px 0', border: 'none', borderBottom: '1px solid var(--gray-200)' }} />

          {/* Inline registration form */}
          <div>
            <h4 style={{ margin: '0 0 16px 0', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em', color: 'var(--gray-500)' }}>Register New File</h4>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-500)' }}>File Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. PHC Renovation Proposal"
                  style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-500)' }}>Department</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 12 }}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-500)' }}>Current Holder</label>
                <input
                  type="text"
                  value={form.current_holder}
                  onChange={(e) => setForm({ ...form, current_holder: e.target.value })}
                  placeholder="e.g. CMO Delhi"
                  style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-500)' }}>Days</label>
                <input
                  type="number"
                  min="0"
                  value={form.days_pending}
                  onChange={(e) => setForm({ ...form, days_pending: parseInt(e.target.value) || 0 })}
                  style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-500)' }}>Attach PDF File</label>
                <input
                  type="file"
                  id="file-upload-input"
                  accept=".pdf"
                  onChange={(e) => setSelectedUploadFile(e.target.files ? e.target.files[0] : null)}
                  style={{ padding: '6px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 11, background: 'var(--white)', cursor: 'pointer' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '9px', fontSize: 12, fontWeight: 700, gridColumn: '3 / 4', alignSelf: 'end' }}>
                Register File
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: File Details & Actions Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selectedFile ? (
            <>
              {/* File details & Actions */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: 12 }}>
                  <span className={`badge ${getStatusBadgeClass(selectedFile.status)}`} style={{ float: 'right' }}>
                    {selectedFile.status}
                  </span>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: 'var(--gray-900)' }}>{selectedFile.title}</h3>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                    Department: <strong>{selectedFile.department}</strong> | Holder: <strong>{selectedFile.current_holder}</strong>
                  </div>
                </div>

                {/* Rejection reason callout if exists */}
                {selectedFile.status === 'Rejected' && selectedFile.rejection_reason && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: 4, fontSize: 12, color: '#991b1b' }}>
                    <strong>Rejection Reason:</strong> {selectedFile.rejection_reason}
                  </div>
                )}

                {/* Operations & actions buttons */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em', color: 'var(--gray-500)' }}>Actions Required</h4>
                  
                  {selectedFile.status !== 'Approved' && selectedFile.status !== 'Rejected' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleAction('Approve')}
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '8px', fontSize: 12, background: 'var(--green-600)', borderColor: 'var(--green-600)' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setActiveActionForm('reject');
                            setRejectionReason('');
                          }}
                          className="btn btn-outline"
                          style={{ flex: 1, padding: '8px', fontSize: 12, borderColor: 'var(--red-600)', color: 'var(--red-600)' }}
                        >
                          Reject
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            setActiveActionForm('forward');
                            setForwardTo('');
                          }}
                          className="btn btn-outline"
                          style={{ flex: 1, padding: '8px', fontSize: 12 }}
                        >
                          Forward
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Escalate this file to the District Magistrate (DM)?')) {
                              handleAction('Escalate');
                            }
                          }}
                          className="btn btn-outline"
                          style={{ flex: 1, padding: '8px', fontSize: 12, borderColor: 'var(--amber-500)', color: 'var(--amber-600)' }}
                        >
                          Escalate
                        </button>
                      </div>

                      {/* Action specific sub-forms */}
                      {activeActionForm === 'reject' && (
                        <div style={{ background: '#f8fafc', border: '1px solid var(--gray-200)', padding: 12, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-600)' }}>Rejection Reason</label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter detailed reason for rejection..."
                            rows="2"
                            style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--gray-300)', borderRadius: 4, resize: 'none' }}
                          />
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => setActiveActionForm(null)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 10 }}>Cancel</button>
                            <button
                              onClick={() => handleAction('Reject', { rejection_reason: rejectionReason })}
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: 10, background: 'var(--red-600)', borderColor: 'var(--red-600)' }}
                            >
                              Submit Rejection
                            </button>
                          </div>
                        </div>
                      )}

                      {activeActionForm === 'forward' && (
                        <div style={{ background: '#f8fafc', border: '1px solid var(--gray-200)', padding: 12, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-600)' }}>Forward Recipient (Officer/Designation)</label>
                          <input
                            type="text"
                            value={forwardTo}
                            onChange={(e) => setForwardTo(e.target.value)}
                            placeholder="e.g. SDO Electricity"
                            style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--gray-300)', borderRadius: 4 }}
                          />
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => setActiveActionForm(null)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 10 }}>Cancel</button>
                            <button
                              onClick={() => handleAction('Forward', { forward_to: forwardTo })}
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: 10 }}
                            >
                              Forward File
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--gray-400)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: 10, border: '1px dashed var(--gray-200)' }}>
                      This file has reached a terminal status and cannot be modified.
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline Panel */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ margin: 0 }}>File History & Timeline</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 20 }}>
                  {/* Timeline vertical bar */}
                  <div style={{ position: 'absolute', left: 4, top: 8, bottom: 8, width: 2, background: 'var(--gray-200)' }} />

                  {selectedFile.timeline && selectedFile.timeline.length === 0 ? (
                    <div style={{ color: 'var(--gray-400)', fontSize: 11, fontStyle: 'italic' }}>No timeline entries found.</div>
                  ) : (
                    selectedFile.timeline.map((entry, idx) => (
                      <div key={entry.id} style={{ position: 'relative', marginBottom: idx === selectedFile.timeline.length - 1 ? 0 : 20 }}>
                        {/* Timeline dot */}
                        <div style={{
                          position: 'absolute',
                          left: -20,
                          top: 4,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: entry.stage === 'Approved' ? 'var(--green-500)' : entry.stage === 'Rejected' ? 'var(--red-500)' : 'var(--blue-500)',
                          border: '2px solid var(--white)'
                        }} />
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <span className={`badge ${getTimelineBadgeClass(entry.stage)}`} style={{ fontSize: 9 }}>
                            {entry.stage}
                          </span>
                          <span style={{ fontSize: 9, color: 'var(--gray-400)' }}>{entry.timestamp}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', marginTop: 4 }}>
                          Actor: {entry.actor}
                        </div>
                        {entry.details && (
                          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                            {entry.details}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Document Preview Card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ margin: 0 }}>Document Preview</h3>
                <div style={{ border: '1px solid var(--gray-200)', borderRadius: '4px', overflow: 'hidden', background: 'var(--gray-50)' }}>
                  <div style={{ background: 'var(--gray-900)', color: 'var(--white)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                      {selectedFile.title.toLowerCase().replace(/\s+/g, '_')}.pdf
                    </span>
                    <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                      <a href={filePreviews[selectedFile.id] || "/sample.pdf"} target="_blank" rel="noreferrer" style={{ color: 'var(--white)', textDecoration: 'underline', fontWeight: 700, fontSize: 11 }}>Open</a>
                      <a href={filePreviews[selectedFile.id] || "/sample.pdf"} target="_blank" rel="noreferrer" style={{ color: 'var(--white)', textDecoration: 'underline', fontWeight: 700, fontSize: 11 }}>Fullscreen</a>
                    </div>
                  </div>
                  <object
                    data={`${filePreviews[selectedFile.id] || "/sample.pdf"}`}
                    type="application/pdf"
                    width="100%"
                    height="340px"
                    style={{ border: 'none', display: 'block' }}
                  >
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-500)', fontSize: 12 }}>
                      <p>PDF preview not supported in this browser.</p>
                      <a href={filePreviews[selectedFile.id] || "/sample.pdf"} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-600)', fontWeight: 700 }}>Open PDF directly</a>
                    </div>
                  </object>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--gray-400)', fontStyle: 'italic' }}>
              Select a file from the registry to view timeline details and perform operations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileTrackingPanel;
