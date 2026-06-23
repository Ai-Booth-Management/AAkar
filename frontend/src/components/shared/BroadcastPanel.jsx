import React, { useState, useEffect } from 'react';

const token = () => localStorage.getItem('token');
const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

export default function BroadcastPanel({ hierarchy }) {
  const [subordinates, setSubordinates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState('');
  const [broadcasts, setBroadcasts] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendAll, setSendAll] = useState(false);
  const [error, setError] = useState('');

  const fetchSubordinates = async () => {
    try {
      const res = await fetch('/api/v1/broadcasts/subordinates', { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      setSubordinates(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchBroadcasts = async () => {
    try {
      const res = await fetch('/api/v1/broadcasts/sent', { headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBroadcasts(Array.isArray(data) ? data : []);
      } else {
        setError(data.detail || `Server error (${res.status})`);
      }
    } catch (e) { 
      setError('Network error fetching broadcasts');
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSubordinates();
    fetchBroadcasts();
  }, []);

  const toggleRecipient = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    let ids = sendAll ? subordinates.map(s => s.id) : selectedIds;
    if (ids.length === 0) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/v1/broadcasts', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ message: message.trim(), recipient_ids: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage('');
        setSelectedIds([]);
        setSendAll(false);
        fetchBroadcasts();
      } else {
        setError(data.detail || `Server error (${res.status})`);
      }
    } catch (e) {
      setError('Network error — is the backend running?');
      console.error(e);
    }
    setSending(false);
  };

  const targetLabel = subordinates.length > 0 ? subordinates[0].role.replace(/_/g, ' ') : 'Recipients';

  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Broadcast</div>
          <div className="dash-page-subtitle">Send message to your subordinates</div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head"><h3>Compose Message</h3></div>
        <div className="dash-section-body">
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Target: {targetLabel} ({subordinates.length} available)
            </label>

            {subordinates.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 4, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={sendAll}
                    onChange={() => {
                      setSendAll(!sendAll);
                      if (!sendAll) setSelectedIds(subordinates.map(s => s.id));
                      else setSelectedIds([]);
                    }}
                  />
                  Send to All {targetLabel}
                </label>
                {subordinates.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 8px 32px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--gray-100)' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id) || sendAll}
                      disabled={sendAll}
                      onChange={() => toggleRecipient(s.id)}
                    />
                    <span style={{ fontWeight: 600 }}>{s.display_name}</span>
                    <span style={{ color: 'var(--gray-400)', fontSize: 11, marginLeft: 4 }}>({s.email})</span>
                  </label>
                ))}
              </div>
            )}

            {subordinates.length === 0 && (
              <div style={{ padding: 12, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 4, marginBottom: 12, fontSize: 12, color: 'var(--gray-500)', fontWeight: 600 }}>
                No subordinates found under your hierarchy.
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <textarea
            className="broadcast-area"
            rows={5}
            placeholder="Type your message here..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || !message.trim() || (selectedIds.length === 0 && !sendAll) || subordinates.length === 0}
            >
              {sending ? 'SENDING...' : `SEND TO ${sendAll ? 'ALL' : selectedIds.length} ${targetLabel.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head"><h3>Recent Broadcasts Sent</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Message</th>
                <th>To</th>
                <th>Role</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.length > 0 ? broadcasts.map((b, i) => (
                <tr key={b.id || i}>
                  <td style={{ fontWeight: 600 }}>{b.message}</td>
                  <td>{b.recipient_name || `User #${b.recipient_id}`}</td>
                  <td><span className="badge badge-low">{b.recipient_role}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                    {b.created_at ? new Date(b.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                    No broadcasts sent yet
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
