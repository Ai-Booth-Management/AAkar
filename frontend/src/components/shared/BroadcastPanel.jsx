import React, { useState, useEffect } from 'react';

const token = () => localStorage.getItem('token');
const headers = () => ({ 'Authorization': `Bearer ${token()}` });

const ACCEPTED_TYPES = 'image/*,audio/*,.pdf,.doc,.docx';
const GOLD = '#D4AF37';
const NAVY = '#0f172a';
const NAVY_MID = '#1a2744';
const NAVY_LIGHT = '#3a4665';

function parseMediaUrls(urls) {
  if (!urls) return [];
  if (Array.isArray(urls)) return urls;
  try { const p = JSON.parse(urls); return Array.isArray(p) ? p : []; } catch { return []; }
}

function MediaThumbnails({ urls, compact }) {
  const list = parseMediaUrls(urls);
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: compact ? 0 : 6 }}>
      {list.map((url, i) => {
        const isImage = url.match(/\.(png|jpg|jpeg|gif|webp|svg)/i);
        const isAudio = url.match(/\.(mp3|wav|ogg|m4a|aac)/i);
        if (compact && isImage) return <img key={i} src={url} alt="" style={{ height: 22, width: 22, borderRadius: 3, objectFit: 'cover', border: '1px solid #e4e4e7' }} />;
        if (compact && isAudio) return <span key={i} style={{ fontSize: 12, color: NAVY_LIGHT }}>🔊</span>;
        if (compact) return <span key={i} style={{ fontSize: 11, color: NAVY_LIGHT }}>📎</span>;
        return (
          <div key={i}>
            {isImage ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" style={{ height: 40, borderRadius: 4, border: '1px solid #e4e4e7' }} /></a>
            : isAudio ? <audio controls style={{ height: 32, width: 160 }}><source src={url} /></audio>
            : <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: NAVY_LIGHT, fontWeight: 600 }}>📎 View Attachment</a>}
          </div>
        );
      })}
    </div>
  );
}

