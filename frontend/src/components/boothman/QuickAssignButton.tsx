'use client';

import { useState } from 'react';
import { createTaskAction } from '@/app/boothman/actions';

export default function QuickAssignButton({ assigneeId }: { assigneeId: number }) {
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleAssign = async () => {
    const title = window.prompt('Enter task title (e.g. Help at front desk):');
    if (!title) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', 'Quick task assigned from dashboard.');
    formData.append('assigneeId', assigneeId.toString());

    try {
      const res = await createTaskAction(formData);
      if (res?.error) {
        alert('Error: ' + res.error);
      } else {
        window.location.reload(); // Refresh to show the new task
      }
    } catch (err) {
      alert('Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleAssign}
      disabled={loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? '#fbbf24' : '#D4AF37', // brand/yellow-400
        color: '#0f172a', // aakar-navy
        fontWeight: 800,
        fontSize: '11px',
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.5 : 1,
        transition: 'background-color 0.2s',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}
    >
      {loading ? '...' : 'Assign Task'}
    </button>
  );
}
