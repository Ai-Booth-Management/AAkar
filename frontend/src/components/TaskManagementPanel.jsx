import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TASK_TYPES = ['Inspection', 'Survey', 'Review', 'Compliance Check'];
const ASSIGNEES = ['BDO', 'SDO', 'Department Officer'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Pending', 'In Progress', 'Completed'];

const TaskManagementPanel = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: 'Medium',
    status: 'Pending',
    type: 'Inspection',
    assigned_to: 'BDO'
  });

  // Filters
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/tasks/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Failed to fetch tasks (Status ${res.status}): ${errorText}`);
      }
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load tasks. Verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.title.trim()) {
      setError('Task Title is required.');
      return;
    }
    if (!form.description.trim()) {
      setError('Task Description is required.');
      return;
    }
    if (!form.deadline) {
      setError('Task Deadline is required.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/tasks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create task');
      }

      const newTask = await res.json();
      setSuccess(`Task "${newTask.title}" created successfully.`);
      setForm({
        title: '',
        description: '',
        deadline: '',
        priority: 'Medium',
        status: 'Pending',
        type: 'Inspection',
        assigned_to: 'BDO'
      });
      setTasks(prev => [newTask, ...prev]);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to create task.');
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update task');
      }

      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSuccess(`Task status updated to "${newStatus}".`);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to update task.');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSuccess('Task deleted successfully.');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to delete task.');
    }
  };

  // Filtered list
  const filteredTasks = tasks.filter(t => {
    if (filterType !== 'All' && t.type !== filterType) return false;
    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    if (filterAssignee !== 'All' && t.assigned_to !== filterAssignee) return false;
    return true;
  });

  // Aggregates
  const totalCount = tasks.length;
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-med';
      case 'Low': return 'badge-low';
      default: return '';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'badge-med';
      case 'In Progress': return 'badge-med';
      case 'Completed': return 'badge-low';
      default: return '';
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Card */}
      <div className="card card-dark" style={{ background: 'linear-gradient(135deg, var(--blue-700) 0%, var(--blue-600) 100%)', border: '1px solid var(--blue-700)' }}>
        <h2 style={{ color: 'var(--white)', margin: '0 0 8px 0' }}>Task Management</h2>
        <p style={{ color: 'var(--blue-100)', margin: 0, opacity: 0.8, fontSize: 13 }}>
          Dispatch surveys, inspections, reviews, and compliance checks to administrative officers. Track operational execution and milestones.
        </p>
      </div>

      {/* Aggregate Task Counters */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>TOTAL TASKS</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>{totalCount}</span>
        </div>
        <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>PENDING</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>{pendingCount}</span>
        </div>
        <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>IN PROGRESS</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-600)' }}>{inProgressCount}</span>
        </div>
        <div className="stat-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 800 }}>COMPLETED</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--green-600)' }}>{completedCount}</span>
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

      {/* 2 Column Layout: Task list & Task dispatch form */}
      <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        {/* Left Column: Tasks List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ margin: 0 }}>Active Assignments</h3>
            
            {/* Filter controls */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 11, border: '1px solid var(--gray-300)', borderRadius: 4 }}
              >
                <option value="All">All Types</option>
                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 11, border: '1px solid var(--gray-300)', borderRadius: 4 }}
              >
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select 
                value={filterAssignee} 
                onChange={(e) => setFilterAssignee(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 11, border: '1px solid var(--gray-300)', borderRadius: 4 }}
              >
                <option value="All">All Assignees</option>
                {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px' }}>Task Details</th>
                  <th style={{ padding: '12px' }}>Type</th>
                  <th style={{ padding: '12px' }}>Assigned To</th>
                  <th style={{ padding: '12px' }}>Deadline</th>
                  <th style={{ padding: '12px' }}>Priority</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)' }}>
                      No tasks found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(task => (
                    <tr key={task.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{task.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>{task.description}</div>
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: 12, fontWeight: 600 }}>{task.type}</td>
                      <td style={{ padding: '14px 12px', fontSize: 12, color: 'var(--gray-700)' }}>{task.assigned_to}</td>
                      <td style={{ padding: '14px 12px', fontSize: 12 }}>{task.deadline}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>{task.priority}</span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span className={`badge ${getStatusBadgeClass(task.status)}`}>{task.status}</span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {task.status !== 'Completed' && (
                            <button
                              onClick={() => handleUpdateStatus(task.id, task.status === 'Pending' ? 'In Progress' : 'Completed')}
                              className="btn btn-outline"
                              style={{ padding: '4px 8px', fontSize: 10 }}
                            >
                              {task.status === 'Pending' ? 'Start' : 'Complete'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: 10, borderColor: 'var(--red-600)', color: 'var(--red-600)' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Creation Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0 }}>Assign New Task</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Task Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Okhla Treatment Plant Inspection"
                style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Task Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Enter scope of work and instructions..."
                rows="3"
                style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 13, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Task Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 13 }}
                >
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Assign To</label>
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 13 }}
                >
                  {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--gray-300)', fontSize: 13 }}
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '10px', fontSize: 13, fontWeight: 700, marginTop: 10 }}
            >
              Dispatch Assignment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskManagementPanel;
