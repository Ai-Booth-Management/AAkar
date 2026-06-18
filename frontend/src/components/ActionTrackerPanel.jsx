import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ActionTrackerPanel = () => {
  const { currentUser } = useAuth();
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Selection & Update state (for DM / CM)
  const [selectedInst, setSelectedInst] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateActionTaken, setUpdateActionTaken] = useState('');
  const [updating, setUpdating] = useState(false);

  // Creation state (for CM)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [creating, setCreating] = useState(false);

  const fetchInstructions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('praja_token');
      const res = await fetch('/api/v1/actions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch instructions.');
      }
      const data = await res.json();
      setInstructions(data);
    } catch (e) {
      console.error(e);
      setError('Failed to fetch CM instructions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = () => {
      if (active) {
        fetchInstructions();
      }
    };
    const timer = setTimeout(load, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentUser]);

  const handleSelectInstruction = (inst) => {
    setSelectedInst(inst);
    setUpdateStatus(inst.status);
    setUpdateActionTaken(inst.action_taken || '');
    setSuccess(null);
    setError(null);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedInst) return;
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('praja_token');
      const res = await fetch(`/api/v1/actions/${selectedInst.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: updateStatus,
          action_taken: updateActionTaken
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update action tracker');
      }

      const updated = await res.json();
      setSuccess('Successfully updated instruction status.');
      setInstructions(prev => prev.map(item => item.id === updated.id ? updated : item));
      setSelectedInst(updated);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to update action tracker.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateInstruction = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newDeadline) {
      setError('Title, Description, and Deadline are required.');
      return;
    }
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('praja_token');
      const res = await fetch('/api/v1/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          deadline: newDeadline,
          priority: newPriority,
          status: 'Assigned'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create instruction');
      }

      const created = await res.json();
      setSuccess(`Successfully created instruction: ${created.title}`);
      setInstructions(prev => [created, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setNewDeadline('');
      setNewPriority('Medium');
      setShowCreateForm(false);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to create instruction.');
    } finally {
      setCreating(false);
    }
  };

  const getPriorityBadgeClass = (prio) => {
    switch (prio) {
      case 'High':
        return 'badge-high';
      case 'Medium':
        return 'badge-med';
      case 'Low':
      default:
        return 'badge-low';
    }
  };

  const getStatusBadgeStyle = (stat) => {
    switch (stat) {
      case 'Assigned':
        return { backgroundColor: 'var(--blue-50)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' };
      case 'Accepted':
        return { backgroundColor: 'var(--indigo-50)', color: 'var(--indigo-700)', border: '1px solid var(--indigo-200)' };
      case 'In Progress':
        return { backgroundColor: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)' };
      case 'Completed':
        return { backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-700)', border: '1px solid var(--emerald-200)' };
      default:
        return {};
    }
  };

  const filteredInstructions = instructions.filter(inst => {
    const matchStatus = statusFilter === 'All' || inst.status === statusFilter;
    const matchPriority = priorityFilter === 'All' || inst.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const isDM = currentUser?.role === 'dm';
  const isCM = currentUser?.role === 'cm';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header Card ── */}
      <div className="card card-dark" style={{ background: 'linear-gradient(135deg, var(--emerald-700) 0%, var(--emerald-600) 100%)', border: '1px solid var(--emerald-700)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: 'var(--white)', margin: '0 0 8px 0' }}>CM Instructions & Action Tracker</h2>
            <p style={{ color: 'var(--emerald-100)', margin: 0, opacity: 0.8, fontSize: 13 }}>
              Monitor directives assigned by the Chief Minister Secretariat and update resolution compliance states.
            </p>
          </div>
          {isCM && (
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setSelectedInst(null);
                setError(null);
                setSuccess(null);
              }}
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--white)', color: 'var(--emerald-700)', border: 'none', fontWeight: 700 }}
            >
              {showCreateForm ? 'View List' : 'Assign Instruction'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-msg" style={{ margin: 0 }}>{error}</div>}
      {success && <div className="success-msg" style={{ margin: 0 }}>{success}</div>}

      {showCreateForm && isCM ? (
        /* ── Creation Form (CM) ── */
        <div className="card">
          <h3 style={{ margin: '0 0 16px 0' }}>Create New Instruction</h3>
          <form onSubmit={handleCreateInstruction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Title / Topic</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Bridge repair speedup, Water line desilting..."
                style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Detailed Directives</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Provide detailed instructions and expectations..."
                style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', minHeight: 80, resize: 'vertical' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Deadline</label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)' }}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', padding: '8px 24px', alignSelf: 'flex-start' }} disabled={creating}>
              {creating ? 'Creating...' : 'Assign Directive'}
            </button>
          </form>
        </div>
      ) : (
        /* ── Main Layout ── */
        <div style={{ display: 'grid', gridTemplateColumns: selectedInst ? '1.2fr 0.8fr' : '1fr', gap: 20 }}>
          
          {/* ── Directives List Card ── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0 }}>Directives List ({filteredInstructions.length})</h3>
              
              {/* Filters */}
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--gray-300)' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Accepted">Accepted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--gray-300)' }}
                >
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)' }}>
                Loading instructions...
              </div>
            ) : filteredInstructions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)' }}>
                No directives match the active filters.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredInstructions.map(inst => (
                  <div
                    key={inst.id}
                    onClick={() => handleSelectInstruction(inst)}
                    style={{
                      padding: 16,
                      border: selectedInst?.id === inst.id ? '2px solid var(--emerald-600)' : '1px solid var(--gray-200)',
                      cursor: 'pointer',
                      borderRadius: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--white)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-900)' }}>{inst.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>Due by: {inst.deadline} | Created: {inst.created_at}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge ${getPriorityBadgeClass(inst.priority)}`} style={{ fontSize: 9 }}>
                        {inst.priority}
                      </span>
                      <span className="badge" style={{ ...getStatusBadgeStyle(inst.status), fontSize: 9 }}>
                        {inst.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Instruction Detailed View & Status Update (DM / CM) ── */}
          {selectedInst && (
            <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0 }}>Directive details</h3>
                <button
                  onClick={() => setSelectedInst(null)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--gray-400)' }}
                >
                  &times;
                </button>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--gray-900)' }}>{selectedInst.title}</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--gray-600)', lineHeight: '1.4' }}>
                  {selectedInst.description}
                </p>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--gray-500)' }}>
                  <span>Priority: <span className={`badge ${getPriorityBadgeClass(selectedInst.priority)}`}>{selectedInst.priority}</span></span>
                  <span>Status: <span className="badge" style={getStatusBadgeStyle(selectedInst.status)}>{selectedInst.status}</span></span>
                </div>
              </div>

              {selectedInst.action_taken && (
                <div style={{ padding: 12, backgroundColor: 'var(--gray-50)', borderLeft: '3px solid var(--gray-400)', fontSize: 11 }}>
                  <strong>Action Taken Log:</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)' }}>{selectedInst.action_taken}</p>
                </div>
              )}

              {/* DM / CM Action Update Section */}
              {(isDM || isCM) && (
                <form onSubmit={handleUpdateStatus} style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 12 }}>Update directive status</h4>

                  {isDM && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)' }}>Status</label>
                      <select
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                        style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--gray-300)' }}
                      >
                        <option value="Assigned">Assigned</option>
                        <option value="Accepted">Accepted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)' }}>Action Taken Notes</label>
                    <textarea
                      value={updateActionTaken}
                      onChange={(e) => setUpdateActionTaken(e.target.value)}
                      placeholder={isDM ? "State the actions initiated / compliance status..." : "CM observations or modifications..."}
                      style={{ padding: '6px 8px', fontSize: 11, border: '1px solid var(--gray-300)', minHeight: 60, resize: 'vertical' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={updating}>
                    {updating ? 'Updating...' : 'Save Changes'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default ActionTrackerPanel;
