"use client";

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

import StateDashboard from '../../components/dashboards/StateDashboard';
import DistrictDashboard from '../../components/dashboards/DistrictDashboard';
import ConstituencyDashboard from '../../components/dashboards/ConstituencyDashboard';
import MandalDashboard from '../../components/dashboards/MandalDashboard';
import BoothDashboard from '../../components/dashboards/BoothDashboard';

import AICopilot from '../../components/shared/AICopilot';
import ElectionAdminDashboard from '../../components/dashboards/ElectionAdminDashboard';

export default function ElectionPage() {
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  if (!currentUser) return null;

  const userRole = (currentUser.role || 'VOLUNTEER').toUpperCase();
  const hierarchy = {
    state: currentUser.state_id,
    district: currentUser.district_id,
    constituency: currentUser.constituency_id,
    mandal: currentUser.mandal_id,
    booth: currentUser.booth_id
  };

  const renderDashboard = () => {
    switch (userRole) {
      case 'ELECTION_ADMIN':
        return <ElectionAdminDashboard hierarchy={hierarchy} tab={activeTab} />;
      case 'STATE_ADMIN':
        return <StateDashboard hierarchy={hierarchy} tab={activeTab} />;
      case 'DISTRICT_ADMIN':
        return <DistrictDashboard hierarchy={hierarchy} tab={activeTab} />;
      case 'CONSTITUENCY_MGR':
        return <ConstituencyDashboard hierarchy={hierarchy} tab={activeTab} />;
      case 'MANDAL_MGR':
        return <MandalDashboard hierarchy={hierarchy} tab={activeTab} />;
      case 'BOOTH_PRESIDENT':
        return <BoothDashboard hierarchy={hierarchy} tab={activeTab} />;
      default:
        return <div>Unauthorized Role Access</div>;
    }
  };

  return (
    <>
      {renderDashboard()}
      {activeTab === 'ai-suggestions' && <AICopilot hierarchy={hierarchy} />}
    </>
  );
}
