import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';


const AuditPanel = () => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [officer, setOfficer] = useState('');
  const [project, setProject] = useState('');
  const [department, setDepartment] = useState('');
  const [date, setDate] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('praja_token');
      
      const queryParams = new URLSearchParams();
      if (officer.trim()) queryParams.append('officer', officer.trim());
      if (project.trim()) queryParams.append('project', project.trim());
      if (department.trim()) queryParams.append('department', department.trim());
      if (date.trim()) queryParams.append('date', date.trim());

      const res = await fetch(`/api/v1/audit/logs?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        let errMsg = 'Failed to fetch audit logs';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to fetch audit and decision trail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = () => {
      if (active) {
        fetchLogs();
      }
    };
    const timer = setTimeout(load, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentUser]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleReset = () => {
    setOfficer('');
    setProject('');
    setDepartment('');
    setDate('');
    setTimeout(() => {
      const token = localStorage.getItem('praja_token');
      fetch(`/api/v1/audit/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(res => res.json()).then(data => setLogs(data)).catch(console.error);
    }, 50);
  };

  const getActionBadgeClass = (actionType) => {
    switch (actionType) {
      case 'Approval':
        return 'badge-low'; // Green
      case 'Rejection':
        return 'badge-high'; // Red
      case 'Escalation':
        return 'badge-high'; // Red
      case 'Fund Release':
        return 'badge-low'; // Green
      case 'Task Creation':
        return 'badge-med'; // Yellow
      case 'Project Update':
      default:
        return 'badge-med'; // Yellow/Gray
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header Card ── */}
      <div className="card card-dark" style={{ background: 'linear-gradient(135deg, var(--blue-700) 0%, var(--blue-600) 100%)', border: '1px solid var(--blue-700)' }}>
        <h2 style={{ color: 'var(--white)', margin: '0 0 8px 0' }}>Audit & Decision Trail</h2>
        <p style={{ color: 'var(--blue-100)', margin: 0, opacity: 0.8, fontSize: 13 }}>
          Verifiable record of district development decisions, approvals, task assignments, and fund releases.
        </p>
      </div>

      {/* ── Search and Filter Card ── */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px 0' }}>Search and Filter Logs</h3>
        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Officer</label>
            <input
              type="text"
              placeholder="Filter by officer..."
              value={officer}
              onChange={(e) => setOfficer(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Project</label>
            <input
              type="text"
              placeholder="Filter by project..."
              value={project}
              onChange={(e) => setProject(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-950)' }}
            >
              <option value="">All Departments</option>
              <option value="PWD">PWD</option>
              <option value="Health">Health</option>
              <option value="Education">Education</option>
              <option value="Agriculture">Agriculture</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 12, border: '1px solid var(--gray-300)', background: 'var(--white)', color: 'var(--gray-900)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, height: 36, justifyContent: 'center' }}>
              Search
            </button>
            <button type="button" className="btn" onClick={handleReset} style={{ flex: 1, height: 36, justifyContent: 'center', background: 'var(--gray-100)', border: '1px solid var(--gray-300)' }}>
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* ── Logs Table Card ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Log History ({logs.length})</h3>
        </div>

        {error && <div className="error-msg" style={{ margin: 0, padding: '10px 12px', fontSize: 12 }}>{error}</div>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--gray-400)' }}>
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--gray-400)' }}>
            No audit records match the selected filter criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 8px' }}>Timestamp</th>
                  <th style={{ padding: '12px 8px' }}>Action Type</th>
                  <th style={{ padding: '12px 8px' }}>Project</th>
                  <th style={{ padding: '12px 8px' }}>Dept</th>
                  <th style={{ padding: '12px 8px' }}>Officer</th>
                  <th style={{ padding: '12px 8px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '14px 8px', color: 'var(--gray-600)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {log.timestamp}
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <span className={`badge ${getActionBadgeClass(log.action_type)}`} style={{ fontSize: 9 }}>
                        {log.action_type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', fontWeight: 600, fontSize: 12, color: 'var(--gray-800)' }}>
                      {log.project_name || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--gray-500)', fontSize: 12 }}>
                      {log.department || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--gray-700)', fontSize: 12, fontWeight: 500 }}>
                      {log.officer || 'System'}
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--gray-600)', fontSize: 12, maxWidth: 320, wordWrap: 'break-word' }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditPanel;
