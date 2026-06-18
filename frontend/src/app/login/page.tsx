"use client";

import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoginPage from "../../components/LoginPage";

export default function LoginPageWrapper() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      const role = (currentUser.role || '').toUpperCase();
      const electionRoles = ['STATE_ADMIN', 'DISTRICT_ADMIN', 'CONSTITUENCY_MGR', 'MANDAL_MGR', 'BOOTH_PRESIDENT', 'VOLUNTEER'];
      if (electionRoles.includes(role)) {
        router.push("/election");
      } else if (role === 'OFFICIAL' || role === 'CM' || role === 'DM') {
        router.push("/dashboard");
      } else if (role === 'BOOTH') {
        router.push("/portal");
      }
    }
  }, [currentUser, loading, router]);

  if (loading || currentUser) {
    return (
      <div className="loading-state" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Redirecting...</span>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <LoginPage />;
}
