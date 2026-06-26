"use client";
import React, { useState, useEffect } from 'react';

const token = () => localStorage.getItem('token');
const h = () => ({ 'Authorization': `Bearer ${token()}` });

export default function Hub({ hierarchy, userRole }) {
  const [messages, setMessages] = useState([]);
  const [superior, setSuperior] = useState(null);
  const [stats, setStats] = useState(null);
  const [reportMsg, setReportMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canReport = userRole && userRole !== 'STATE_ADMIN' && userRole !== 'ELECTION_ADMIN';

  useEffect(() => {
    fetchMessages();
    fetchStats();
    if (canReport) fetchSuperior();
  }, []);

  const fetchStats = async () => {
    try {
      const level = hierarchy.booth ? 'booth' : hierarchy.mandal ? 'mandal' : hierarchy.constituency ? 'constituency' : 'state';
      const code = hierarchy.booth || hierarchy.mandal || hierarchy.constituency || '';
      const res = await fetch(`/api/v1/dashboard/stats?level=${level}&code=${code}`, { headers: h() });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/v1/broadcasts/hub', { headers: h() });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchSuperior = async () => {
    try {
      const res = await fetch('/api/v1/broadcasts/superior', { headers: h() });
      if (!res.ok) return;
      const data = await res.json();
      setSuperior(data);
    } catch (e) { console.error(e); }
  };

  const handleReport = async () => {
    if (!reportMsg.trim()) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/v1/broadcasts/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h() },
        body: JSON.stringify({ message: reportMsg.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReportMsg('');
        setSuccess('Report sent successfully');
        fetchMessages();
      } else {
        setError(data.detail || `Error ${res.status}`);
      }
    } catch {
      setError('Network error');
    }
    setSending(false);
  };

  const fromAbove = messages.filter(m => m.direction === 'from_above');
  const fromBelow = messages.filter(m => m.direction === 'from_below');
  const myReports = messages.filter(m => m.direction === 'my_report');

  const voterCount = stats?.voters || 0;
  const volunteerCount = stats?.volunteers || 0;

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Operational Overview</div>
          <div className="dash-page-subtitle">Center for Local Coordination</div>
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-head"><h3>Booth Vital Stats</h3></div>
          <div className="dash-section-body" style={{ fontSize: 12 }}>
            <div className="summary-row"><span className="summary-label">Registered Voters</span><span className="summary-value" style={{ color: 'var(--blue-600)', fontWeight: 800 }}>{voterCount}</span></div>
            <div className="summary-row"><span className="summary-label">Active Volunteers</span><span className="summary-value" style={{ color: 'var(--amber-600)', fontWeight: 800 }}>{volunteerCount}</span></div>
            <div className="summary-row"><span className="summary-label">Total Notifications</span><span className="summary-value">{messages.length}</span></div>
          </div>
        </div>

        {canReport && (
          <div className="dash-section">
            <div className="dash-section-head"><h3>Report an Issue</h3></div>
            <div className="dash-section-body">
              {superior ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', marginBottom: 8 }}>
                    Sending to: {superior.display_name} ({superior.role.replace(/_/g, ' ').toLowerCase()})
                  </div>
                  {error && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{error}</div>
                  )}
                  {success && (
                    <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#16a34a' }}>{success}</div>
                  )}
                  <textarea
                    rows={4}
                    placeholder="Describe the issue or message for your superior..."
                    value={reportMsg}
                    onChange={e => setReportMsg(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: 12, fontSize: 13, fontFamily: 'inherit' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleReport}
                    disabled={sending || !reportMsg.trim()}
                    style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                  >
                    {sending ? 'SENDING...' : '🚀 SEND REPORT'}
                  </button>
                </>
              ) : (
                <div style={{ padding: 12, fontSize: 12, color: 'var(--gray-500)', fontWeight: 600 }}>
                  No superior found for your role.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="dash-section" style={{ marginTop: 16 }}>
        <div className="dash-section-head"><h3>Communication Log</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Message</th>
                <th>From / To</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.length > 0 ? messages.map((m, i) => {
                let fromTo = '';
                let badgeStyle = {};
                let typeLabel = '';

                if (m.direction === 'from_above') {
                  typeLabel = 'From Above';
                  badgeStyle = { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };
                  fromTo = `${m.sender_name || `#${m.sender_id}`} → ${m.recipient_name || `#${m.recipient_id}`}`;
                } else if (m.direction === 'my_report') {
                  typeLabel = 'My Report';
                  badgeStyle = { background: '#fefce8', color: '#ca8a04', border: '1px solid #fef08a' };
                  fromTo = `To: ${m.recipient_name || `#${m.recipient_id}`}`;
                } else if (m.direction === 'from_below') {
                  typeLabel = 'From Below';
                  badgeStyle = { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' };
                  fromTo = `${m.sender_name || `#${m.sender_id}`} → ${m.recipient_name || `#${m.recipient_id}`}`;
                } else {
                  typeLabel = 'Message';
                  badgeStyle = { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' };
                  fromTo = `${m.sender_name || `#${m.sender_id}`} → ${m.recipient_name || `#${m.recipient_id}`}`;
                }

                return (
                  <tr key={m.id || i}>
                    <td><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, ...badgeStyle }}>{typeLabel}</span></td>
                    <td style={{ fontWeight: 600 }}>{m.message}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{fromTo}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                    No messages yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
