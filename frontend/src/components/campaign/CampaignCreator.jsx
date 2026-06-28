"use client";
import React, { useState, useEffect, useRef } from 'react';

const API = '/api/v1';
const navy = '#04122e';
const saffron = '#D4A843';

const ROLE_OPTIONS = [
  { value: 'VOLUNTEER', label: 'All Volunteers' },
  { value: 'BOOTH_PRESIDENT', label: 'Booth Presidents' },
  { value: 'MANDAL_MGR', label: 'Mandal Managers' },
  { value: 'CONSTITUENCY_MGR', label: 'Constituency Managers' },
  { value: 'DISTRICT_ADMIN', label: 'District Admins' },
];

const CampaignCreator = ({
  isOpen,
  onClose,
  selectedLocation,
  onCampaignCreated,
  selectedDistrict,
  selectedConstit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedRole, setAssignedRole] = useState('VOLUNTEER');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subordinateCount, setSubordinateCount] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const titleRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setAssignedRole('VOLUNTEER');
      setBroadcastMessage(`New campaign launched in ${selectedLocation?.district || selectedDistrict || 'Delhi'}${selectedLocation?.constituency || selectedConstit ? ` - ${selectedLocation?.constituency || selectedConstit}` : ''}. Check the campaign dashboard for details.`);
      setScheduledAt('');
      setError('');
      setSuccess('');
      setSubmitting(false);
      fetchSubordinateCount();
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen, selectedLocation, selectedDistrict, selectedConstit]);

  const fetchSubordinateCount = async () => {
    try {
      const r = await fetch(`${API}/campaign/subordinates/count`);
      if (r.ok) {
        const data = await r.json();
        setSubordinateCount(data);
      }
    } catch {}
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Campaign title is required');
      return;
    }
    if (!selectedLocation) {
      setError('Please select a location on the map first');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: selectedLocation.address || `Location at ${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`,
        assigned_role: assignedRole,
        district: selectedLocation.district || selectedDistrict || null,
        constituency: selectedLocation.constituency || selectedConstit || null,
        broadcast_message: broadcastMessage.trim() || null,
        scheduled_at: scheduledAt || null,
      };

      const r = await fetch(`${API}/campaign/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create campaign');
      }

      const campaign = await r.json();
      setSuccess(`Campaign "${campaign.title}" launched! Broadcast sent to subordinates + WhatsApp notified to area volunteers.`);
      if (onCampaignCreated) {
        onCampaignCreated(campaign);
      }
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#ffffff',
          borderRadius: 8,
          zIndex: 9999,
          width: 480,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: '"Public Sans", "Inter", sans-serif',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: navy, fontSize: 16, fontWeight: 900, letterSpacing: '-0.02em' }}>
              Launch New Campaign
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
              {selectedLocation
                ? `📍 ${selectedLocation.address?.substring(0, 60) || 'Location selected'}`
                : 'Drop a pin on the map to select a location'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, fontSize: 12, color: '#dc2626' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 12, color: '#16a34a' }}>
              {success}
            </div>
          )}

          <div>
            <label style={{ fontSize: 10, fontWeight: 800, color: navy, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Campaign Title *
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Door-to-door awareness drive"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 800, color: navy, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the campaign objectives, tasks, and any instructions..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 800, color: navy, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Assign To
            </label>
            <select
              value={assignedRole}
              onChange={e => setAssignedRole(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                outline: 'none',
                background: 'white',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {subordinateCount && (
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                {subordinateCount.total} subordinates in your hierarchy
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 800, color: navy, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Schedule Date / Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 800, color: navy, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Broadcast Message
              <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>(auto-sent to all subordinates + WhatsApp to area volunteers)</span>
            </label>
            <textarea
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              placeholder="Customize the message that will be sent to all your subordinates..."
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {selectedLocation && (
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569' }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: navy, fontSize: 10, textTransform: 'uppercase' }}>Selected Location</div>
              <div>Lat: {selectedLocation.lat.toFixed(5)}, Lng: {selectedLocation.lng.toFixed(5)}</div>
              {selectedLocation.district && <div>District: {selectedLocation.district}</div>}
              {selectedLocation.constituency && <div>Constituency: {selectedLocation.constituency}</div>}
              {selectedLocation.ward && <div>Ward: {selectedLocation.ward}</div>}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: 12,
              fontWeight: 800,
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '10px 24px',
              fontSize: 12,
              fontWeight: 800,
              background: submitting ? '#94a3b8' : saffron,
              color: navy,
              border: 'none',
              borderRadius: 4,
              cursor: submitting ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {submitting ? (
              <>
                <span style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: navy, borderRadius: '50%', animation: 'camp-spin 0.6s linear infinite' }} />
                Creating...
              </>
            ) : (
              'Launch Campaign'
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default CampaignCreator;
