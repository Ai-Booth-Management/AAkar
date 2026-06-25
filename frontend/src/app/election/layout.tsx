"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import logo from '../../assets/logo.png';
import { ROLE_NAV, ROLE_TITLES } from '../../config/navigation';

export default function ElectionLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading || !currentUser) {
    return <div className="loading-state">Authenticating Election Node...</div>;
  }

  const userRole = (currentUser.role || 'VOLUNTEER').toUpperCase();
  const isFieldWorker = userRole === 'VOLUNTEER';

  const hierarchy = {
    state: currentUser.state_id,
    district: currentUser.district_id,
    constituency: currentUser.constituency_id,
    mandal: currentUser.mandal_id,
    booth: currentUser.booth_id
  };

  const getScope = () => {
    if (hierarchy.booth) return { role: 'BOOTH_NODE', scope: hierarchy.booth };
    if (hierarchy.mandal) return { role: 'MANDAL_MANAGER', scope: hierarchy.mandal };
    if (hierarchy.constituency) return { role: 'CONSTITUENCY_CMD', scope: hierarchy.constituency };
    if (hierarchy.district) return { role: 'DISTRICT_ADMIN', scope: hierarchy.district };
    if (hierarchy.state) return { role: 'STATE_CONTROL', scope: hierarchy.state };
    return { role: 'NATIONAL_NODE', scope: 'GLOBAL' };
  };

  const { role: scopeRole, scope: scopeName } = getScope();
  const pageTitle = ROLE_TITLES[userRole as keyof typeof ROLE_TITLES] || 'Politix OS';

  const handleTabClick = (tabId: string) => {
    router.push(`/election?tab=${tabId}`);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const activeNavItem = (ROLE_NAV[userRole as keyof typeof ROLE_NAV] || []).find((n: { id: string }) => n.id === activeTab);

  return (
    <div className="app">
      <style>{`.sidebar:not(:hover) .sidebar-brand img { opacity: 0; visibility: hidden; }`}</style>
      {!isFieldWorker && (
        <div className="sidebar expanded">
          <div className="sidebar-top">
            <div className="sidebar-brand" style={{ padding: '16px 20px' }}>
                <img src={logo.src} alt="Logo" style={{ height: '36px', objectFit: 'contain' }} />
            </div>

            <nav className="sidebar-nav">
              {(ROLE_NAV[userRole as keyof typeof ROLE_NAV] || []).map((item: { id: string; label: string; icon: React.ReactNode }) => (
                <div
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => handleTabClick(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              ))}
            </nav>
          </div>

          <div className="sidebar-bottom">
            <div className="sidebar-nav" style={{ marginBottom: 12 }}>
              <div className="nav-item" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Terminate Session</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0 -12px' }}>
              <div style={{ width: 8, height: 8, background: '#D4AF37', borderRadius: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.08em' }}>{scopeRole}</span>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>LVL: {scopeName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main" style={{
        width: isFieldWorker ? '100%' : '',
        background: isFieldWorker ? '#f8fafc' : 'white'
      }}>
        {!isFieldWorker && (
          <header className="header">
            <div>
                <h1 style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>{activeNavItem?.label || 'Intelligence Hub'}</h1>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gray-400)', marginTop: '-1px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{pageTitle}</p>
            </div>
            <div className="header-right">
              <div style={{ marginRight: 15, textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.7 }}>{scopeRole}</span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>AUTHORITY: {scopeName}</span>
              </div>
              <div className="avatar">{currentUser.email?.[0].toUpperCase()}</div>
            </div>
          </header>
        )}

        {isFieldWorker && (
          <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
             <img src={logo.src} alt="Logo" style={{ height: '24px' }} />
             <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--gray-900)', lineHeight: 1 }}>WORKER NODE</div>
                    <div style={{ fontSize: '8px', fontWeight: 700, color: 'var(--gray-400)', marginTop: 4, textTransform: 'uppercase' }}>{scopeName}</div>
                </div>
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--red-500)', fontSize: '10px', fontWeight: '900', cursor: 'pointer' }}>LOGOUT</button>
             </div>
          </div>
        )}

        <div className="content" style={{ padding: isFieldWorker ? '0' : '28px 32px' }}>
            {children}
        </div>
      </div>
    </div>
  );
}
