"use client";

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import BoothDashboard from '../../components/dashboards/BoothDashboard';
import VolunteerDashboard from '../../components/dashboards/VolunteerDashboard';
import logo from '../../assets/logo.png';
import { useRouter } from 'next/navigation';
import LodgeComplaintPanel from '../../components/LodgeComplaintPanel';

export default function BoothUserPortal() {
  const { currentUser, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  if (loading) return <div>Initialising Secure Portal...</div>;
  if (!currentUser) {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const hierarchy = {
    state: currentUser.state_id,
    district: currentUser.district_id,
    constituency: currentUser.constituency_id,
    mandal: currentUser.mandal_id,
    booth: currentUser.booth_id
  };

  const userRole = (currentUser.role || '').toUpperCase();
  const isFieldUser = userRole === 'VOLUNTEER' || userRole === 'BOOTH' || userRole === 'BOOTH_PRESIDENT';

  if (!isFieldUser) {
    const boothId = currentUser.email ? currentUser.email.split('@')[0].split('_').slice(1).join('_') : null;
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ padding: '12px 40px', background: 'white', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--gray-500)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Terminate Session <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red-500)' }} />
          </button>
        </div>
        <div className="content" style={{ padding: '0' }}>
          <LodgeComplaintPanel boothId={boothId} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '70px' }}>
      <header style={{ padding: '16px 24px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={logo?.src || logo} alt="Logo" style={{ height: '28px' }} />
          <div style={{ height: '20px', width: '1px', backgroundColor: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: '10px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booth Intelligence Node</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{currentUser.booth_id || 'LOCAL_SECTOR'}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #fee2e2', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}>TERMINATE</button>
      </header>

      <main style={{ padding: '24px' }}>
        {userRole === 'BOOTH_PRESIDENT' ? (
          <BoothDashboard hierarchy={hierarchy} tab={activeTab} />
        ) : (
          <VolunteerDashboard tab={activeTab} />
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '12px 0', zIndex: 100 }}>
        <NavButton label="Home" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon="🏠" />
        <NavButton label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon="📋" />
        <NavButton label="Data" active={activeTab === 'households' || activeTab === 'surveys'} onClick={() => setActiveTab(userRole === 'BOOTH_PRESIDENT' ? 'households' : 'surveys')} icon="📊" />
        <NavButton label="Intel" active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} icon="🧠" />
      </nav>
    </div>
  );
}

function NavButton({ label, active, onClick, icon }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: active ? '#0f172a' : '#94a3b8', opacity: active ? 1 : 0.7 }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>{label}</span>
    </button>
  );
}
