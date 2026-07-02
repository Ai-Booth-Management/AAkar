'use client';

import { useState } from 'react';
import { createTaskAction, updateTaskStatusAction } from '@/app/boothman/actions';
import { CheckCircle, Clock, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TaskBoard({ tasks, volunteers }: { tasks: any[], volunteers: any[] }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navy = "#0f172a";
  const gold = "#D4AF37";
  const slate50 = "#f8fafc";
  const slate100 = "#f1f5f9";
  const slate200 = "#e2e8f0";
  const slate400 = "#94a3b8";
  const slate500 = "#64748b";
  const slate700 = "#334155";
  const slate900 = "#0f172a";
  const green50 = "#f0fdf4";
  const green200 = "#bbf7d0";
  const green700 = "#15803d";
  const amber50 = "#fffbeb";
  const amber200 = "#fde68a";
  const amber700 = "#b45309";

  const handleCreateTask = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const res = await createTaskAction(formData);
    setLoading(false);
    
    if (res?.error) {
      setError(res.error);
    } else {
      setIsCreating(false);
      router.refresh();
    }
  };

  const handleUpdateStatus = async (taskId: number, status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED') => {
    await updateTaskStatusAction(taskId, status);
    router.refresh();
  };

  return (
    <div style={{ backgroundColor: '#fff', border: `1px solid ${slate200}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${slate100}` }}>
        <h3 style={{ fontSize: '14px', fontWeight: 900, color: navy, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          {isCreating ? 'Create New Task' : 'Recent Tasks'}
        </h3>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          style={{ 
            backgroundColor: isCreating ? slate100 : navy, 
            color: isCreating ? slate700 : '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          {isCreating ? 'Cancel' : <><Plus size={14} color={gold} /> Create Task</>}
        </button>
      </div>
      
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {isCreating ? (
        <form action={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', fontWeight: 900, color: slate400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Title</label>
            <input 
              name="title" 
              type="text" 
              placeholder="e.g., Distribute Voter Slips" 
              style={{ width: '100%', backgroundColor: slate50, border: `1px solid ${slate200}`, borderRadius: '10px', padding: '12px 16px', fontSize: '13px', fontWeight: 600, outline: 'none' }}
              required 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', fontWeight: 900, color: slate400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Description</label>
            <textarea 
              name="description" 
              rows={3} 
              placeholder="Detailed instructions..." 
              style={{ width: '100%', backgroundColor: slate50, border: `1px solid ${slate200}`, borderRadius: '10px', padding: '12px 16px', fontSize: '13px', fontWeight: 500, outline: 'none', resize: 'vertical' }}
              required 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', fontWeight: 900, color: slate400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Assign To (Optional)</label>
            <select 
              name="assigneeId" 
              style={{ width: '100%', backgroundColor: slate50, border: `1px solid ${slate200}`, borderRadius: '10px', padding: '12px 16px', fontSize: '13px', fontWeight: 600, outline: 'none' }}
            >
              <option value="">Unassigned (Any volunteer can claim)</option>
              {volunteers.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.distanceKm !== undefined ? `(${v.distanceKm.toFixed(2)} km away)` : `(${v.phone})`}
                </option>
              ))}
            </select>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', backgroundColor: navy, color: '#fff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}
          >
            {loading ? 'Creating...' : 'Assign Task'}
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
          {tasks.map(task => {
            const isCompleted = task.status === 'COMPLETED';
            return (
              <div key={task.id} style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                backgroundColor: isCompleted ? green50 : slate50, 
                border: `1px solid ${isCompleted ? green200 : slate200}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: slate900 }}>{task.title}</div>
                  <span style={{ 
                    fontSize: '9px', fontWeight: 900, padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.1em',
                    backgroundColor: isCompleted ? '#dcfce7' : amber50,
                    color: isCompleted ? green700 : amber700,
                    border: `1px solid ${isCompleted ? green200 : amber200}`
                  }}>
                    {task.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: slate500, fontWeight: 500, lineHeight: 1.5 }}>
                  {task.description}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: `1px solid ${isCompleted ? green200 : slate200}` }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: slate400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {task.assignee ? `Assigned: ${task.assignee.name}` : 'Unassigned'}
                  </div>
                  {!isCompleted ? (
                    <button 
                      onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                      style={{ 
                        fontSize: '10px', fontWeight: 900, color: navy, backgroundColor: gold, padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}
                    >
                      <CheckCircle size={14} color={navy} /> Mark Done
                    </button>
                  ) : (
                    <div style={{ fontSize: '11px', fontWeight: 800, color: green700, display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <CheckCircle size={14} /> Verified
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: slate400, fontSize: '13px', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Clock size={32} color={slate200} />
              No tasks created yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