export default function BroadcastPanel({ hierarchy }) {
  const [subordinates, setSubordinates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [broadcasts, setBroadcasts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendAll, setSendAll] = useState(false);
  const [error, setError] = useState('');

  const fetchSubordinates = async () => {
    try {
      const res = await fetch('/api/v1/broadcasts/subordinates', { headers: headers() });
      if (!res.ok) return;
      const data = await res.json(); setSubordinates(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchBroadcasts = async () => {
    try {
      const res = await fetch('/api/v1/broadcasts/sent', { headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setBroadcasts(Array.isArray(data) ? data : []);
      else setError(data.detail || `Server error (${res.status})`);
    } catch (e) { setError('Network error'); console.error(e); }
  };

  const groupedBroadcasts = (() => {
    const groups = {};
    for (const b of broadcasts) {
      const key = `${b.message || ''}|${b.subject || ''}`;
      if (!groups[key]) groups[key] = { ...b, recipients: [b], groupCount: 1, groupIds: [b.id] };
      else {
        groups[key].recipients.push(b);
        groups[key].groupCount++;
        if (b.id) groups[key].groupIds.push(b.id);
      }
    }
    return Object.values(groups);
  })();

  useEffect(() => { fetchSubordinates(); fetchBroadcasts(); }, []);

  const toggleRecipient = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleMediaSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true); setError('');
    const uploaded = [];
    for (const file of files) {
      try {
        const fd = new FormData(); fd.append('file', file);
        const res = await fetch('/api/v1/broadcasts/upload-media', {
          method: 'POST', headers: { 'Authorization': `Bearer ${token()}` }, body: fd,
        });
        const data = await res.json();
        if (res.ok) uploaded.push({ url: data.media_url, name: file.name, type: file.type });
        else setError(data.detail || `Failed to upload ${file.name}`);
      } catch { setError(`Network error uploading ${file.name}`); }
    }
    setMediaFiles(prev => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = '';
  };

  const removeMedia = (idx) => setMediaFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSend = async () => {
    if (!message.trim()) return;
    const ids = sendAll ? subordinates.map(s => s.id) : selectedIds;
    if (!ids.length) return;
    setSending(true); setError('');
    try {
      const res = await fetch('/api/v1/broadcasts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), recipient_ids: ids, media_urls: mediaFiles.map(m => m.url) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setSubject(''); setMessage(''); setMediaFiles([]); setSelectedIds([]); setSendAll(false); fetchBroadcasts(); }
      else setError(data.detail || `Server error (${res.status})`);
    } catch { setError('Network error'); }
    setSending(false);
  };

  const targetLabel = subordinates.length > 0 ? subordinates[0].role.replace(/_/g, ' ') : 'Recipients';
  const targetLabelUpper = targetLabel.toUpperCase();

  return (
    <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Broadcast Centre</div>
          <div className="dash-page-subtitle">Send official communications to your field units</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* ── Compose Section ── */}
        <div className="dash-section" style={{ borderTop: `3px solid ${GOLD}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="dash-section-head" style={{ borderBottomColor: '#e4e4e7' }}>
            <h3 style={{ color: NAVY }}>Compose Message</h3>
            <span style={{ fontSize: 10, fontWeight: 800, color: NAVY_LIGHT, textTransform: 'uppercase' }}>{subordinates.length} available</span>
          </div>
          <div className="dash-section-body">
            {error && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{error}</div>
            )}

            {/* Recipient Selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: NAVY_LIGHT, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Recipients — {targetLabel}
              </label>
              {subordinates.length > 0 ? (
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #d4d4d8', borderRadius: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f4f4f5', borderBottom: '1px solid #e4e4e7', cursor: 'pointer', fontWeight: 800, fontSize: 11 }}>
                    <input type="checkbox" checked={sendAll}
                      onChange={() => { setSendAll(!sendAll); setSelectedIds(sendAll ? [] : subordinates.map(s => s.id)); }} />
                    Send to All {targetLabel}
                  </label>
                  {subordinates.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 7px 32px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f4f4f5' }}>
                      <input type="checkbox" checked={selectedIds.includes(s.id) || sendAll} disabled={sendAll} onChange={() => toggleRecipient(s.id)} />
                      <span style={{ fontWeight: 700, color: '#3f3f46' }}>{s.display_name}</span>
                      <span style={{ color: '#a1a1aa', fontSize: 11, marginLeft: 4 }}>({s.email})</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 12, background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: 4, fontSize: 12, color: '#71717a', fontWeight: 600 }}>
                  No subordinates under your command.
                </div>
              )}
            </div>

            <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10, border: '1px solid #d4d4d8', borderRadius: 4, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }} />

            <textarea rows={5} placeholder="Type your message..." value={message} onChange={e => setMessage(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d4d4d8', borderRadius: 4, padding: 12, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, marginBottom: 10, alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 4, background: '#f4f4f5', border: '1px solid #d4d4d8', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: NAVY_LIGHT }}>
                📎 Attach Media
                <input type="file" accept={ACCEPTED_TYPES} multiple onChange={handleMediaSelect} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {uploading && <span style={{ fontSize: 11, color: '#71717a', fontWeight: 600 }}>Uploading...</span>}
            </div>

            {mediaFiles.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {mediaFiles.map((m, idx) => (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f4f4f5', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, border: '1px solid #e4e4e7' }}>
                    {m.type?.startsWith('image/') ? '🖼️' : m.type?.startsWith('audio/') ? '🔊' : '📎'}
                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                    <button onClick={() => removeMedia(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}

            <button onClick={handleSend} disabled={sending || uploading || !message.trim() || (!selectedIds.length && !sendAll) || !subordinates.length}
              style={{ marginTop: 4, width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 13, fontWeight: 700, background: NAVY, color: '#fff', border: 'none', borderRadius: 4, cursor: sending || uploading || !message.trim() || (!selectedIds.length && !sendAll) || !subordinates.length ? 'not-allowed' : 'pointer', opacity: sending || uploading || !message.trim() || (!selectedIds.length && !sendAll) || !subordinates.length ? 0.6 : 1 }}>
              {sending ? 'TRANSMITTING...' : `SEND TO ${sendAll ? 'ALL' : selectedIds.length} ${targetLabelUpper}`}
            </button>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className="dash-section" style={{ borderTop: `3px solid ${NAVY_LIGHT}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="dash-section-head" style={{ borderBottomColor: '#e4e4e7' }}>
            <h3 style={{ color: NAVY }}>Transmission Log</h3>
          </div>
          <div className="dash-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NAVY_LIGHT }}>Total Broadcasts</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: NAVY }}>{broadcasts.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NAVY_LIGHT }}>Subordinates</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>{subordinates.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NAVY_LIGHT }}>Target Role</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: NAVY_MID }}>{targetLabelUpper}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Broadcasts ── */}
      <div className="dash-section" style={{ borderTop: `3px solid ${GOLD}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="dash-section-head" style={{ borderBottomColor: '#e4e4e7' }}>
          <h3 style={{ color: NAVY }}>Recent Broadcasts Sent</h3>
          {groupedBroadcasts.length > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: NAVY_LIGHT }}>{groupedBroadcasts.length} TRANSMISSION{groupedBroadcasts.length !== 1 ? 'S' : ''}</span>}
        </div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          {groupedBroadcasts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#a1a1aa' }}>No broadcasts sent</div>
              <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>Your outgoing transmissions will appear here</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {groupedBroadcasts.map((g) => {
                const groupKey = g.groupIds?.[0] || g.recipients[0]?.id || g.groupCount;
                const isExpanded = expandedId === groupKey;
                const hasMedia = parseMediaUrls(g.media_urls).length > 0;
                const unreadCount = g.recipients.filter(r => !r.is_read).length;
                return (
                  <div key={groupKey} style={{
                    borderLeft: `3px solid ${isExpanded ? GOLD : 'transparent'}`,
                    borderBottom: '1px solid #e4e4e7',
                    background: isExpanded ? '#f8fafc' : '#fff',
                    transition: 'background 0.15s',
                  }}>
                    <div onClick={() => setExpandedId(isExpanded ? null : groupKey)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', cursor: 'pointer',
                    }}>
                      <span style={{ fontSize: 9, color: '#a1a1aa', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 3, background: '#eef2ff', color: '#3b82f6', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
                        {g.recipient_role?.replace(/_/g, ' ') || 'BROADCAST'}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 3, background: '#f0fdf4', color: '#16a34a', whiteSpace: 'nowrap' }}>
                        ×{g.groupCount}
                      </span>
                      <span style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 13, color: '#3f3f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.subject || <span style={{ color: '#a1a1aa', fontStyle: 'italic' }}>No subject</span>}
                      </span>
                      <MediaThumbnails urls={g.media_urls} compact />
                      {unreadCount > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 3, background: '#fef2f2', color: '#dc2626', whiteSpace: 'nowrap' }}>
                          {unreadCount} NEW
                        </span>
                      )}
                      <span style={{ flex: '0 0 auto', fontSize: 11, color: '#a1a1aa', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {g.created_at ? new Date(g.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '0 20px 16px 52px', borderTop: '1px solid #e4e4e7' }}>
                        <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: '#71717a' }}>
                          <span style={{ fontWeight: 700, color: NAVY_LIGHT }}>TO:</span>
                          <span style={{ fontWeight: 600 }}>{g.recipients.length} recipient{g.recipients.length !== 1 ? 's' : ''}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: 700, color: NAVY_LIGHT }}>SENT:</span>
                          <span style={{ fontWeight: 600 }}>{g.created_at ? new Date(g.created_at).toLocaleString('en-IN') : '—'}</span>
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {g.recipients.map((r, ri) => (
                            <span key={ri} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: r.is_read ? '#f0fdf4' : '#fef2f2', color: r.is_read ? '#16a34a' : '#dc2626' }}>
                              {r.recipient_name || `User #${r.recipient_id}`} {r.is_read ? '✓' : '◉'}
                            </span>
                          ))}
                        </div>
                        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7, color: '#3f3f46', whiteSpace: 'pre-wrap', background: '#fff', padding: 14, borderRadius: 6, border: '1px solid #e4e4e7' }}>
                          {g.message}
                        </div>
                        <MediaThumbnails urls={g.media_urls} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
