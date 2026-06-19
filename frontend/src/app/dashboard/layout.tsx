"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from 'next/link';

const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'upload',
    label: 'Upload',
    path: '/dashboard/upload',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    id: 'ask',
    label: 'Ask AI',
    path: '/dashboard/ask',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'intelligence',
    label: 'Network',
    path: '/dashboard/network',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    id: 'drives',
    label: 'Drives',
    path: '/dashboard/drives',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'complaints',
    label: 'Complaints',
    path: '/dashboard/complaints',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'schemes',
    label: 'Schemes',
    path: '/dashboard/schemes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4H6a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    path: '/dashboard/heatmap',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
      </svg>
    ),
  },
  {
    id: 'department',
    label: 'Department',
    path: '/dashboard/department/pwd',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-4h6v4" />
        <path d="M9 10h1" />
        <path d="M14 10h1" />
        <path d="M9 14h1" />
        <path d="M14 14h1" />
      </svg>
    ),
  },
];

const ABOUT_ITEM = {
  id: 'about',
  label: 'About',
  path: '/dashboard/about',
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
};

const SETTINGS_ITEM = {
  id: 'settings',
  label: 'Settings',
  path: '/dashboard/settings',
  icon: (
    <img
      src="https://img.icons8.com/?size=100&id=2969&format=png&color=FFFFFF"
      alt="Settings"
    />
  ),
};

const PAGE_TITLES: { [key: string]: string } = {
  '/dashboard': 'Overview',
  '/dashboard/network': 'Threat Intelligence Network',
  '/dashboard/ask': 'Ask AI',
  '/dashboard/upload': 'Upload Data',
  '/dashboard/drives': 'Drive Management',
  '/dashboard/complaints': 'Voter Complaints Registry',
  '/dashboard/schemes': 'Voter Specific Schemes',
  '/dashboard/heatmap': 'District Heatmap Analysis',
  '/dashboard/about': 'About System',
  '/dashboard/settings': 'Settings',
  '/dashboard/department/pwd': 'Public Works Department (PWD)',
};

// Next.js static asset import is imported inside components.
// We can fetch or mock logo src or load from public path.
// For layout, we will dynamically check logo from assets.
import logo from '../../assets/logo.png';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [expanded] = useState(true);
  const [deptMenuOpen, setDeptMenuOpen] = useState(pathname.startsWith('/dashboard/department'));

  const userRole = (currentUser?.role || '').toLowerCase();
  const isAuthorized = currentUser && (userRole === 'official' || userRole === 'cm' || userRole === 'dm');

  useEffect(() => {
    if (!loading && !isAuthorized) {
      router.push("/login");
    }
  }, [currentUser, loading, router, isAuthorized]);

  useEffect(() => {
    if (pathname.startsWith('/dashboard/department')) {
      setDeptMenuOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  if (loading || !isAuthorized) {
    return (
      <div className="loading-state" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verifying authorization...</span>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const emailUser = currentUser.email ? currentUser.email.split('@')[0] : 'USER';
  const cleanId = emailUser.replace(/^(official_|cm_|dm_)/i, '').toUpperCase();
  const officialId = currentUser.displayName || cleanId;
  const roleName = userRole === 'cm' ? 'CM_PORTAL' : userRole === 'dm' ? 'DM_PORTAL' : 'OFFICIAL_PORTAL';
  const currentTitle = PAGE_TITLES[pathname] || 'Dashboard';

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.id === 'department') {
      return userRole === 'cm';
    }
    if (userRole === 'dm') {
      return ['overview', 'ask', 'complaints', 'heatmap'].includes(item.id);
    }
    return true;
  });

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <div className={`sidebar ${expanded ? 'expanded' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand" style={{ padding: '16px 20px' }}>
            <img src={logo.src} alt="Logo" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
          </div>

          <nav className="sidebar-nav">
            {visibleNavItems.map((item) => {
              if (item.id === 'department') {
                const isDeptActive = pathname.startsWith('/dashboard/department');
                return (
                  <div key={item.id} className="nav-item-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                      className={`nav-item ${isDeptActive ? 'active' : ''}`}
                      onClick={() => setDeptMenuOpen(!deptMenuOpen)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      <svg 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        style={{ 
                          marginLeft: 'auto', 
                          width: 12, 
                          height: 12, 
                          transform: deptMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          flexShrink: 0
                        }}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                    {deptMenuOpen && (
                      <div className="sidebar-submenu" style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', marginBottom: '8px' }}>
                        <Link
                          href="/dashboard/department/pwd"
                          className={`submenu-item ${pathname === '/dashboard/department/pwd' ? 'active' : ''}`}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            color: pathname === '/dashboard/department/pwd' ? 'var(--amber-500)' : 'rgba(255, 255, 255, 0.6)',
                            borderLeft: pathname === '/dashboard/department/pwd' ? '2px solid var(--amber-500)' : '2px solid transparent',
                            paddingLeft: '10px'
                          }}
                        >
                          🏛️ PWD Department
                        </Link>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-nav" style={{ marginBottom: 12 }}>
            <Link
              href={ABOUT_ITEM.path}
              className={`nav-item ${pathname === ABOUT_ITEM.path ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              {ABOUT_ITEM.icon}
              <span>{ABOUT_ITEM.label}</span>
            </Link>
            <Link
              href={SETTINGS_ITEM.path}
              className={`nav-item ${pathname === SETTINGS_ITEM.path ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              {SETTINGS_ITEM.icon}
              <span>{SETTINGS_ITEM.label}</span>
            </Link>
            {/* Logout Button */}
            <div className="nav-item" onClick={handleLogout} style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: 'var(--blue-700)', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0 -12px' }}>
            <div style={{ width: 8, height: 8, background: 'var(--amber-500)', borderRadius: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--white)', letterSpacing: '0.08em' }}>{officialId}</span>
              <span style={{ fontSize: 8, color: 'var(--blue-100)', letterSpacing: '0.1em', opacity: 0.8 }}>AUTHORIZED ACCESS</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="main">
        <header className="header">
          <h1>{currentTitle}</h1>
          <div className="header-right">
            <div style={{ marginRight: 15, textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.7 }}>{roleName}</span>
              <span style={{ fontSize: 9, opacity: 0.5 }}>{officialId || 'ACCESS'}</span>
            </div>
            <div className="avatar" style={{ fontWeight: 800 }}>{userRole === 'cm' ? 'CM' : userRole === 'dm' ? 'DM' : 'A'}</div>
          </div>
        </header>

        <div className="content" style={{ padding: '28px 32px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
