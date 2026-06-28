import React from 'react';

const navy = '#04122e';
const saffron = '#D4A843';

const VolunteerList = ({
  selectedVol,
  setSelectedVol,
  newTaskText,
  setNewTaskText,
  newTaskStatus,
  setNewTaskStatus,
  handleSaveTask,
  loading,
  filteredVolunteersList,
  handleMarkCovered,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {selectedVol && (
        <div style={{ border: '1px solid #cbd5e1', padding: 12, borderRadius: 4, background: '#f8fafc', marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
            <h4 style={{ margin: 0, color: navy, fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Assign Task to Volunteer</h4>
            <button onClick={() => setSelectedVol(null)} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer', color: '#64748b', fontWeight: '800' }}>×</button>
          </div>
          
          <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, color: '#334155' }}>
            <div><strong>Name:</strong> {selectedVol.name}</div>
            <div><strong>Phone:</strong> {selectedVol.phone}</div>
            <div><strong>District:</strong> {selectedVol.district}</div>
            <div><strong>Constituency:</strong> {selectedVol.constituency || 'None'}</div>
            <div><strong>Area:</strong> {selectedVol.assigned_area}</div>
            <div><strong>Current Task:</strong> {selectedVol.assigned_task || 'None'}</div>
            <div>
              <strong>Status:</strong>{' '}
              <span style={{
                textTransform: 'uppercase',
                fontWeight: 'bold',
                color: selectedVol.task_status === 'completed' ? '#22c55e'
                     : selectedVol.task_status === 'accepted' ? '#3b82f6'
                     : selectedVol.task_status === 'assigned' ? '#0f172a'
                     : '#64748b'
              }}>
                {selectedVol.task_status || 'unassigned'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
            <div>
              <label style={{ fontSize: 9, fontWeight: '800', color: navy, display: 'block', marginBottom: 3 }}>ASSIGN NEW TASK</label>
              <input 
                type="text" 
                value={newTaskText} 
                onChange={(e) => setNewTaskText(e.target.value)} 
                placeholder="Enter task details..."
                style={{ width: '100%', padding: '5px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: '800', color: navy, display: 'block', marginBottom: 3 }}>STATUS</label>
              <select 
                value={newTaskStatus} 
                onChange={(e) => setNewTaskStatus(e.target.value)} 
                style={{ width: '100%', padding: '5px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
              >
                <option value="unassigned">Unassigned (Grey)</option>
                <option value="assigned">Assigned (White)</option>
                <option value="accepted">Accepted (Blue)</option>
                <option value="completed">Completed (Green)</option>
              </select>
            </div>
            <button 
              onClick={handleSaveTask}
              style={{ padding: '6px 10px', fontSize: 10, fontWeight: '800', background: navy, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 2, display: 'block', width: '100%' }}
            >
              Save Task & Status
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>Loading volunteers…</div>
      ) : filteredVolunteersList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>No volunteers in this area.</div>
      ) : (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
            Volunteers ({filteredVolunteersList.length})
          </div>
          {filteredVolunteersList.map(v => {
            const taskStatus = v.task_status || 'unassigned';
            const color = taskStatus === 'completed' ? '#22c55e'
                        : taskStatus === 'accepted' ? '#3b82f6'
                        : taskStatus === 'assigned' ? '#0f172a'
                        : '#64748b';
            return (
              <div key={v.id} onClick={() => { setSelectedVol(v); }}
                style={{
                  padding: '10px 12px', borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${selectedVol?.id === v.id ? saffron : '#e2e8f0'}`,
                  background: selectedVol?.id === v.id ? '#fef3c7' : 'white',
                  transition: 'all .12s'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: navy }}>{v.name}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 2, background: v.status === 'active' ? '#dcfce7' : '#f3f4f6', color: v.status === 'active' ? '#166534' : '#6b7280', textTransform: 'uppercase' }}>{v.status}</span>
                    <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 2, background: taskStatus === 'completed' ? '#dcfce7' : taskStatus === 'accepted' ? '#eff6ff' : taskStatus === 'assigned' ? '#f3f4f6' : '#f9fafb', color: color, textTransform: 'uppercase', border: taskStatus === 'assigned' ? '1px solid #cbd5e1' : 'none' }}>
                      {taskStatus}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', margin: '3px 0' }}>📍 {v.assigned_area}</div>
                {v.assigned_task && <div style={{ fontSize: 11, color: '#0f172a', fontStyle: 'italic' }}>📝 {v.assigned_task}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>{v.phone}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{v.last_location_update ? new Date(v.last_location_update).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}) : '—'}</span>
                </div>
                {v.coverage_status !== 'covered' && (
                  <button onClick={(e) => { e.stopPropagation(); handleMarkCovered(v.id); }} style={{
                    marginTop: 6, padding: '3px 10px', fontSize: 10, fontWeight: 800,
                    background: '#2563eb', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer',
                  }}>Mark Area Covered</button>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default VolunteerList;
