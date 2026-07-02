'use client';

import { updateTaskStatusAction } from '@/app/boothman/actions';
import { CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VolunteerTaskBoard({ tasks }: { tasks: any[] }) {
  const router = useRouter();

  const navy = "#0f172a";
  const gold = "#D4AF37";
  const slate50 = "#f8fafc";
  const slate100 = "#f1f5f9";
  const slate200 = "#e2e8f0";
  const slate400 = "#94a3b8";
  const slate500 = "#64748b";
  const slate900 = "#0f172a";
  const green50 = "#f0fdf4";
  const green100 = "#dcfce7";
  const green200 = "#bbf7d0";
  const green700 = "#15803d";
  const amber50 = "#fffbeb";
  const amber200 = "#fde68a";
  const amber700 = "#b45309";
  const white = "#ffffff";

  const handleUpdateStatus = async (taskId: number, status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED') => {
    await updateTaskStatusAction(taskId, status);
    router.refresh();
  };

  return (
    <div style={{ backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${slate100}` }}>
        <h3 style={{ fontSize: '14px', fontWeight: 900, color: navy, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          My Active Tasks
        </h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
        {tasks.map(task => {
          const isCompleted = task.status === 'COMPLETED';
          return (
            <div key={task.id} style={{ 
              padding: '20px', 
              borderRadius: '16px', 
              backgroundColor: isCompleted ? green50 : white, 
              border: `1px solid ${isCompleted ? green200 : slate200}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 900, fontSize: '15px', color: slate900 }}>{task.title}</div>
                <span style={{ 
                  fontSize: '9px', fontWeight: 900, padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.1em',
                  backgroundColor: isCompleted ? green100 : amber50,
                  color: isCompleted ? green700 : amber700,
                  border: `1px solid ${isCompleted ? green200 : amber200}`
                }}>
                  {task.status}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: slate500, fontWeight: 500, lineHeight: 1.6, marginBottom: '8px' }}>
                {task.description}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: `1px solid ${isCompleted ? green200 : slate100}` }}>
                {!isCompleted ? (
                  <button 
                    onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                    style={{ 
                      fontSize: '11px', fontWeight: 900, color: navy, backgroundColor: gold, padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <CheckCircle size={16} color={navy} /> Mark as Complete
                  </button>
                ) : (
                  <div style={{ fontSize: '12px', fontWeight: 800, color: green700, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: green100, padding: '8px 16px', borderRadius: '10px' }}>
                    <CheckCircle size={16} /> Verified Done
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', backgroundColor: white, borderRadius: '16px', border: `2px dashed ${slate200}`, color: slate400, fontSize: '13px', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Clock size={40} color={slate200} style={{ marginBottom: '8px' }} />
            <p style={{ fontWeight: 800, color: slate500, fontSize: '15px' }}>You have no pending tasks today.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Check back later or contact your coordinator.</p>
          </div>
        )}
      </div>
    </div>
  );
}
