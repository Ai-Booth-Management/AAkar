"use client";
import React from 'react';
import {
  LayoutDashboard, TrendingUp, BarChart3, Users, Radio,
  FileText, Map, AlertTriangle, Activity, Shield,
  CheckSquare, Camera, MessageSquare, ClipboardList,
  Target, Globe, Zap, Search, Settings, Database, UserCog,
  Calendar, Gauge
} from 'lucide-react';

export const ROLE_NAV = {
  STATE_ADMIN: [
    { id: 'overview', label: 'State Overview', icon: <Globe size={20} /> },
    { id: 'performance', label: 'Performance', icon: <TrendingUp size={20} /> },
    { id: 'analytics', label: 'District Analytics', icon: <BarChart3 size={20} /> },
    { id: 'rankings', label: 'District Rankings', icon: <BarChart3 size={20} /> },
    { id: 'campaign', label: 'Campaign Management', icon: <Target size={20} /> },
    { id: 'manage-users', label: 'Manage Users', icon: <UserCog size={20} /> },
    { id: 'ai-suggestions', label: 'AI Suggestions', icon: <Zap size={20} /> },
    { id: 'hub', label: 'Hub', icon: <MessageSquare size={20} /> },
    { id: 'broadcast', label: 'State Broadcast', icon: <Radio size={20} /> },
    { id: 'reports', label: 'Final Reports', icon: <FileText size={20} /> },
  ],
  DISTRICT_ADMIN: [
    { id: 'overview', label: 'District Overview', icon: <Globe size={20} /> },
    { id: 'constituencies', label: 'Constituency Stats', icon: <BarChart3 size={20} /> },
    { id: 'campaign', label: 'Campaign Management', icon: <Target size={20} /> },
    { id: 'issues', label: 'Local Issues', icon: <AlertTriangle size={20} /> },
    { id: 'manage-users', label: 'Manage Users', icon: <UserCog size={20} /> },
    { id: 'ai-suggestions', label: 'AI Suggestions', icon: <Zap size={20} /> },
    { id: 'hub', label: 'Hub', icon: <MessageSquare size={20} /> },
    { id: 'broadcast', label: 'District Broadcast', icon: <Radio size={20} /> },
  ],
  CONSTITUENCY_MGR: [
    { id: 'overview', label: 'Constituency View', icon: <Globe size={20} /> },
    { id: 'booths', label: 'Booth Rankings', icon: <BarChart3 size={20} /> },
    { id: 'health', label: 'Booth Health', icon: <Shield size={20} /> },
    { id: 'bosi', label: 'BOSI Strength', icon: <Gauge size={20} /> },
    { id: 'readiness', label: 'Election Readiness', icon: <CheckSquare size={20} /> },
    { id: 'turnout', label: 'Turnout Analytics', icon: <TrendingUp size={20} /> },
    { id: 'campaign', label: 'Campaign Management', icon: <Target size={20} /> },
    { id: 'campaign_tracker', label: 'Campaign Tracker', icon: <Calendar size={20} /> },
    { id: 'manage-users', label: 'Manage Users', icon: <UserCog size={20} /> },
    { id: 'hub', label: 'Hub', icon: <MessageSquare size={20} /> },
    { id: 'whatsapp_os', label: 'WhatsApp OS', icon: <MessageSquare size={20} /> },
    { id: 'broadcast', label: 'Constituency Broadcast', icon: <Radio size={20} /> },
    { id: 'ai-suggestions', label: 'AI Suggestions', icon: <Zap size={20} /> },
  ],
  MANDAL_MGR: [
    { id: 'overview', label: 'Mandal Overview', icon: <Globe size={20} /> },
    { id: 'booth_status', label: 'Booth Status', icon: <ClipboardList size={20} /> },
    { id: 'campaign', label: 'Campaign Management', icon: <Target size={20} /> },
    { id: 'manage-users', label: 'Manage Users', icon: <UserCog size={20} /> },
    { id: 'volunteers', label: 'Volunteer App', icon: <Users size={20} /> },
    { id: 'hub', label: 'Hub', icon: <MessageSquare size={20} /> },
    { id: 'broadcast', label: 'Mandal Broadcast', icon: <Radio size={20} /> },
    { id: 'ai-suggestions', label: 'AI Suggestions', icon: <Zap size={20} /> },
    { id: 'complaints', label: 'Complaints', icon: <AlertTriangle size={20} /> },
  ],
  BOOTH_PRESIDENT: [
    { id: 'profile', label: 'Booth Profile', icon: <Shield size={20} /> },
    { id: 'hub', label: 'Hub', icon: <MessageSquare size={20} /> },
    { id: 'households', label: 'Households', icon: <Globe size={20} /> },
    { id: 'volunteers', label: 'Field Staff', icon: <Users size={20} /> },
    { id: 'volunteer-management', label: 'Volunteer Management', icon: <ClipboardList size={20} /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Radio size={20} /> },
    { id: 'management', label: 'Data Management', icon: <Database size={20} /> },
  ],
  VOLUNTEER: [
    { id: 'tasks', label: 'Daily Tasks', icon: <CheckSquare size={20} /> },
    { id: 'attendance', label: 'Check-In', icon: <Map size={20} /> },
    { id: 'surveys', label: 'Surveys', icon: <ClipboardList size={20} /> },
    { id: 'ai-suggestions', label: 'AI Suggestions', icon: <Zap size={20} /> },
    { id: 'reports', label: 'Submit Report', icon: <Camera size={20} /> },
    { id: 'summary', label: 'My Impact', icon: <Activity size={20} /> },
  ],
  ELECTION_ADMIN: [
    { id: 'users', label: 'User Management', icon: <UserCog size={20} /> },
    { id: 'constituencies', label: 'Constituency Setup', icon: <Globe size={20} /> },
  ]
};

export const ROLE_TITLES = {
  STATE_ADMIN: 'State Control Dashboard',
  DISTRICT_ADMIN: 'District Intelligence Node',
  CONSTITUENCY_MGR: 'Constituency Strategic Command',
  MANDAL_MGR: 'Mandal Operational Node',
  BOOTH_PRESIDENT: 'Booth Management OS',
  VOLUNTEER: 'Field Worker App',
  ELECTION_ADMIN: 'Election Control Server'
};
