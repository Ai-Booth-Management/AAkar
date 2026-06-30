"use client";

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.png';
import { useRouter } from 'next/navigation';
import LodgeComplaintPanel from '../../components/shared/LodgeComplaintPanel';

// ── Design tokens ──────────────────────────────────────────────────────────────
const NAVY    = '#0F172A';
const NAVY_2  = '#17233B';
const GOLD    = '#C9A227';
const BORDER  = '#D9DEE8';

export default function BoothUserPortal() {
  const { currentUser, logout, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [loading, currentUser, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: NAVY,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          fontSize: '11px', fontWeight: 900, color: GOLD,
          letterSpacing: '0.3em', textTransform: 'uppercase'
        }}>
          Initialising Secure Portal...
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const userRole = (currentUser.role || '').toUpperCase();
  const isFieldUser = userRole === 'BOOTH' || userRole === 'BOOTH_PRESIDENT';

  // Non-field users: same complaint form, minimal wrapper
  if (!isFieldUser) {
    const boothId = currentUser.email
      ? currentUser.email.split('@')[0].split('_').slice(1).join('_')
      : null;
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{
          padding: '12px 40px', background: NAVY,
          borderBottom: `1px solid ${NAVY_2}`,
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: `1px solid rgba(201,162,39,0.3)`,
              color: GOLD, fontSize: '10px', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              cursor: 'pointer', padding: '6px 14px'
            }}
          >
            Terminate Session
          </button>
        </div>
        <LodgeComplaintPanel boothId={boothId} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* ── Sticky Header ── */}
      <header style={{
        background: NAVY,
        borderBottom: `3px solid ${GOLD}`,
        padding: '0 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '64px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Left: logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img
            src={logo.src}
            alt="Aakar Logo"
            style={{ height: '30px', filter: 'brightness(0) invert(1)' }}
          />
          <div style={{
            width: '1px', height: '28px',
            background: 'rgba(201,162,39,0.3)'
          }} />
          <div>
            <div style={{
              fontSize: '9px', fontWeight: 900, color: GOLD,
              letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '3px'
            }}>
              Complaint Registration Portal
            </div>
            <div style={{
              fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.05em', fontFamily: 'monospace'
            }}>
              {currentUser.booth_id || 'LOCAL_SECTOR'}
            </div>
          </div>
        </div>

        {/* Right: terminate */}
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 20px',
            background: 'transparent',
            border: `1px solid rgba(220,38,38,0.5)`,
            color: '#F87171',
            fontSize: '10px',
            fontWeight: 900,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#dc2626';
            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#dc2626';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#F87171';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(220,38,38,0.5)';
          }}
        >
          Terminate
        </button>
      </header>

      {/* ── Complaint Form — fills the entire viewport below header ── */}
      <main>
        <LodgeComplaintPanel boothId={currentUser.booth_id} />
      </main>
    </div>
  );
}
