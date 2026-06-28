"use client";
import React, { useState, useEffect, useRef } from 'react';

const token = () => localStorage.getItem('token');
const h = () => ({ 'Authorization': `Bearer ${token()}` });

const ACCEPTED_TYPES = 'image/*,audio/*,.pdf,.doc,.docx';

const GOLD = '#D4AF37';
const NAVY = '#0f172a';
const NAVY_MID = '#1a2744';
const NAVY_LIGHT = '#3a4665';

function parseMediaUrls(mediaUrls) {
  if (!mediaUrls) return [];
  if (Array.isArray(mediaUrls)) return mediaUrls;
  try { const p = JSON.parse(mediaUrls); return Array.isArray(p) ? p : []; } catch { return []; }
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

const msgBadge = (dir) => {
  if (dir === 'from_above') return { bg: '#eef2ff', color: '#3b82f6', label: 'From Above' };
  if (dir === 'my_report') return { bg: '#fefce8', color: '#B8860B', label: 'My Report' };
  if (dir === 'from_below') return { bg: '#f0fdf4', color: '#16a34a', label: 'From Below' };
  if (dir === 'my_broadcast') return { bg: '#f5f3ff', color: '#7c3aed', label: 'My Broadcast' };
  return { bg: '#f5f3ff', color: '#7c3aed', label: 'Message' };
};

export default function Hub({ hierarchy, userRole }) {
  const [messages, setMessages] = useState([]);
  const [superior, setSuperior] = useState(null);
  const [stats, setStats] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [replyMedia, setReplyMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const replyRef = useRef(null);

  const [reportSubject, setReportSubject] = useState('');
  const [reportMsg, setReportMsg] = useState('');
  const [reportMedia, setReportMedia] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canReport = userRole && userRole !== 'STATE_ADMIN' && userRole !== 'ELECTION_ADMIN';
  const unreadCount = messages.filter(m => m.direction === 'from_above' && !m.is_read).length;

  useEffect(() => { fetchMessages(); fetchStats(); if (canReport) fetchSuperior(); }, []);

  useEffect(() => {
    if (replyTo && replyRef.current) {
      replyRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      replyRef.current.querySelector('textarea')?.focus();
    }
  }, [replyTo]);

  const fetchStats = async () => {
    try {
      const level = hierarchy.booth ? 'booth' : hierarchy.mandal ? 'mandal' : hierarchy.constituency ? 'constituency' : 'state';
      const code = hierarchy.booth || hierarchy.mandal || hierarchy.constituency || '';
      const res = await fetch(`/api/v1/dashboard/stats?level=${level}&code=${code}`, { headers: h() });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/v1/broadcasts/hub', { headers: h() });
      if (res.ok) { const data = await res.json(); setMessages(Array.isArray(data) ? data : []); }
    } catch (e) { console.error(e); }
  };

  const fetchSuperior = async () => {
    try {
      const res = await fetch('/api/v1/broadcasts/superior', { headers: h() });
      if (res.ok) setSuperior(await res.json());
    } catch (e) { console.error(e); }
  };

  const markAsRead = async (id) => {
    try { await fetch(`/api/v1/broadcasts/${encodeURIComponent(id)}/read`, { method: 'PATCH', headers: h() }); } catch (e) {}
  };

  const handleExpand = (id, msg) => {
    const isExpanded = expandedId === id;
    const next = isExpanded ? null : id;
    setExpandedId(next);
    setReplyTo(null);
    if (!isExpanded && msg && msg.direction === 'from_above' && !msg.is_read) {
      markAsRead(msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  const uploadFiles = async (files, setter) => {
    setUploading(true);
    setError('');
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
    setter(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const handleSendReply = async () => {
    if (!replyMsg.trim() || !replyTo) return;
    setSendingReply(true); setError('');
    try {
      const isUpward = replyTo.direction === 'from_above';
      const body = isUpward
        ? { subject: `Re: ${replyTo.subject || 'message'}`, message: replyMsg.trim(), media_urls: replyMedia.map(m => m.url) }
        : { subject: `Re: ${replyTo.subject || 'message'}`, message: replyMsg.trim(), recipient_ids: [replyTo.sender_id], media_urls: replyMedia.map(m => m.url) };
      const res = await fetch(isUpward ? '/api/v1/broadcasts/report' : '/api/v1/broadcasts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...h() }, body: JSON.stringify(body),
      });
      if (res.ok) { setReplyMsg(''); setReplyMedia([]); setReplyTo(null); setSuccess('Reply sent'); fetchMessages(); }
      else { const d = await res.json().catch(() => ({})); setError(d.detail || 'Failed'); }
    } catch { setError('Network error'); }
    setSendingReply(false);
  };

  const handleReport = async () => {
    if (!reportMsg.trim()) return;
    setSending(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/v1/broadcasts/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...h() },
        body: JSON.stringify({ subject: reportSubject.trim(), message: reportMsg.trim(), media_urls: reportMedia.map(m => m.url) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setReportSubject(''); setReportMsg(''); setReportMedia([]); setSuccess('Report sent'); fetchMessages(); }
      else setError(data.detail || `Error ${res.status}`);
    } catch { setError('Network error'); }
    setSending(false);
  };

  const voterCount = stats?.voters || 0;
  const volunteerCount = stats?.volunteers || 0;

  const msgCount = messages.length;

  return (
    <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Operational Hub</div>
          <div className="dash-page-subtitle">Central command & communication center</div>
        </div>
        {unreadCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 16px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>{unreadCount} UNREAD MESSAGE{unreadCount !== 1 ? 'S' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="dash-stat-dark" style={{ background: NAVY, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 24 }}>
          <div className="ds-label" style={{ color: '#94a3b8' }}>Registered Voters</div>
          <div className="ds-value" style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginTop: 8 }}>{voterCount.toLocaleString()}</div>
        </div>
        <div className="dash-stat-dark" style={{ background: NAVY, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 24 }}>
          <div className="ds-label" style={{ color: '#94a3b8' }}>Active Volunteers</div>
          <div className="ds-value" style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginTop: 8 }}>{volunteerCount}</div>
        </div>
        <div className="dash-stat-dark" style={{ background: NAVY, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 24 }}>
          <div className="ds-label" style={{ color: '#94a3b8' }}>Messages</div>
          <div className="ds-value" style={{ fontSize: 32, fontWeight: 900, color: GOLD, marginTop: 8 }}>{msgCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: canReport ? '1fr 1fr' : '1fr', gap: 24, marginBottom: 24 }}>
        {/* ── Report an Issue ── */}
        {canReport && (
          <div className="dash-section" style={{ borderTop: `3px solid ${GOLD}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="dash-section-head" style={{ borderBottomColor: '#e4e4e7' }}>
              <h3 style={{ color: NAVY }}>Report an Issue</h3>
              {superior && <span style={{ fontSize: 10, fontWeight: 700, color: NAVY_LIGHT, textTransform: 'uppercase' }}>To: {superior.display_name}</span>}
            </div>
            <div className="dash-section-body">
              {error && <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{error}</div>}
              {success && <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#16a34a' }}>{success}</div>}
              {superior ? (
                <>
                  <input type="text" placeholder="Subject" value={reportSubject} onChange={e => setReportSubject(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10, border: '1px solid #d4d4d8', borderRadius: 4, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }} />
                  <textarea rows={4} placeholder="Describe the issue..." value={reportMsg} onChange={e => setReportMsg(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d4d4d8', borderRadius: 4, padding: 12, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 4, background: '#f4f4f5', border: '1px solid #d4d4d8', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: NAVY_LIGHT }}>
                      📎 Attach Files
                      <input type="file" accept={ACCEPTED_TYPES} multiple onChange={e => uploadFiles(Array.from(e.target.files), setReportMedia)} style={{ display: 'none' }} disabled={uploading} />
                    </label>
                    {uploading && <span style={{ fontSize: 11, color: '#71717a', fontWeight: 600 }}>Uploading...</span>}
                  </div>
                  {reportMedia.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {reportMedia.map((m, idx) => (
                        <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f4f4f5', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, border: '1px solid #e4e4e7' }}>
                          {m.type?.startsWith('image/') ? '🖼️' : m.type?.startsWith('audio/') ? '🔊' : '📎'} {m.name}
                          <button onClick={() => setReportMedia(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button className="btn btn-primary" onClick={handleReport} disabled={sending || !reportMsg.trim()}
                    style={{ marginTop: 12, width: '100%', justifyContent: 'center', background: NAVY, color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 0', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    {sending ? 'TRANSMITTING...' : 'SEND REPORT'}
                  </button>
                </>
              ) : (
                <div style={{ padding: 12, fontSize: 12, color: '#71717a', fontWeight: 600 }}>No superior assigned.</div>
              )}
            </div>
          </div>
        )}

        {/* ── Quick Stats Card ── */}
        {canReport && (
          <div className="dash-section" style={{ borderTop: `3px solid ${NAVY_LIGHT}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="dash-section-head" style={{ borderBottomColor: '#e4e4e7' }}>
              <h3 style={{ color: NAVY }}>Overview</h3>
            </div>
            <div className="dash-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e4e4e7' }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NAVY_LIGHT }}>Messages from Above</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{messages.filter(m => m.direction === 'from_above').length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e4e4e7' }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NAVY_LIGHT }}>Reports from Below</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>{messages.filter(m => m.direction === 'from_below').length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e4e4e7' }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NAVY_LIGHT }}>My Reports</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#B8860B' }}>{messages.filter(m => m.direction === 'my_report').length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Communication Log ── */}
      <div className="dash-section" style={{ borderTop: `3px solid ${GOLD}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="dash-section-head" style={{ borderBottomColor: '#e4e4e7' }}>
          <h3 style={{ color: NAVY }}>Communication Log</h3>
          {unreadCount > 0 && <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 10 }}>{unreadCount} NEW</span>}
        </div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          {messages.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#a1a1aa' }}>No messages yet</div>
              <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>Incoming communications will appear here</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {messages.map((m, i) => {
                const isExpanded = expandedId === (m.id || i);
                const isReplying = replyTo?.id === (m.id || i);
                const badge = msgBadge(m.direction);
                const isUnread = m.direction === 'from_above' && !m.is_read;
                const fromTo = m.direction === 'my_report'
                  ? `To: ${m.recipient_name || `#${m.recipient_id}`}`
                  : m.direction === 'my_broadcast'
                    ? `To: Subordinates`
                    : `${m.sender_name || `#${m.sender_id}`}  →  ${m.recipient_name || `#${m.recipient_id}`}`;
                const hasMedia = parseMediaUrls(m.media_urls).length > 0;
                return (
                  <div key={m.id || i} style={{
                    borderLeft: `3px solid ${isUnread ? '#3b82f6' : 'transparent'}`,
                    borderBottom: '1px solid #e4e4e7',
                    background: isExpanded ? '#f8fafc' : isUnread ? '#f8faff' : '#fff',
                    transition: 'background 0.15s',
                  }}>
                    <div onClick={() => handleExpand(m.id || i, m)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', cursor: 'pointer',
                    }}>
                      <span style={{ fontSize: 9, color: '#a1a1aa', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                      {isUnread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />}
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 3, background: badge.bg, color: badge.color, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>{badge.label}</span>
                      <span style={{ flex: '1 1 auto', fontWeight: isUnread ? 800 : 700, fontSize: 13, color: isUnread ? NAVY : '#3f3f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.subject || <span style={{ color: '#a1a1aa', fontStyle: 'italic' }}>No subject</span>}
                      </span>
                      {hasMedia && <MediaThumbnails urls={m.media_urls} compact />}
                      <span style={{ flex: '0 0 auto', fontSize: 11, color: '#a1a1aa', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '0 20px 16px 52px', borderTop: '1px solid #e4e4e7' }}>
                        <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: '#71717a' }}>
                          <span style={{ fontWeight: 700, color: NAVY_LIGHT }}>{m.direction === 'my_report' ? 'TO' : 'FROM'}:</span>
                          <span style={{ fontWeight: 600 }}>{fromTo}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: 700, color: NAVY_LIGHT }}>SENT:</span>
                          <span style={{ fontWeight: 600 }}>{m.created_at ? new Date(m.created_at).toLocaleString('en-IN') : '—'}</span>
                        </div>
                        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7, color: '#3f3f46', whiteSpace: 'pre-wrap', background: '#fff', padding: 14, borderRadius: 6, border: '1px solid #e4e4e7' }}>
                          {m.message}
                        </div>
                        <MediaThumbnails urls={m.media_urls} />
                        {m.direction !== 'my_report' && (
                          <div style={{ marginTop: 12 }}>
                            {isReplying ? (
                              <div ref={replyRef} style={{ background: '#fff', border: '1px solid #d4d4d8', borderRadius: 6, padding: 14, borderLeft: `3px solid ${GOLD}` }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: NAVY_LIGHT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Reply — {m.direction === 'from_above' ? 'To Superior' : m.sender_name}
                                </div>
                                <textarea rows={3} placeholder="Type your reply..." value={replyMsg} onChange={e => setReplyMsg(e.target.value)}
                                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d4d4d8', borderRadius: 4, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 4, background: '#f4f4f5', border: '1px solid #d4d4d8', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: NAVY_LIGHT }}>
                                    📎 Attach
                                    <input type="file" accept={ACCEPTED_TYPES} multiple onChange={e => uploadFiles(Array.from(e.target.files), setReplyMedia)} style={{ display: 'none' }} disabled={uploading} />
                                  </label>
                                  {uploading && <span style={{ fontSize: 11, color: '#71717a', fontWeight: 600 }}>Uploading...</span>}
                                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                    <button onClick={() => { setReplyTo(null); setReplyMsg(''); setReplyMedia([]); }}
                                      style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, background: '#fff', border: '1px solid #d4d4d8', borderRadius: 4, cursor: 'pointer' }}>CANCEL</button>
                                    <button onClick={handleSendReply} disabled={sendingReply || !replyMsg.trim()}
                                      style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, background: NAVY, color: '#fff', border: 'none', borderRadius: 4, cursor: sendingReply || !replyMsg.trim() ? 'not-allowed' : 'pointer', opacity: sendingReply || !replyMsg.trim() ? 0.6 : 1 }}>
                                      {sendingReply ? 'SENDING...' : 'SEND REPLY'}
                                    </button>
                                  </div>
                                </div>
                                {replyMedia.length > 0 && (
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                    {replyMedia.map((rm, idx) => (
                                      <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f4f4f5', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, border: '1px solid #e4e4e7' }}>
                                        {rm.type?.startsWith('image/') ? '🖼️' : rm.type?.startsWith('audio/') ? '🔊' : '📎'} {rm.name}
                                        <button onClick={() => setReplyMedia(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); setReplyTo(m); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', fontSize: 12, fontWeight: 700, background: '#fff', border: `1px solid ${GOLD}`, color: NAVY, borderRadius: 4, cursor: 'pointer' }}>
                                ↩ REPLY
                              </button>
                            )}
                          </div>
                        )}
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
