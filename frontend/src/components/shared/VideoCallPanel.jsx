import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';

const token = () => localStorage.getItem('token');
const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

export default function VideoCallPanel({ hierarchy, userRole }) {
  const { currentUser } = useAuth();
  const [subordinates, setSubordinates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  
  const [roomToken, setRoomToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [currentRoomName, setCurrentRoomName] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callElapsed, setCallElapsed] = useState(0);
  const callTimerRef = useRef(null);

  const HISTORY_PAGE_SIZE = 10;
  const [callPage, setCallPage] = useState(1);
  const [callTotalPages, setCallTotalPages] = useState(1);

  const fetchSubordinates = async () => {
    try {
      const res = await fetch('/api/v1/video-calls/subordinates', { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      setSubordinates(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchActiveCalls = async () => {
    try {
      const res = await fetch('/api/v1/video-calls/active', { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      setActiveCalls(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchCallHistory = async (p = callPage) => {
    try {
      const res = await fetch(`/api/v1/video-calls/history?page=${p}&page_size=${HISTORY_PAGE_SIZE}`, { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      setCallHistory(Array.isArray(data.items) ? data.items : []);
      setCallTotalPages(data.pages || 1);
      setCallPage(data.page || 1);
    } catch (e) { console.error(e); }
  };

  const deleteHistory = async () => {
    try {
      await fetch('/api/v1/video-calls/history', { method: 'DELETE', headers: headers() });
      setCallHistory([]);
      setCallPage(1);
      setCallTotalPages(1);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchSubordinates();
    fetchActiveCalls();
    fetchCallHistory();
    const interval = setInterval(fetchActiveCalls, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleRecipient = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === subordinates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subordinates.map(s => s.id));
    }
  };

  const startNewCall = async () => {
    if (selectedIds.length === 0) return;
    setIsConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/v1/video-calls/create-room', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ participant_ids: selectedIds })
      });
      const data = await res.json();
      if (res.ok) {
        setRoomToken(data.token);
        setLivekitUrl(data.livekit_url);
        setCurrentRoomName(data.room_name);
        setCallElapsed(0);
        callTimerRef.current = setInterval(() => setCallElapsed(prev => prev + 1), 1000);
      } else {
        setError(data.detail || 'Failed to create room');
      }
    } catch (e) {
      setError('Network error creating room');
    }
    setIsConnecting(false);
  };

  const joinExistingCall = async (roomName) => {
    setIsConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/v1/video-calls/token', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ room_name: roomName })
      });
      const data = await res.json();
      if (res.ok) {
        setRoomToken(data.token);
        setLivekitUrl(data.livekit_url);
        setCurrentRoomName(roomName);
        setCallElapsed(0);
        callTimerRef.current = setInterval(() => setCallElapsed(prev => prev + 1), 1000);
      } else {
        setError(data.detail || 'Failed to join room');
      }
    } catch (e) {
      setError('Network error joining room');
    }
    setIsConnecting(false);
  };

  const handleDisconnected = async () => {
    if (currentRoomName) {
      // Tell backend call is over (if initiator, this updates duration)
      try {
        await fetch('/api/v1/video-calls/end', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ room_name: currentRoomName })
        });
      } catch (e) { console.error(e); }
    }
    
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    setCallElapsed(0);
    setRoomToken(null);
    setLivekitUrl(null);
    setCurrentRoomName(null);
    setSelectedIds([]);
    fetchActiveCalls();
    fetchCallHistory();
  };

  const targetLabel = subordinates.length > 0 ? subordinates[0].role.replace(/_/g, ' ') : 'Subordinates';

  const formatElapsed = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
  };

  const initialsColors = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
  const getAvatarColor = (id) => initialsColors[id % initialsColors.length];

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: isFullscreen ? '1fr' : '300px 1fr 320px', gap: 16, height: 'calc(100vh - 120px)', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: Actions & Subordinates */}
      {!isFullscreen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflowY: 'auto' }}>
          
          {/* Active Calls to Join */}
        {activeCalls.filter(call => call.room_name !== currentRoomName).length > 0 && (
          <div className="dash-section" style={{ border: '1px solid var(--amber-500)', background: '#fffbeb', margin: 0 }}>
            <div className="dash-section-head" style={{ padding: '12px 16px', background: 'transparent', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
              <h3 style={{ color: 'var(--amber-700)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite' }} />
                Active Calls
              </h3>
            </div>
            <div className="dash-section-body" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeCalls.filter(call => call.room_name !== currentRoomName).map(call => (
                <div key={call.room_name} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'white', borderRadius: 6, border: '1px solid #fde68a' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy-900)' }}>{call.initiator_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{call.initiator_role.replace('_', ' ')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1, fontSize: 11, padding: '6px' }}
                      onClick={() => joinExistingCall(call.room_name)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? 'CONNECTING...' : 'JOIN CALL'}
                    </button>
                    {call.initiator_id === currentUser.id && (
                      <button 
                        className="btn" 
                        style={{ flex: 1, fontSize: 11, padding: '6px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                        onClick={async () => {
                          try {
                            await fetch('/api/v1/video-calls/end', {
                              method: 'POST',
                              headers: headers(),
                              body: JSON.stringify({ room_name: call.room_name })
                            });
                            fetchActiveCalls();
                            fetchCallHistory();
                          } catch (e) { console.error(e); }
                        }}
                      >
                        END CALL
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start New Call Section */}
        <div className="dash-section" style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="dash-section-head" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: 14 }}>Quick Actions</h3>
          </div>
          <div className="dash-section-body" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {error && (
              <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, marginBottom: 16, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', margin: 0 }}>
                  Start Call with {targetLabel}
                </label>
                {subordinates.length > 0 && (
                  <button 
                    className="btn" 
                    style={{ fontSize: 10, padding: '2px 6px', color: 'var(--navy-600)', background: 'var(--gray-100)', border: 'none' }}
                    onClick={toggleAll}
                  >
                    {selectedIds.length === subordinates.length ? 'DESELECT ALL' : 'SELECT ALL'}
                  </button>
                )}
              </div>
              {subordinates.length > 0 ? (
                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 4 }}>
                  {subordinates.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--gray-100)', background: selectedIds.includes(s.id) ? 'rgba(99,102,241,0.06)' : 'transparent', transition: 'background 0.2s' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleRecipient(s.id)}
                        style={{ width: 14, height: 14, display: 'none' }}
                      />
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: getAvatarColor(s.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0, border: selectedIds.includes(s.id) ? '2px solid var(--navy-600)' : '2px solid transparent', transition: 'border 0.2s' }}>
                        {selectedIds.includes(s.id) ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        ) : getInitials(s.display_name)}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{s.display_name}</div>
                        <div style={{ color: 'var(--gray-400)', fontSize: 10, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{s.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 12, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 4, fontSize: 12, color: 'var(--gray-500)', fontWeight: 600 }}>
                  No subordinates available.
                </div>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div style={{ marginBottom: 12, padding: '6px 12px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(99,102,241,0.15)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy-700)' }}>
                  {selectedIds.length} of {subordinates.length} selected
                </span>
                <div style={{ display: 'flex', gap: -8 }}>
                  {selectedIds.slice(0, 5).map((id, i) => {
                    const sub = subordinates.find(s => s.id === id);
                    return sub ? (
                      <div key={id} style={{ width: 22, height: 22, borderRadius: '50%', background: getAvatarColor(id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 8, fontWeight: 700, border: '2px solid white', marginLeft: i > 0 ? -6 : 0, position: 'relative', zIndex: 5 - i }}>
                        {getInitials(sub.display_name)}
                      </div>
                    ) : null;
                  })}
                  {selectedIds.length > 5 && (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 8, fontWeight: 700, border: '2px solid white', marginLeft: -6 }}>
                      +{selectedIds.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={startNewCall}
              disabled={isConnecting || selectedIds.length === 0}
              style={{ width: '100%', padding: '12px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              {isConnecting ? 'INITIALIZING...' : `START CALL (${selectedIds.length})`}
            </button>
          </div>
        </div>
        </div>
      )}

      {/* CENTER COLUMN: Video Area */}
      <div className="dash-section" style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column', background: roomToken ? '#0f172a' : 'var(--white)', overflow: 'hidden' }}>
        {roomToken && livekitUrl ? (
          <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 20px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{currentRoomName}</div>
                <div style={{ color: '#94a3b8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                    Live Call
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', fontWeight: 600, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4 }}>
                    {formatElapsed(callElapsed)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn" style={{ background: '#334155', color: 'white', fontWeight: 600, fontSize: 12, padding: '6px 14px' }} onClick={() => setIsFullscreen(!isFullscreen)}>
                  {isFullscreen ? 'COLLAPSE' : 'EXPAND'}
                </button>
                <button className="btn" style={{ background: '#dc2626', color: 'white', fontWeight: 700, fontSize: 12, padding: '6px 14px' }} onClick={handleDisconnected}>
                  END CALL
                </button>
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <LiveKitRoom
                video={true}
                audio={true}
                token={roomToken}
                serverUrl={livekitUrl}
                onDisconnected={handleDisconnected}
                data-lk-theme="default"
                style={{ height: '100%' }}
              >
                <VideoConference />
                <RoomAudioRenderer />
              </LiveKitRoom>
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', padding: 32, textAlign: 'center' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.5 }}><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            <h2 style={{ fontSize: 20, color: 'var(--gray-700)', marginBottom: 8 }}>Ready to connect</h2>
            <p style={{ fontSize: 14, maxWidth: 300 }}>Select team members from the left panel and click Start Call to begin a video conference.</p>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Call History */}
      {!isFullscreen && (
        <div className="dash-section" style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="dash-section-head" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14 }}>Call History</h3>
          {callHistory.length > 0 && (
            <button className="btn" style={{ fontSize: 10, padding: '4px 8px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }} onClick={deleteHistory}>
              CLEAR ALL
            </button>
          )}
        </div>
        <div className="dash-section-body" style={{ padding: 0, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {callHistory.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
              No past calls.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {callHistory.map(call => (
                <div key={call.room_name} style={{ padding: '16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', flexShrink: 0, fontWeight: 700, fontSize: 14 }}>
                    {call.initiator_name ? call.initiator_name[0].toUpperCase() : '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>
                        {call.initiator_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                        {new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 6 }}>
                      {call.initiator_role.replace('_', ' ')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600 }}>
                      {call.status === 'active' ? (
                        <>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                          <span style={{ color: '#059669' }}>In Progress</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          <span style={{ color: 'var(--gray-500)' }}>{Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</span>
                        </>
                      )}
                    </div>
                    
                    {/* Participants */}
                    {call.participant_names && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--gray-200)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>WITH</div>
                        <div style={{ display: 'flex', gap: -6 }}>
                          {call.participant_names.split(',').slice(0, 4).map((name, i) => (
                            <div key={i} title={name.trim()} style={{ width: 20, height: 20, borderRadius: '50%', background: getAvatarColor(i + 3), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 8, fontWeight: 700, border: '2px solid white', marginLeft: i > 0 ? -6 : 0, position: 'relative', zIndex: 4 - i, cursor: 'help' }}>
                              {getInitials(name.trim())}
                            </div>
                          ))}
                          {call.participant_names.split(',').length > 4 && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 8, fontWeight: 700, border: '2px solid white', marginLeft: -6, zIndex: 0 }}>
                              +{call.participant_names.split(',').length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {callTotalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} disabled={callPage <= 1} onClick={() => fetchCallHistory(callPage - 1)}>
              ‹ PREV
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)' }}>
              {callPage} / {callTotalPages}
            </span>
            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} disabled={callPage >= callTotalPages} onClick={() => fetchCallHistory(callPage + 1)}>
              NEXT ›
            </button>
          </div>
        )}
      </div>
      )}

    </div>
  );
}
