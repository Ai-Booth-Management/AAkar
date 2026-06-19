import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase, AlertTriangle, ClipboardList, TrendingUp,
  FileStack, Award, Search, Clock, RefreshCw, Upload,
  CheckCircle, Flag, ArrowUpRight, X, Camera, MapPin,
  ChevronRight, Zap, BarChart3, PieChart as PieIcon,
  Bell, Filter, Eye, AlertCircle, ArrowLeft, Save
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart,
  Area, LineChart, Line, Legend
} from 'recharts';
import './PWDDepartmentPanel.css';

const API_BASE = '/api/v1/department';


/* ═══════════════════════════════════════════
   CHART COLOR PALETTE (Secretariat theme)
   ═══════════════════════════════════════════ */
const CHART_COLORS = ['#0d1b37', '#1a2744', '#3a4665', '#D4A843', '#22c55e', '#ef4444', '#a855f7', '#71717a', '#3b82f6', '#f59e0b', '#06b6d4'];

const DELHI_DISTRICTS = ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi", "Central Delhi", "North West Delhi", "North East Delhi", "South West Delhi", "South East Delhi", "Shahdara"];

const cleanRecommendation = (rec) => {
  if (!rec) return "";
  // Strip leading numbers like "1. ", "01. ", "1 - ", etc.
  return rec.replace(/^\d+[\.\s\-]+/, "").trim();
};

const renderMarkdownText = (text) => {
  if (!text) return "";
  // Simple regex to replace **text** with <strong>text</strong>
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} style={{ fontWeight: 800, color: '#f8fafc' }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export default function PWDDepartmentPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* View Toggle */
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'data_entry' | 'preview_dashboard' | 'action_tracker' | 'audit_trail'
  const [selectedMonth, setSelectedMonth] = useState('June');
  const [selectedYear, setSelectedYear] = useState(2026);

  /* Filters */
  const [districtFilter, setDistrictFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [backlogDistrict, setBacklogDistrict] = useState('All');
  const [complaintsDistrict, setComplaintsDistrict] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState(null);

  /* Modal for Dashboard Actions */
  const [modal, setModal] = useState(null);
  const [modalRemarks, setModalRemarks] = useState('');
  const [modalProgress, setModalProgress] = useState('');

  /* Drill-down */
  const [selectedProject, setSelectedProject] = useState(null);

  /* Data Entry Form State */
  const [formState, setFormState] = useState(null);
  const [activeDistrictId, setActiveDistrictId] = useState('DIST_01');
  
  /* Project Modal inside Form */
  const [projectModal, setProjectModal] = useState(null); // null | { type: 'add' | 'edit', projectIndex?: number }
  const [projectForm, setProjectForm] = useState({
    id: '', name: '', type: 'Roads', contractor: '', executing_agency: '',
    budget_allocated: 0, budget_released: 0, budget_utilized: 0,
    progress: 0, start_date: '', deadline: '', status: 'On Track', priority: 'Medium',
    officer: '', evidence: { photo_url: '', gps: '28.6139° N, 77.2090° E', timestamp: '', remarks: '' },
    tasks: []
  });

  const [addProjectForm, setAddProjectForm] = useState({
    name: '',
    district: 'New Delhi',
    type: 'Roads',
    contractor: '',
    executing_agency: '',
    budget_allocated: 0,
    budget_released: 0,
    budget_utilized: 0,
    progress: 0,
    deadline: new Date().toISOString().substring(0, 10),
    status: 'On Track',
    officer: '',
    remarks: ''
  });



  /* Project Management States */
  const [projectsList, setProjectsList] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectDistrict, setProjectDistrict] = useState('All');
  const [projectStatus, setProjectStatus] = useState('All');
  const [modalEvidenceUrl, setModalEvidenceUrl] = useState('');
  const [modalDelayStatus, setModalDelayStatus] = useState('Delayed');
  const [districtSummary, setDistrictSummary] = useState(null);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
  const [detailsProgress, setDetailsProgress] = useState('');
  const [detailsProgressRemarks, setDetailsProgressRemarks] = useState('');
  const [detailsEvidenceUrl, setDetailsEvidenceUrl] = useState('');
  const [detailsEvidenceRemarks, setDetailsEvidenceRemarks] = useState('');
  const [detailsApprovalRemarks, setDetailsApprovalRemarks] = useState('');
  const [detailsDelayStatus, setDetailsDelayStatus] = useState('Delayed');
  const [detailsDelayRemarks, setDetailsDelayRemarks] = useState('');
  const [detailsApprovalStatus, setDetailsApprovalStatus] = useState('Pending');
  const [detailsApprovalApprover, setDetailsApprovalApprover] = useState('PWD Commissioner');
  const [detailsDelayReason, setDetailsDelayReason] = useState('Labour Shortage');
  const [detailsDelayRevisedDeadline, setDetailsDelayRevisedDeadline] = useState('');

  useEffect(() => {
    if (projectDistrict !== 'All') {
      setAddProjectForm(prev => ({ ...prev, district: projectDistrict }));
    }
  }, [projectDistrict]);



  const [modalApprovalStatus, setModalApprovalStatus] = useState('Pending');
  const [modalApprovalApprover, setModalApprovalApprover] = useState('PWD Commissioner');
  const [modalDelayReason, setModalDelayReason] = useState('Labour Shortage');
  const [modalDelayRevisedDeadline, setModalDelayRevisedDeadline] = useState('');

  // District metrics and funds overrides state (for Section 4 and Section 5 editability)
  const [infraMetrics, setInfraMetrics] = useState({
    roads_completed: 0, roads_ongoing: 0,
    flyovers_completed: 0, flyovers_ongoing: 0,
    bridges_completed: 0, bridges_ongoing: 0,
    buildings_completed: 0, buildings_ongoing: 0,
    drainage_completed: 0, drainage_ongoing: 0,
    lighting_completed: 0, lighting_ongoing: 0
  });
  const [fundAllocated, setFundAllocated] = useState(0);
  const [fundReleased, setFundReleased] = useState(0);
  const [fundSpent, setFundSpent] = useState(0);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummaryData, setAiSummaryData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  /* Action Tracker States */
  const [actionsList, setActionsList] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionDistrictFilter, setActionDistrictFilter] = useState('All');
  const [actionPriorityFilter, setActionPriorityFilter] = useState('All');
  const [actionStatusFilter, setActionStatusFilter] = useState('All');
  const [actionSearchQuery, setActionSearchQuery] = useState('');
  const [actionUpdateModal, setActionUpdateModal] = useState(null);
  const [modalActionStatus, setModalActionStatus] = useState('');
  const [modalActionRemarks, setModalActionRemarks] = useState('');
  const [modalActionEvidenceUrl, setModalActionEvidenceUrl] = useState('');

  /* Audit Trail States */
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditOfficer, setAuditOfficer] = useState('');
  const [auditProject, setAuditProject] = useState('');
  const [auditDate, setAuditDate] = useState('');
  const [auditActionType, setAuditActionType] = useState('All');
  const [auditModule, setAuditModule] = useState('All');
  const [auditDistrict, setAuditDistrict] = useState('All');
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(10);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPages, setAuditPages] = useState(1);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  const fetchAiSummary = async (m = selectedMonth, y = selectedYear, silent = false) => {
    if (!silent) setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai-summary?month=${m}&year=${y}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAiSummaryData(json);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setAiLoading(false);
    }
  };

  const fetchAnalytics = async (m = selectedMonth, y = selectedYear, silent = false) => {
    if (!silent) setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/analytics?month=${m}&year=${y}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAnalyticsData(json);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setAnalyticsLoading(false);
    }
  };

  const fetchAuditLogs = async (silent = false) => {
    if (!silent) setAuditLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(auditPage),
        limit: String(auditLimit)
      });
      if (auditSearch.trim()) params.append('search', auditSearch);
      if (auditOfficer.trim()) params.append('officer', auditOfficer);
      if (auditProject.trim()) params.append('project_uid', auditProject);
      if (auditDate) params.append('date', auditDate);
      if (auditActionType !== 'All') params.append('action_type', auditActionType);
      if (auditModule !== 'All') params.append('module', auditModule);
      if (auditDistrict !== 'All') params.append('district', auditDistrict);

      const res = await fetch(`${API_BASE}/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAuditLogs(json.logs || []);
      setAuditTotal(json.total || 0);
      setAuditPages(json.pages || 1);
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      if (!silent) setAuditLoading(false);
    }
  };

  const fetchActions = async (silent = false) => {
    if (!silent) setActionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/actions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setActionsList(json);
    } catch (e) {
      console.error('Failed to fetch actions:', e);
    } finally {
      if (!silent) setActionsLoading(false);
    }
  };

  const fetchData = async (isPreview = false, m = selectedMonth, y = selectedYear, silent = false) => {
    const previewMode = (isPreview === true);
    if (!silent) {
      setLoading(true);
      setError(null);
      fetchAiSummary(m, y);
    }
    try {
      const [res, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard?month=${m}&year=${y}${previewMode ? '&preview=true' : ''}`),
        fetch(`${API_BASE}/district-summary`)
      ]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      
      if (summaryRes.ok) {
        const summaryJson = await summaryRes.json();
        setDistrictSummary(summaryJson);
      }
    } catch (e) {
      console.error(e);
      if (!silent) {
        setError('Failed to load department data. Is the backend running?');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };



  useEffect(() => {
    if (view === 'dashboard' || view === 'admin_backlog' || view === 'fund_management') {
      fetchData(false, selectedMonth, selectedYear);
    } else if (view === 'preview_dashboard') {
      fetchData(true, selectedMonth, selectedYear);
    } else if (view === 'ai_summary') {
      fetchAiSummary(selectedMonth, selectedYear);
    } else if (view === 'analytics') {
      fetchAnalytics(selectedMonth, selectedYear);
    } else if (view === 'action_tracker') {
      fetchActions();
    } else if (view === 'audit_trail') {
      fetchAuditLogs();
    }
  }, [view, selectedMonth, selectedYear]);

  useEffect(() => {
    if (view === 'audit_trail') {
      fetchAuditLogs();
    }
  }, [view, auditPage, auditLimit, auditActionType, auditModule, auditDistrict, auditDate, auditSearch, auditOfficer, auditProject]);

  const fetchProjects = async (silent = false) => {
    if (!silent) setProjectsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search: projectSearch,
        district: projectDistrict,
        status: projectStatus
      });
      const res = await fetch(`${API_BASE}/projects?${queryParams.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setProjectsList(json);
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    } finally {
      if (!silent) setProjectsLoading(false);
    }
  };

  const fetchDistrictMetrics = async (silent = false) => {
    if (!silent) setMetricsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/district-metrics?district=${projectDistrict}&month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setInfraMetrics({
        roads_completed: json.roads_completed,
        roads_ongoing: json.roads_ongoing,
        flyovers_completed: json.flyovers_completed,
        flyovers_ongoing: json.flyovers_ongoing,
        bridges_completed: json.bridges_completed,
        bridges_ongoing: json.bridges_ongoing,
        buildings_completed: json.buildings_completed,
        buildings_ongoing: json.buildings_ongoing,
        drainage_completed: json.drainage_completed,
        drainage_ongoing: json.drainage_ongoing,
        lighting_completed: json.lighting_completed,
        lighting_ongoing: json.lighting_ongoing
      });
      setFundAllocated(json.funds_allocated);
      setFundReleased(json.funds_released);
      setFundSpent(json.funds_spent);
    } catch (e) {
      console.error("Failed to fetch district metrics:", e);
    } finally {
      if (!silent) setMetricsLoading(false);
    }
  };

  const handleSaveMetrics = async () => {
    if (projectDistrict === 'All') return;
    try {
      const res = await fetch(`${API_BASE}/district-metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          district: projectDistrict,
          month: selectedMonth,
          year: selectedYear,
          funds_allocated: parseFloat(fundAllocated) || 0,
          funds_released: parseFloat(fundReleased) || 0,
          funds_spent: parseFloat(fundSpent) || 0,
          roads_completed: parseFloat(infraMetrics.roads_completed) || 0,
          roads_ongoing: parseFloat(infraMetrics.roads_ongoing) || 0,
          flyovers_completed: parseFloat(infraMetrics.flyovers_completed) || 0,
          flyovers_ongoing: parseFloat(infraMetrics.flyovers_ongoing) || 0,
          bridges_completed: parseFloat(infraMetrics.bridges_completed) || 0,
          bridges_ongoing: parseFloat(infraMetrics.bridges_ongoing) || 0,
          buildings_completed: parseFloat(infraMetrics.buildings_completed) || 0,
          buildings_ongoing: parseFloat(infraMetrics.buildings_ongoing) || 0,
          drainage_completed: parseFloat(infraMetrics.drainage_completed) || 0,
          drainage_ongoing: parseFloat(infraMetrics.drainage_ongoing) || 0,
          lighting_completed: parseFloat(infraMetrics.lighting_completed) || 0,
          lighting_ongoing: parseFloat(infraMetrics.lighting_ongoing) || 0
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert('Changes saved successfully! Dashboard and summary metrics have been updated.');
      
      // Refresh dashboard datasets, district summary, and audit logs
      fetchData(false, selectedMonth, selectedYear);
      fetchDistrictMetrics();
      fetchAuditLogs();
    } catch (e) {
      console.error(e);
      alert('Failed to save changes.');
    }
  };

  useEffect(() => {
    if (view === 'data_entry' || view === 'admin_backlog') {
      fetchProjects();
      fetchDistrictMetrics();
    }
  }, [view, projectSearch, projectDistrict, projectStatus, selectedMonth, selectedYear]);

  // Real-time polling effect
  useEffect(() => {
    const triggerPoll = () => {
      if (view === 'dashboard' || view === 'fund_management') {
        fetchData(false, selectedMonth, selectedYear, true);
      } else if (view === 'admin_backlog') {
        fetchData(false, selectedMonth, selectedYear, true);
        fetchProjects(true);
        fetchDistrictMetrics(true);
      } else if (view === 'preview_dashboard') {
        fetchData(true, selectedMonth, selectedYear, true);
      } else if (view === 'action_tracker') {
        fetchActions(true);
      } else if (view === 'audit_trail') {
        fetchAuditLogs(true);
      } else if (view === 'data_entry') {
        fetchProjects(true);
        fetchDistrictMetrics(true);
      } else if (view === 'analytics') {
        fetchAnalytics(selectedMonth, selectedYear, true);
      }
    };

    const intervalId = setInterval(() => {
      triggerPoll();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [
    view,
    selectedMonth,
    selectedYear,
    projectSearch,
    projectDistrict,
    projectStatus,
    auditPage,
    auditLimit,
    auditActionType,
    auditModule,
    auditDistrict,
    auditDate,
    auditSearch,
    auditOfficer,
    auditProject
  ]);

  const fetchDraft = async (m = selectedMonth, y = selectedYear) => {
    setView('data_entry');
  };

  const renderTabs = () => {
    if (view === 'preview_dashboard') return null;
    return (
      <div className="dept-tabs">
        <button 
          className={`dept-tab-btn ${view === 'dashboard' ? 'active' : ''}`} 
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`dept-tab-btn ${view === 'data_entry' ? 'active' : ''}`} 
          onClick={() => setView('data_entry')}
        >
          Project Management
        </button>
        <button 
          className={`dept-tab-btn ${view === 'admin_backlog' ? 'active' : ''}`} 
          onClick={() => setView('admin_backlog')}
        >
          Administrative Backlog
        </button>
        <button 
          className={`dept-tab-btn ${view === 'audit_trail' ? 'active' : ''}`} 
          onClick={() => setView('audit_trail')}
        >
          Audit Trail
        </button>
        <button 
          className={`dept-tab-btn ${view === 'action_tracker' ? 'active' : ''}`} 
          onClick={() => setView('action_tracker')}
        >
          Action Tracker
        </button>
        <button 
          className={`dept-tab-btn ${view === 'fund_management' ? 'active' : ''}`} 
          onClick={() => setView('fund_management')}
        >
          Fund Management
        </button>
        <button 
          className={`dept-tab-btn ${view === 'ai_summary' ? 'active' : ''}`} 
          onClick={() => setView('ai_summary')}
        >
          AI Summary
        </button>
        <button 
          className={`dept-tab-btn ${view === 'analytics' ? 'active' : ''}`} 
          onClick={() => setView('analytics')}
        >
          Department Analytics
        </button>
      </div>
    );
  };

  const updateActiveDistrict = (updater) => {
    setFormState(prev => {
      if (!prev) return prev;
      const updatedDistrictData = prev.district_data.map(d => {
        if (d.district_id === activeDistrictId) {
          return updater(d);
        }
        return d;
      });
      return {
        ...prev,
        district_data: updatedDistrictData
      };
    });
  };

  const activeDistrictData = useMemo(() => {
    if (!formState?.district_data) return null;
    return formState.district_data.find(d => d.district_id === activeDistrictId) || null;
  }, [formState, activeDistrictId]);

  const handleFundChange = (field, value) => {
    updateActiveDistrict(d => {
      const numValue = parseFloat(value) || 0;
      const updatedFunds = {
        ...d.funds,
        [field]: numValue
      };
      if (field === 'released' || field === 'utilized') {
        updatedFunds.remaining = (field === 'released' ? numValue : d.funds.released) - (field === 'utilized' ? numValue : d.funds.utilized);
      }
      return {
        ...d,
        funds: updatedFunds
      };
    });
  };

  const handleInfraChange = (category, field, value) => {
    updateActiveDistrict(d => {
      const numValue = parseFloat(value) || 0;
      return {
        ...d,
        infrastructure: {
          ...d.infrastructure,
          [category]: {
            ...d.infrastructure[category],
            [field]: numValue
          }
        }
      };
    });
  };


  const handleBacklogChange = (field, value) => {
    updateActiveDistrict(d => {
      const numValue = parseInt(value, 10) || 0;
      return {
        ...d,
        administrative_backlog: {
          ...d.administrative_backlog,
          [field]: numValue
        }
      };
    });
  };

  const handleBacklogAgeBucketChange = (label, value) => {
    updateActiveDistrict(d => {
      const numValue = parseInt(value, 10) || 0;
      const updatedBuckets = d.administrative_backlog.age_buckets.map(b => {
        if (b.label === label) {
          return { ...b, count: numValue };
        }
        return b;
      });
      return {
        ...d,
        administrative_backlog: {
          ...d.administrative_backlog,
          age_buckets: updatedBuckets
        }
      };
    });
  };

  const handleOfficerNotesChange = (field, value) => {
    updateActiveDistrict(d => {
      return {
        ...d,
        officer_notes: {
          ...d.officer_notes,
          [field]: value
        }
      };
    });
  };

  const handleAddTask = () => {
    setProjectForm(prev => ({
      ...prev,
      tasks: [
        ...(prev.tasks || []),
        { name: 'New Task', stage: 'Assigned', deadline: new Date().toISOString().substring(0, 10), progress: 0 }
      ]
    }));
  };

  const handleUpdateTask = (index, field, value) => {
    setProjectForm(prev => {
      const updatedTasks = (prev.tasks || []).map((t, idx) => {
        if (idx === index) {
          const updatedTask = { ...t, [field]: value };
          if (field === 'stage' && value === 'Completed') {
            updatedTask.progress = 100;
          }
          return updatedTask;
        }
        return t;
      });
      return { ...prev, tasks: updatedTasks };
    });
  };

  const handleDeleteTask = (index) => {
    setProjectForm(prev => ({
      ...prev,
      tasks: (prev.tasks || []).filter((_, idx) => idx !== index)
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProjectForm(prev => ({
        ...prev,
        evidence: {
          ...prev.evidence,
          photo_url: reader.result,
          timestamp: new Date().toISOString()
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProjectModal = async () => {
    if (!projectForm.name) {
      alert('Project Name is required.');
      return;
    }
    if (!projectForm.district) {
      alert('District is required.');
      return;
    }

    try {
      if (projectModal.type === 'add') {
        const payload = {
          name: projectForm.name,
          district: projectForm.district,
          type: projectForm.type || 'Roads',
          contractor: projectForm.contractor || '',
          executing_agency: projectForm.executing_agency || '',
          budget_allocated: parseFloat(projectForm.budget_allocated) || 0,
          budget_released: parseFloat(projectForm.budget_released) || 0,
          budget_utilized: parseFloat(projectForm.budget_utilized) || 0,
          progress: parseInt(projectForm.progress, 10) || 0,
          deadline: projectForm.deadline || '',
          status: projectForm.status || 'On Track',
          officer: projectForm.officer || '',
          remarks: projectForm.remarks || '',
          reporting_month: selectedMonth,
          reporting_year: selectedYear
        };

        const res = await fetch(`${API_BASE}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.detail || `HTTP ${res.status}`);
        }
        alert('Project added successfully.');
      } else {
        // Edit mode
        const projectUid = projectForm.id;
        const payload = {
          name: projectForm.name,
          type: projectForm.type || 'Roads',
          contractor: projectForm.contractor || '',
          executing_agency: projectForm.executing_agency || '',
          budget_allocated: parseFloat(projectForm.budget_allocated) || 0,
          budget_released: parseFloat(projectForm.budget_released) || 0,
          budget_utilized: parseFloat(projectForm.budget_utilized) || 0,
          progress: parseInt(projectForm.progress, 10) || 0,
          deadline: projectForm.deadline || '',
          status: projectForm.status || 'On Track',
          officer: projectForm.officer || '',
          remarks: projectForm.remarks || '',
          evidence: projectForm.evidence ? {
            photo_url: projectForm.evidence.photo_url || '',
            gps: projectForm.evidence.gps || '28.6139° N, 77.2090° E',
            timestamp: projectForm.evidence.timestamp || new Date().toISOString(),
            remarks: projectForm.evidence.remarks || ''
          } : null
        };

        const res = await fetch(`${API_BASE}/projects/${projectUid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.detail || `HTTP ${res.status}`);
        }
        alert('Project updated successfully.');
      }

      setProjectModal(null);
      fetchProjects();
      fetchData(false, selectedMonth, selectedYear);
    } catch (e) {
      console.error(e);
      alert(`Failed to save project: ${e.message}`);
    }
  };

  const handleAddProjectInline = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!addProjectForm.name) {
      alert('Project Name is required.');
      return;
    }
    if (!addProjectForm.district) {
      alert('District is required.');
      return;
    }
    try {
      const payload = {
        name: addProjectForm.name,
        district: addProjectForm.district,
        type: addProjectForm.type || 'Roads',
        contractor: addProjectForm.contractor || '',
        executing_agency: addProjectForm.executing_agency || '',
        budget_allocated: parseFloat(addProjectForm.budget_allocated) || 0,
        budget_released: parseFloat(addProjectForm.budget_released) || 0,
        budget_utilized: parseFloat(addProjectForm.budget_utilized) || 0,
        progress: parseInt(addProjectForm.progress, 10) || 0,
        deadline: addProjectForm.deadline || '',
        status: addProjectForm.status || 'On Track',
        officer: addProjectForm.officer || '',
        remarks: addProjectForm.remarks || '',
        reporting_month: selectedMonth,
        reporting_year: selectedYear
      };

      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `HTTP ${res.status}`);
      }
      alert('Project added successfully.');
      setAddProjectForm({
        name: '',
        district: projectDistrict !== 'All' ? projectDistrict : 'New Delhi',
        type: 'Roads',
        contractor: '',
        executing_agency: '',
        budget_allocated: 0,
        budget_released: 0,
        budget_utilized: 0,
        progress: 0,
        deadline: new Date().toISOString().substring(0, 10),
        status: 'On Track',
        officer: '',
        remarks: ''
      });
      fetchProjects();
      fetchData(false, selectedMonth, selectedYear);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to add project');
    }
  };

  const handleDeleteProject = async (projectUid) => {
    if (!window.confirm(`Are you sure you want to delete project ${projectUid}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/projects/${projectUid}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `HTTP ${res.status}`);
      }
      alert('Project deleted successfully.');
      fetchProjects();
      fetchData(false, selectedMonth, selectedYear);
    } catch (e) {
      console.error(e);
      alert(`Failed to delete project: ${e.message}`);
    }
  };

  const handleModalPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setModalEvidenceUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleModalSubmit = async () => {
    if (!modal || !modal.project) return;
    const projectUid = modal.project.id || modal.project.project_uid;
    if (!projectUid) return;

    let payload = {
      action_type: '',
      progress: null,
      status: null,
      photo_url: null,
      gps: null,
      timestamp: null,
      remarks: null
    };

    if (modal.type === 'progress') {
      payload.action_type = 'update_progress';
      payload.progress = parseInt(modalProgress, 10);
      payload.remarks = modalRemarks;
      payload.timestamp = new Date().toISOString();
      if (isNaN(payload.progress) || payload.progress < 0 || payload.progress > 100) {
        alert('Please enter a valid progress percentage (0-100).');
        return;
      }
    } else if (modal.type === 'evidence') {
      payload.action_type = 'upload_evidence';
      payload.photo_url = modalEvidenceUrl;
      payload.gps = '28.6139° N, 77.2090° E';
      payload.timestamp = new Date().toISOString();
      payload.remarks = modalRemarks;
      if (!modalEvidenceUrl) {
        alert('Please upload photo evidence.');
        return;
      }
    } else if (modal.type === 'approval') {
      payload.action_type = 'request_approval';
      payload.status = modalApprovalStatus;
      payload.approver = modalApprovalApprover;
      payload.remarks = modalRemarks || 'Officer requested project completion/milestone approval.';
      payload.timestamp = new Date().toISOString();
    } else if (modal.type === 'delay') {
      payload.action_type = 'flag_delay';
      payload.status = modalDelayStatus;
      payload.reason = modalDelayReason;
      payload.revised_deadline = modalDelayRevisedDeadline || modal.project.deadline;
      payload.remarks = modalRemarks;
      payload.timestamp = new Date().toISOString();
    } else {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/projects/${projectUid}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `HTTP ${res.status}`);
      }
      alert('Action completed and logged to Audit Trail successfully.');
      setModal(null);
      setModalRemarks('');
      setModalProgress('');
      setModalEvidenceUrl('');
      setModalDelayStatus('Delayed');
      setModalApprovalStatus('Pending');
      setModalApprovalApprover('PWD Commissioner');
      setModalDelayReason('Labour Shortage');
      setModalDelayRevisedDeadline('');
      setProjectModal(null);
      
      // Refresh both dashboard data and projects list
      fetchData(false, selectedMonth, selectedYear);
      if (view === 'data_entry') {
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
      alert(`Failed to complete action: ${e.message}`);
    }
  };

  const handleUpdateActionStatus = (action, nextStatus) => {
    setModalActionStatus(nextStatus);
    setModalActionRemarks('');
    setModalActionEvidenceUrl(action.evidence_url || '');
    setActionUpdateModal(action);
  };

  const submitActionStatusUpdate = async () => {
    if (!actionUpdateModal) return;
    try {
      const res = await fetch(`${API_BASE}/actions/${actionUpdateModal.action_uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: modalActionStatus,
          remarks: modalActionRemarks,
          evidence_url: modalActionEvidenceUrl
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `HTTP ${res.status}`);
      }
      setActionUpdateModal(null);
      fetchActions();
      fetchData(false, selectedMonth, selectedYear);
      alert('Instruction status updated successfully.');
    } catch (e) {
      console.error(e);
      alert(`Failed to update instruction status: ${e.message}`);
    }
  };

  const handleDetailsPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setDetailsEvidenceUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const refreshDetailsModalProject = async (projectUid) => {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (res.ok) {
        const list = await res.json();
        const updatedProj = list.find(p => p.id === projectUid);
        if (updatedProj) {
          setSelectedProjectDetails(updatedProj);
        }
      }
    } catch (e) {
      console.error('Failed to refresh project details:', e);
    }
  };

  const handleDetailsAction = async (actionType) => {
    if (!selectedProjectDetails) return;
    const projectUid = selectedProjectDetails.id;
    
    let payload = {
      action_type: actionType,
      progress: null,
      status: null,
      photo_url: null,
      gps: null,
      timestamp: null,
      remarks: null
    };

    if (actionType === 'update_progress') {
      const progressVal = parseInt(detailsProgress, 10);
      if (isNaN(progressVal) || progressVal < 0 || progressVal > 100) {
        alert('Please enter a valid progress percentage (0-100).');
        return;
      }
      payload.progress = progressVal;
      payload.remarks = detailsProgressRemarks;
    } else if (actionType === 'upload_evidence') {
      if (!detailsEvidenceUrl) {
        alert('Please upload photo evidence first.');
        return;
      }
      payload.photo_url = detailsEvidenceUrl;
      payload.gps = '28.6139° N, 77.2090° E';
      payload.timestamp = new Date().toISOString();
      payload.remarks = detailsEvidenceRemarks;
    } else if (actionType === 'request_approval') {
      payload.status = detailsApprovalStatus;
      payload.approver = detailsApprovalApprover;
      payload.remarks = detailsApprovalRemarks || 'Officer requested project completion/milestone approval.';
      payload.timestamp = new Date().toISOString();
    } else if (actionType === 'flag_delay') {
      payload.status = detailsDelayStatus;
      payload.reason = detailsDelayReason;
      payload.revised_deadline = detailsDelayRevisedDeadline || selectedProjectDetails.deadline;
      payload.remarks = detailsDelayRemarks;
      payload.timestamp = new Date().toISOString();
    } else {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/projects/${projectUid}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `HTTP ${res.status}`);
      }
      alert('Action completed and logged to Audit Trail successfully.');
      
      // Reset forms
      setDetailsProgress('');
      setDetailsProgressRemarks('');
      setDetailsEvidenceUrl('');
      setDetailsEvidenceRemarks('');
      setDetailsApprovalRemarks('');
      setDetailsApprovalStatus('Pending');
      setDetailsApprovalApprover('PWD Commissioner');
      setDetailsDelayRemarks('');
      setDetailsDelayReason('Labour Shortage');
      setDetailsDelayRevisedDeadline('');
      
      // Refresh backend lists
      await fetchProjects();
      await fetchData(false, selectedMonth, selectedYear);
      await refreshDetailsModalProject(projectUid);
    } catch (e) {
      console.error(e);
      alert(`Failed to complete action: ${e.message}`);
    }
  };

  const finalizeFormState = (rawState) => {
    if (!rawState) return rawState;
    const updatedDistrictData = rawState.district_data.map(d => {
      const list = d.projects.list || [];
      const total = list.length;
      const completed = list.filter(p => p.status === 'Completed').length;
      const active = list.filter(p => p.status !== 'Completed').length;
      const delayed = list.filter(p => p.status === 'Delayed').length;
      const critical = list.filter(p => p.status === 'Critical').length;
      
      const projects = { total, active, completed, delayed, critical, list };
      const funds = { ...d.funds, remaining: d.funds.released - d.funds.utilized };
      const complaints = d.complaints 
        ? { ...d.complaints, pending: (d.complaints.total || 0) - (d.complaints.resolved || 0) } 
        : undefined;
      
      const delayedCount = delayed + critical;
      const pendingCount = complaints ? (complaints.pending || 0) : 0;
      const score = Math.max(0, Math.min(100, 100 - (delayedCount * 5) - (pendingCount * 2)));
      
      return {
        ...d,
        projects,
        funds,
        complaints,
        analytics: { ...d.analytics, score }
      };
    });

    return {
      ...rawState,
      district_data: updatedDistrictData
    };
  };

  const validateForm = (rawState) => {
    const errors = [];
    if (!rawState) return errors;
    rawState.district_data.forEach(d => {
      const name = d.district_name;
      if (d.funds.allocated < d.funds.released) {
        errors.push(`${name}: Allocated budget (₹${d.funds.allocated.toLocaleString()}) must be >= Released budget (₹${d.funds.released.toLocaleString()}).`);
      }
      if (d.funds.released < d.funds.utilized) {
        errors.push(`${name}: Released budget (₹${d.funds.released.toLocaleString()}) must be >= Utilized budget (₹${d.funds.utilized.toLocaleString()}).`);
      }

      d.projects.list.forEach(p => {
        if (p.status === 'Completed' && p.progress !== 100) {
          errors.push(`${name} - Project ${p.id} (${p.name}): Progress must be 100% if status is Completed.`);
        }
        if (p.budget_utilized > p.budget_allocated) {
          errors.push(`${name} - Project ${p.id} (${p.name}): Utilized budget (₹${p.budget_utilized.toLocaleString()}) cannot exceed Allocated budget (₹${p.budget_allocated.toLocaleString()}).`);
        }
        if (p.budget_released > p.budget_allocated) {
          errors.push(`${name} - Project ${p.id} (${p.name}): Released budget (₹${p.budget_released.toLocaleString()}) cannot exceed Allocated budget (₹${p.budget_allocated.toLocaleString()}).`);
        }
        if (p.budget_utilized > p.budget_released) {
          errors.push(`${name} - Project ${p.id} (${p.name}): Utilized budget (₹${p.budget_utilized.toLocaleString()}) cannot exceed Released budget (₹${p.budget_released.toLocaleString()}).`);
        }
      });
    });
    return errors;
  };

  const handleSaveDraft = async () => {
    const finalized = finalizeFormState(formState);
    try {
      const res = await fetch(`${API_BASE}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalized)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      alert('Draft saved successfully!');
      setFormState(finalized);
    } catch (e) {
      console.error(e);
      alert('Failed to save draft.');
    }
  };

  const handlePreviewDashboard = async () => {
    const finalized = finalizeFormState(formState);
    try {
      const res = await fetch(`${API_BASE}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalized)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFormState(finalized);
      setView('preview_dashboard');
    } catch (e) {
      console.error(e);
      alert('Failed to update draft for preview.');
    }
  };

  const handlePublish = async () => {
    const finalized = finalizeFormState(formState);
    const errors = validateForm(finalized);
    if (errors.length > 0) {
      alert('Cannot publish. Please resolve the following errors:\n\n' + errors.join('\n'));
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalized)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert('Data published successfully! Live dashboard updated.');
      setView('dashboard');
    } catch (e) {
      console.error(e);
      alert('Failed to publish data.');
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
      fetchDraft();
    }
  };

  /* ── Derived Data ── */
  const filteredProjects = useMemo(() => {
    if (!data?.projects) return [];
    return data.projects.filter(p => {
      if (districtFilter !== 'All' && p.district !== districtFilter) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q) && !p.district.toLowerCase().includes(q)) return false;
      }
      if (quickFilter === 'high_priority' && p.priority !== 'High') return false;
      if (quickFilter === 'delayed' && p.status !== 'Delayed' && p.status !== 'Critical') return false;
      if (quickFilter === 'near_deadline') {
        const dl = new Date(p.deadline);
        const now = new Date();
        const diff = (dl - now) / (1000 * 60 * 60 * 24);
        if (diff > 30 || diff < 0) return false;
      }
      if (quickFilter === 'completed' && p.status !== 'Completed') return false;
      if (quickFilter === 'budget_overrun' && p.utilized <= p.allocated) return false;
      if (quickFilter === 'pending_approvals') {
        const hasPending = p.tasks?.some(t => t.stage === 'Assigned');
        if (!hasPending) return false;
      }
      return true;
    });
  }, [data, districtFilter, statusFilter, searchQuery, quickFilter]);

  const filteredComplaints = useMemo(() => {
    if (!data?.complaints) return [];
    const filter = view === 'complaints_intel' ? complaintsDistrict : districtFilter;
    if (filter === 'All') return data.complaints;
    return data.complaints.filter(c => c.district === filter);
  }, [data, districtFilter, complaintsDistrict, view]);

  /* ── KPIs (district-aware) ── */
  const computedKpi = useMemo(() => {
    if (!data) return null;
    if (districtFilter === 'All') return data.kpi;
    const dp = data.projects.filter(p => p.district === districtFilter);
    const dc = data.complaints.filter(c => c.district === districtFilter);
    const ds = data.district_scores.find(d => d.district === districtFilter);
    const totalBudget = dp.reduce((s, p) => s + p.allocated, 0);
    const totalUtilized = dp.reduce((s, p) => s + p.utilized, 0);
    return {
      active_projects: dp.filter(p => p.status !== 'Completed').length,
      delayed_projects: dp.filter(p => p.status === 'Delayed' || p.status === 'Critical').length,
      open_tasks: dp.reduce((s, p) => s + (p.tasks?.filter(t => t.stage !== 'Completed').length || 0), 0),
      fund_utilization_pct: totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100) : 0,
      admin_backlog: dp.filter(p => p.tasks?.some(t => t.stage === 'Assigned')).length,
      department_score: ds?.score || 0,
      department_score_max: 100,
    };
  }, [data, districtFilter]);

  /* ── District performance insights ── */
  const districtInsights = useMemo(() => {
    if (!data?.district_scores) return null;
    const sorted = [...data.district_scores].sort((a, b) => b.score - a.score);
    const byTrend = [...data.district_scores].sort((a, b) => b.trend - a.trend);
    const du = data.fund_management?.district_utilization || [];
    const byUtil = [...du].sort((a, b) => b.pct - a.pct);
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      bestBudget: byUtil[0],
      mostImproved: byTrend[0],
    };
  }, [data]);

  /* ── District-aware Fund Management ── */
  const computedFundManagement = useMemo(() => {
    if (!data?.fund_management) return null;
    if (districtFilter === 'All') return data.fund_management;
    
    const dp = data.projects.filter(p => p.district === districtFilter);
    const allocated = dp.reduce((s, p) => s + (p.allocated || 0), 0);
    const released = dp.reduce((s, p) => s + (p.released || 0), 0);
    const utilized = dp.reduce((s, p) => s + (p.utilized || 0), 0);
    const remaining = released - utilized;
    
    const totalAllocated = data.fund_management.allocated;
    const ratio = totalAllocated > 0 ? allocated / totalAllocated : 0;
    const monthly_spending = data.fund_management.monthly_spending.map(item => ({
      month: item.month,
      amount: Math.round(item.amount * ratio),
    }));

    return {
      allocated,
      released,
      utilized,
      remaining,
      monthly_spending,
      district_utilization: data.fund_management.district_utilization.filter(d => d.district === districtFilter),
    };
  }, [data, districtFilter]);

  /* ── District-aware Administrative Backlog ── */
  const computedAdminBacklog = useMemo(() => {
    if (!data?.admin_backlog) return null;
    const filterToUse = view === 'admin_backlog' ? backlogDistrict : districtFilter;
    if (filterToUse === 'All') return data.admin_backlog;

    const dp = data.projects.filter(p => p.district === filterToUse);
    
    let pending_approvals = 0;
    let pending_reports = 0;
    let pending_requests = 0;
    let delayed_cases = 0;

    let bucket_1 = 0;
    let bucket_2 = 0;
    let bucket_3 = 0;
    let bucket_4 = 0;

    dp.forEach(p => {
      if (p.status === 'Critical' || p.status === 'Delayed') {
        delayed_cases++;
      }
      (p.tasks || []).forEach(t => {
        if (t.stage === 'Completed') pending_approvals++;
        else if (t.stage === 'Accepted') pending_reports++;
        else if (t.stage === 'Assigned') pending_requests++;

        if (t.stage !== 'Completed' && t.stage !== 'Verified') {
          const dl = new Date(t.deadline);
          const now = new Date();
          const diffDays = Math.ceil((now - dl) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            if (diffDays <= 7) bucket_1++;
            else if (diffDays <= 15) bucket_2++;
            else if (diffDays <= 30) bucket_3++;
            else bucket_4++;
          } else {
            const absDiff = Math.abs(diffDays);
            if (absDiff <= 7) bucket_1++;
            else if (absDiff <= 15) bucket_2++;
            else if (absDiff <= 30) bucket_3++;
            else bucket_4++;
          }
        }
      });
    });

    if (pending_approvals === 0 && pending_reports === 0 && pending_requests === 0) {
      const totalProjects = data.projects.length;
      const ratio = totalProjects > 0 ? dp.length / totalProjects : 0;
      pending_approvals = Math.max(1, Math.round(data.admin_backlog.pending_approvals * ratio));
      pending_reports = Math.max(0, Math.round(data.admin_backlog.pending_reports * ratio));
      pending_requests = Math.max(0, Math.round(data.admin_backlog.pending_requests * ratio));
      delayed_cases = Math.max(0, Math.round(data.admin_backlog.delayed_cases * ratio));
      
      return {
        pending_approvals,
        pending_reports,
        pending_requests,
        delayed_cases,
        age_buckets: data.admin_backlog.age_buckets.map(b => ({
          label: b.label,
          count: Math.max(0, Math.round(b.count * ratio))
        }))
      };
    }

    return {
      pending_approvals,
      pending_reports,
      pending_requests,
      delayed_cases,
      age_buckets: [
        { label: "0-7 Days", count: bucket_1 },
        { label: "7-15 Days", count: bucket_2 },
        { label: "15-30 Days", count: bucket_3 },
        { label: "30+ Days", count: bucket_4 },
      ]
    };
  }, [data, districtFilter, backlogDistrict, view]);

  /* ── District-aware Scores ── */
  const computedDistrictScores = useMemo(() => {
    if (!data?.district_scores) return [];
    if (districtFilter === 'All') return data.district_scores;
    return data.district_scores.filter(ds => ds.district === districtFilter);
  }, [data, districtFilter]);

  /* ── Complaint analytics ── */
  const complaintAnalytics = useMemo(() => {
    if (!filteredComplaints.length) return { categories: [], districtCounts: [], resolutionRate: 0 };
    const catMap = {};
    const distMap = {};
    let resolved = 0;
    filteredComplaints.forEach(c => {
      catMap[c.category] = (catMap[c.category] || 0) + 1;
      distMap[c.district] = (distMap[c.district] || 0) + 1;
      if (c.status === 'Resolved') resolved++;
    });
    return {
      categories: Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      districtCounts: Object.entries(distMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      resolutionRate: Math.round((resolved / filteredComplaints.length) * 100),
    };
  }, [filteredComplaints]);

  /* ── Executive Alerts ── */
  const alerts = useMemo(() => {
    if (!data) return [];
    const a = [];
    const delayed = data.projects.filter(p => p.status === 'Critical' || p.status === 'Delayed');
    const criticalCount = data.projects.filter(p => p.status === 'Critical').length;
    const completedThisMonth = data.projects.filter(p => p.progress >= 90).length;
    if (criticalCount > 0) a.push({ type: 'red', text: `${criticalCount} projects in critical status requiring immediate attention.` });
    if (delayed.length > 0) a.push({ type: 'amber', text: `${delayed.length} projects behind schedule — review timelines.` });
    if (completedThisMonth > 0) a.push({ type: 'green', text: `${completedThisMonth} projects nearing completion this quarter.` });
    return a;
  }, [data]);

  /* ── Chart data: projects by district ── */
  const projectsByDistrict = useMemo(() => {
    if (!data?.projects) return [];
    const list = districtFilter === 'All' ? data.projects : data.projects.filter(p => p.district === districtFilter);
    const map = {};
    list.forEach(p => { map[p.district] = (map[p.district] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name: name.replace(' Delhi', ''), count }));
  }, [data, districtFilter]);

  /* ── Chart data: delayed by district ── */
  const delayedByDistrict = useMemo(() => {
    if (!data?.projects) return [];
    const list = districtFilter === 'All' ? data.projects : data.projects.filter(p => p.district === districtFilter);
    const map = {};
    list.filter(p => p.status === 'Delayed' || p.status === 'Critical').forEach(p => { map[p.district] = (map[p.district] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name: name.replace(' Delhi', ''), count }));
  }, [data, districtFilter]);

  /* ── Dynamic AI Summary Generator ── */
  const aiSummary = useMemo(() => {
    if (!data) return null;
    const activeProjects = filteredProjects;
    const activeComplaints = filteredComplaints;

    // 1. Delayed projects list
    const delayedProjs = activeProjects.filter(p => p.status === 'Delayed' || p.status === 'Critical');

    // 2. Budget overruns & low utilization
    const budgetAlerts = [];
    activeProjects.forEach(p => {
      if (p.utilized > p.allocated) {
        budgetAlerts.push(`Budget overrun on project "${p.name}" in ${p.district}: spent ₹${p.utilized.toLocaleString()} of ₹${p.allocated.toLocaleString()}.`);
      } else if (p.allocated > 0) {
        const utilRate = p.utilized / p.allocated;
        if (utilRate < 0.5) {
          const dl = new Date(p.deadline);
          const now = new Date();
          const diffDays = (dl - now) / (1000 * 60 * 60 * 24);
          if (diffDays > 0 && diffDays <= 30) {
            budgetAlerts.push(`Low utilization risk: "${p.name}" (${p.district}) is at ${Math.round(utilRate * 100)}% budget utilization with only ${Math.round(diffDays)} days remaining.`);
          }
        }
      }
    });

    // 3. Complaint categories high count (>10) or leading
    const complaintAlerts = [];
    const catCounts = {};
    activeComplaints.forEach(c => {
      catCounts[c.category] = (catCounts[c.category] || 0) + 1;
    });
    Object.entries(catCounts).forEach(([cat, count]) => {
      if (count > 10) {
        complaintAlerts.push(`Critical complaint volume in "${cat}": ${count} open issues.`);
      }
    });

    // 4. High risk districts (score < 75)
    const highRiskDistricts = [];
    data.district_scores.forEach(ds => {
      if (ds.score < 75) {
        highRiskDistricts.push(`${ds.district} (Score: ${ds.score}/100)`);
      }
    });

    // Let's build natural insights
    const insights = [];
    insights.push(`${computedKpi?.active_projects || 0} active projects are tracked across ${districtFilter === 'All' ? 'all districts' : districtFilter}.`);
    
    if (delayedProjs.length > 0) {
      insights.push(`${delayedProjs.length} project(s) are delayed or critical: ${delayedProjs.slice(0, 3).map(p => p.name).join(', ')}${delayedProjs.length > 3 ? '...' : ''}.`);
    } else {
      insights.push(`All monitored projects in ${districtFilter === 'All' ? 'Delhi' : districtFilter} are currently on track.`);
    }

    if (highRiskDistricts.length > 0) {
      insights.push(`High risk jurisdiction(s) identified: ${highRiskDistricts.join(', ')}.`);
    }

    if (budgetAlerts.length > 0) {
      insights.push(...budgetAlerts.slice(0, 2));
    }

    if (complaintAlerts.length > 0) {
      insights.push(...complaintAlerts.slice(0, 2));
    } else if (complaintAnalytics.categories.length > 0) {
      insights.push(`Leading complaint category is "${complaintAnalytics.categories[0].name}" with ${complaintAnalytics.categories[0].value} reports.`);
    }

    // Recommendations
    const recs = [];
    if (delayedProjs.length > 0) {
      recs.push(`Deploy specialized recovery teams and fast-track resource dispatch to delayed projects in ${[...new Set(delayedProjs.map(p => p.district))].join(', ')}.`);
    }
    if (highRiskDistricts.length > 0) {
      recs.push(`Establish intensive monitoring and audit protocols for underperforming districts (${[...new Set(highRiskDistricts.map(d => d.split(' ')[0]))].join(', ')}).`);
    }
    if (budgetAlerts.length > 0) {
      recs.push("Review contractor funding utilization rates and reallocate idle funds to critical project milestones.");
    }
    if (complaintAnalytics.categories.length > 0) {
      recs.push(`Prioritize civic maintenance budget allocation to address the surge in "${complaintAnalytics.categories[0].name}" complaints.`);
    }
    if (recs.length === 0) {
      recs.push("Continue routine project milestone inspections.");
      recs.push("Maintain standard grievance redressal workflows.");
    }

    return { insights, recs };
  }, [data, filteredProjects, filteredComplaints, computedKpi, districtFilter, complaintAnalytics]);

  /* ── Helpers ── */
  const fmtCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const isOverdue = (deadline) => new Date(deadline) < new Date();

  const statusBadge = (status) => {
    if (status === 'On Track' || status === 'Completed' || status === 'Resolved' || status === 'Approved') {
      return <span className="badge badge-low">{status}</span>;
    }
    if (status === 'Delayed' || status === 'Medium' || status === 'Pending') {
      return <span className="badge badge-med">{status}</span>;
    }
    if (status === 'Critical' || status === 'High' || status === 'Rejected') {
      return <span className="badge badge-high">{status}</span>;
    }
    return <span className="badge" style={{ backgroundColor: 'var(--blue-50)', color: 'var(--blue-500)' }}>{status}</span>;
  };

  const priorityBadge = (priority) => {
    if (priority === 'High') return <span className="badge badge-high">High</span>;
    if (priority === 'Medium') return <span className="badge badge-med">Medium</span>;
    return <span className="badge badge-low">Low</span>;
  };

  /* ── Recharts custom tooltip style ── */
  const ChartTooltipStyle = { background: '#0d1b37', border: 'none', borderRadius: 0, color: '#fff', fontSize: 11, fontWeight: 700 };

  /* ══════════════════════════════════════════════════
     LOADING / ERROR STATES (only for dashboard views)
     ══════════════════════════════════════════════════ */
  const isDashboardView = ['dashboard', 'preview_dashboard', 'admin_backlog'].includes(view);
  
  if (isDashboardView && loading) return (
    <div className="loading-state"><div className="spinner" />Loading department dashboard...</div>
  );

  if (isDashboardView && error) return (
    <div className="fade-in">
      <div className="error-msg">{error}</div>
      <button className="btn" onClick={() => fetchData(false, selectedMonth, selectedYear)}><RefreshCw size={13} /> Retry</button>
    </div>
  );

  if (selectedProject) {
    const p = selectedProject;
    const stages = ['Assigned', 'Accepted', 'In Progress', 'Completed', 'Verified'];
    const tasksByStage = {};
    stages.forEach(s => { tasksByStage[s] = (p.tasks || []).filter(t => t.stage === s); });
    const stageCounts = stages.map(s => tasksByStage[s].length);

    return (
      <div className="fade-in">
        {/* Breadcrumb */}
        <div className="dept-breadcrumb">
          <span onClick={() => { setSelectedProject(null); }}>Department</span>
          <span className="bc-sep">/</span>
          <span onClick={() => { setDistrictFilter(p.district); setSelectedProject(null); }}>{p.district}</span>
          <span className="bc-sep">/</span>
          <span className="bc-active">{p.name}</span>
        </div>

        <button className="btn" onClick={() => setSelectedProject(null)} style={{ marginBottom: 20 }}>
          <ArrowLeft size={13} /> Back to Dashboard
        </button>

        {/* Project Header */}
        <div className="dept-detail-header">
          <div>
            <div className="dept-detail-title">{p.name}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {p.id} • {p.district} • Officer: {p.officer}
            </div>
          </div>
          <div className="dept-detail-meta">
            <div className="dept-detail-meta-item">
              <span className="meta-label">Budget</span>
              <span className="meta-value">{fmtCurrency(p.budget)}</span>
            </div>
            <div className="dept-detail-meta-item">
              <span className="meta-label">Progress</span>
              <span className="meta-value">{p.progress}%</span>
            </div>
            <div className="dept-detail-meta-item">
              <span className="meta-label">Deadline</span>
              <span className="meta-value" style={{ color: isOverdue(p.deadline) && p.status !== 'Completed' ? 'var(--red-500)' : undefined }}>{fmtDate(p.deadline)}</span>
            </div>
            <div className="dept-detail-meta-item">
              <span className="meta-label">Status</span>
              {statusBadge(p.status)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>Overall Progress</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="progress-bar" style={{ flex: 1, height: 8, margin: 0 }}>
              <div className="fill" style={{ width: `${p.progress}%`, background: p.progress >= 75 ? 'var(--green-500)' : p.progress >= 40 ? 'var(--amber-500)' : 'var(--red-500)' }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--gray-900)' }}>{p.progress}%</span>
          </div>
        </div>

        {/* Fund Utilization */}
        <div style={{ marginBottom: 24 }}>
          <div className="card">
            <h3>Fund Utilization</h3>
            <div className="summary-stats">
              <div className="summary-row"><span className="summary-label">Allocated</span><span className="summary-value">{fmtCurrency(p.allocated)}</span></div>
              <div className="summary-row"><span className="summary-label">Released</span><span className="summary-value">{fmtCurrency(p.released)}</span></div>
              <div className="summary-row"><span className="summary-label">Utilized</span><span className="summary-value" style={{ color: 'var(--green-500)' }}>{fmtCurrency(p.utilized)}</span></div>
              <div className="summary-row"><span className="summary-label">Remaining</span><span className="summary-value" style={{ color: 'var(--amber-500)' }}>{fmtCurrency(p.allocated - p.utilized)}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════
     DEPARTMENT DATA ENTRY VIEW
     ══════════════════════════════════════════════════ */
  if (view === 'data_entry') {
    // Calculate summary stats for display
    const totalProjects = projectsList.length;
    const activeProjects = projectsList.filter(p => p.status !== 'Completed').length;
    const completedProjects = projectsList.filter(p => p.status === 'Completed').length;
    const delayedProjects = projectsList.filter(p => p.status === 'Delayed').length;
    const criticalProjects = projectsList.filter(p => p.status === 'Critical').length;

    return (
      <div className="fade-in">
        {/* ── Sub-Page Navigation Tabs ── */}
        {renderTabs()}

        {/* Page Header */}
        <div className="dept-form-header">
          <div>
            <h2 style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-400)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
              Government of NCT of Delhi • Public Works Department (PWD)
            </h2>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-700)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              Department Project Management
            </h1>
          </div>
          <div className="dept-form-header-actions">
            <button className="btn" onClick={() => setView('dashboard')}>
              <ArrowLeft size={13} /> Back to Dashboard
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveMetrics}
              disabled={projectDistrict === 'All'}
              title={projectDistrict === 'All' ? 'Select a specific district to edit and save' : 'Save changes'}
              style={{
                background: projectDistrict === 'All' ? 'var(--gray-300)' : 'var(--blue-600)',
                color: '#fff',
                cursor: projectDistrict === 'All' ? 'not-allowed' : 'pointer'
              }}
            >
              <Save size={13} /> Save Changes
            </button>
            <button className="btn" onClick={() => { fetchProjects(); fetchDistrictMetrics(); }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════
           SECTION 1: FILTERS & SEARCH
           ═══════════════════════════════════ */}
        <div className="dept-section">
          <div className="dept-section-header">
            <h3>Section 1: Filters & Search</h3>
          </div>
          <div className="card">
            <div className="dept-form-grid-3">
              <div className="dept-form-group">
                <label>Active District</label>
                <select className="dept-form-input" value={projectDistrict} onChange={e => setProjectDistrict(e.target.value)}>
                  <option value="All">All Delhi Districts</option>
                  {DELHI_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="dept-form-group">
                <label>Status Filter</label>
                <select className="dept-form-input" value={projectStatus} onChange={e => setProjectStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="On Track">On Track</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Critical">Critical</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="dept-form-group">
                <label>Search Projects</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--gray-200)', padding: '0 14px', background: 'var(--gray-50)' }}>
                  <Search size={14} color="var(--gray-400)" />
                  <input placeholder="Search by name, ID, officer..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--gray-900)', background: 'transparent', fontWeight: 500, width: '100%', padding: '10px 0' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
           SECTION 2: PROJECT SUMMARY (CALCULATED)
           ═══════════════════════════════════ */}
        <div className="dept-section">
          <div className="dept-section-header">
            <h3>Section 2: Project Summary (Calculated)</h3>
          </div>
          <div className="card">
            <div className="dept-form-grid-5">
              <div className="dept-form-group">
                <label>Total Projects</label>
                <input className="dept-form-input" value={totalProjects} disabled />
              </div>
              <div className="dept-form-group">
                <label>Active Projects</label>
                <input className="dept-form-input" value={activeProjects} disabled />
              </div>
              <div className="dept-form-group">
                <label>Completed Projects</label>
                <input className="dept-form-input" value={completedProjects} disabled />
              </div>
              <div className="dept-form-group">
                <label>Delayed Projects</label>
                <input className="dept-form-input" value={delayedProjects} disabled />
              </div>
              <div className="dept-form-group">
                <label>Critical Projects</label>
                <input className="dept-form-input" value={criticalProjects} disabled />
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
           SECTION 3: PROJECT DETAILS
           ═══════════════════════════════════ */}
        <div className="dept-section">
          <div className="dept-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Section 3: Project Details</h3>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => {
              document.getElementById('add-project-section')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              + Add Project
            </button>
          </div>
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              {projectsLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)', fontWeight: 600 }}>
                  <div className="spinner" style={{ margin: '0 auto 10px' }} />
                  Loading projects...
                </div>
              ) : projectsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)', fontStyle: 'italic' }}>
                  No projects found. Click "+ Add Project" to create one.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Budget (Allocated/Utilized)</th>
                      <th>Officer</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectsList.map((proj) => (
                      <tr key={proj.id}>
                        <td style={{ fontWeight: 700, color: 'var(--gray-900)', whiteSpace: 'nowrap' }}>{proj.id}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--gray-700)', cursor: 'pointer' }} onClick={() => {
                            setSelectedProjectDetails(proj);
                            setDetailsProgress(String(proj.progress));
                            setDetailsProgressRemarks('');
                            setDetailsEvidenceUrl(proj.evidence?.photo_url || '');
                            setDetailsEvidenceRemarks(proj.evidence?.remarks || '');
                            setDetailsApprovalRemarks('');
                            setDetailsDelayStatus(proj.status === 'Critical' ? 'Critical' : 'Delayed');
                            setDetailsDelayRemarks('');
                          }}>
                            {proj.name}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--gray-600)' }}>{proj.type}</td>
                        <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{proj.progress}%</td>
                        <td>{statusBadge(proj.status)}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {fmtCurrency(proj.budget_allocated)} / <span style={{ color: 'var(--blue-600)' }}>{fmtCurrency(proj.budget_utilized)}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{proj.officer || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => {
                              setSelectedProjectDetails(proj);
                              setDetailsProgress(String(proj.progress));
                              setDetailsProgressRemarks('');
                              setDetailsEvidenceUrl(proj.evidence?.photo_url || '');
                              setDetailsEvidenceRemarks(proj.evidence?.remarks || '');
                              setDetailsApprovalRemarks('');
                              setDetailsDelayStatus(proj.status === 'Critical' ? 'Critical' : 'Delayed');
                              setDetailsDelayRemarks('');
                            }}>View</button>
                            <button className="btn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => {
                              setProjectForm({
                                ...proj,
                                evidence: proj.evidence || { photo_url: '', gps: '28.6139° N, 77.2090° E', timestamp: new Date().toISOString(), remarks: '' }
                              });
                              setProjectModal({ type: 'edit' });
                            }}>Edit</button>
                            <button className="btn" style={{ padding: '6px 10px', fontSize: 11, color: 'var(--red-500)' }} onClick={() => handleDeleteProject(proj.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
           SECTION 4: INFRASTRUCTURE METRICS (COMPLETED / ONGOING)
           ═══════════════════════════════════ */}
        <div className="dept-section">
          <div className="dept-section-header">
            <h3>Section 4: Infrastructure Metrics (Completed / Ongoing)</h3>
          </div>
          <div className="card">
            {metricsLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray-500)', fontSize: 13, fontWeight: 500 }}>
                Loading metrics...
              </div>
            ) : (
              <>
                <div className="dept-form-grid-3">
                  {[
                    { label: 'Roads Constructed (KM)', key: 'roads' },
                    { label: 'Flyovers Constructed (Units)', key: 'flyovers' },
                    { label: 'Bridges Built (Units)', key: 'bridges' },
                  ].map(item => {
                    const completed = infraMetrics[`${item.key}_completed`];
                    const ongoing = infraMetrics[`${item.key}_ongoing`];
                    return (
                      <div key={item.key} style={{ border: '1px solid var(--gray-200)', padding: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{item.label}</div>
                        <div className="dept-form-grid-2">
                          <div className="dept-form-group">
                            <label>Completed</label>
                            <input 
                              type="number" 
                              className="dept-form-input" 
                              value={completed} 
                              onChange={e => setInfraMetrics({ ...infraMetrics, [`${item.key}_completed`]: parseFloat(e.target.value) || 0 })}
                              disabled={projectDistrict === 'All'} 
                            />
                          </div>
                          <div className="dept-form-group">
                            <label>Ongoing</label>
                            <input 
                              type="number" 
                              className="dept-form-input" 
                              value={ongoing} 
                              onChange={e => setInfraMetrics({ ...infraMetrics, [`${item.key}_ongoing`]: parseFloat(e.target.value) || 0 })}
                              disabled={projectDistrict === 'All'} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="dept-form-grid-3" style={{ marginTop: 16 }}>
                  {[
                    { label: 'Govt Buildings Built (Units)', key: 'buildings' },
                    { label: 'Drainage Systems (Units)', key: 'drainage' },
                    { label: 'Street Lighting Installed (Units)', key: 'lighting' },
                  ].map(item => {
                    const completed = infraMetrics[`${item.key}_completed`];
                    const ongoing = infraMetrics[`${item.key}_ongoing`];
                    return (
                      <div key={item.key} style={{ border: '1px solid var(--gray-200)', padding: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{item.label}</div>
                        <div className="dept-form-grid-2">
                          <div className="dept-form-group">
                            <label>Completed</label>
                            <input 
                              type="number" 
                              className="dept-form-input" 
                              value={completed} 
                              onChange={e => setInfraMetrics({ ...infraMetrics, [`${item.key}_completed`]: parseFloat(e.target.value) || 0 })}
                              disabled={projectDistrict === 'All'} 
                            />
                          </div>
                          <div className="dept-form-group">
                            <label>Ongoing</label>
                            <input 
                              type="number" 
                              className="dept-form-input" 
                              value={ongoing} 
                              onChange={e => setInfraMetrics({ ...infraMetrics, [`${item.key}_ongoing`]: parseFloat(e.target.value) || 0 })}
                              disabled={projectDistrict === 'All'} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════
           SECTION 5: FUND MANAGEMENT
           ═══════════════════════════════════ */}
        <div className="dept-section">
          <div className="dept-section-header">
            <h3>Section 5: Fund Management</h3>
          </div>
          <div className="card">
            {metricsLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray-500)', fontSize: 13, fontWeight: 500 }}>
                Loading fund data...
              </div>
            ) : (
              <div className="dept-form-grid-4">
                <div className="dept-form-group">
                  <label>Allocated Budget (₹)</label>
                  <input 
                    type="number" 
                    className="dept-form-input" 
                    value={fundAllocated} 
                    onChange={e => setFundAllocated(parseFloat(e.target.value) || 0)}
                    disabled={projectDistrict === 'All'} 
                  />
                </div>
                <div className="dept-form-group">
                  <label>Released Budget (₹)</label>
                  <input 
                    type="number" 
                    className="dept-form-input" 
                    value={fundReleased} 
                    onChange={e => setFundReleased(parseFloat(e.target.value) || 0)}
                    disabled={projectDistrict === 'All'} 
                  />
                </div>
                <div className="dept-form-group">
                  <label>Utilized Budget (₹)</label>
                  <input 
                    type="number" 
                    className="dept-form-input" 
                    value={fundSpent} 
                    onChange={e => setFundSpent(parseFloat(e.target.value) || 0)}
                    disabled={projectDistrict === 'All'} 
                  />
                </div>
                <div className="dept-form-group">
                  <label>Remaining Budget (₹) (Calculated)</label>
                  <input 
                    type="text" 
                    className="dept-form-input" 
                    value={(fundReleased - fundSpent).toLocaleString('en-IN')} 
                    disabled 
                  />
                </div>
              </div>
            )}
          </div>
          {projectDistrict === 'All' && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 4, background: 'var(--amber-50)', border: '1px solid var(--amber-200)', color: 'var(--amber-800)', fontSize: 12, fontWeight: 500 }}>
              ⚠️ Select a specific district in Section 1 to edit and save changes to Infrastructure Metrics and Fund Management.
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════
           SECTION 6: ADD NEW PROJECT
           ═══════════════════════════════════ */}
        <div className="dept-section" id="add-project-section" style={{ marginTop: 24 }}>
          <div className="dept-section-header">
            <h3>Section 6: Add New Project</h3>
          </div>
          <div className="card">
            <form onSubmit={handleAddProjectInline}>
              <div className="dept-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Project Name *</label>
                  <input className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} value={addProjectForm.name} onChange={e => setAddProjectForm({ ...addProjectForm, name: e.target.value })} placeholder="e.g. Outer Ring Road Repair" required />
                </div>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>District *</label>
                  <select className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} value={addProjectForm.district} onChange={e => setAddProjectForm({ ...addProjectForm, district: e.target.value })}>
                    {DELHI_DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="dept-form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Project Type</label>
                  <select className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} value={addProjectForm.type} onChange={e => setAddProjectForm({ ...addProjectForm, type: e.target.value })}>
                    <option value="Roads">Roads</option>
                    <option value="Flyovers">Flyovers</option>
                    <option value="Bridges">Bridges</option>
                    <option value="Government Buildings">Government Buildings</option>
                    <option value="Drainage">Drainage</option>
                    <option value="Footpaths">Footpaths</option>
                    <option value="Street Lighting">Street Lighting</option>
                  </select>
                </div>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Officer In Charge</label>
                  <input className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} value={addProjectForm.officer} onChange={e => setAddProjectForm({ ...addProjectForm, officer: e.target.value })} placeholder="Er. Rajesh" />
                </div>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Deadline</label>
                  <input className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} type="date" value={addProjectForm.deadline} onChange={e => setAddProjectForm({ ...addProjectForm, deadline: e.target.value })} />
                </div>
              </div>

              <div className="dept-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Contractor</label>
                  <input className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} value={addProjectForm.contractor} onChange={e => setAddProjectForm({ ...addProjectForm, contractor: e.target.value })} placeholder="e.g. L&T Infrastructure" />
                </div>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Executing Agency</label>
                  <input className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} value={addProjectForm.executing_agency} onChange={e => setAddProjectForm({ ...addProjectForm, executing_agency: e.target.value })} placeholder="e.g. PWD Zone 1" />
                </div>
              </div>

              <div className="dept-form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Budget Allocated (₹)</label>
                  <input className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} type="number" value={addProjectForm.budget_allocated} onChange={e => setAddProjectForm({ ...addProjectForm, budget_allocated: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Budget Released (₹)</label>
                  <input className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} type="number" value={addProjectForm.budget_released} onChange={e => setAddProjectForm({ ...addProjectForm, budget_released: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Budget Utilized (₹)</label>
                  <input className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} type="number" value={addProjectForm.budget_utilized} onChange={e => setAddProjectForm({ ...addProjectForm, budget_utilized: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="dept-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Status</label>
                  <select className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} value={addProjectForm.status} onChange={e => {
                    const newStatus = e.target.value;
                    setAddProjectForm(prev => ({
                      ...prev,
                      status: newStatus,
                      progress: newStatus === 'Completed' ? 100 : prev.progress
                    }));
                  }}>
                    <option value="On Track">On Track</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Critical">Critical</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="dept-form-group">
                  <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Progress ({addProjectForm.progress}%)</label>
                  <input className="dept-form-input" style={{ width: '100%', height: 38 }} type="range" min="0" max="100" value={addProjectForm.progress} disabled={addProjectForm.status === 'Completed'} onChange={e => setAddProjectForm({ ...addProjectForm, progress: parseInt(e.target.value, 10) || 0 })} />
                </div>
              </div>

              <div className="dept-form-group" style={{ marginBottom: 20 }}>
                <label className="dept-modal-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Project Remarks</label>
                <input className="dept-form-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }} value={addProjectForm.remarks} onChange={e => setAddProjectForm({ ...addProjectForm, remarks: e.target.value })} placeholder="General updates, reasons for delay, etc." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn" onClick={() => setAddProjectForm({
                  name: '',
                  district: projectDistrict !== 'All' ? projectDistrict : 'New Delhi',
                  type: 'Roads',
                  contractor: '',
                  executing_agency: '',
                  budget_allocated: 0,
                  budget_released: 0,
                  budget_utilized: 0,
                  progress: 0,
                  deadline: new Date().toISOString().substring(0, 10),
                  status: 'On Track',
                  officer: '',
                  remarks: ''
                })}>Reset Form</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--blue-600)', color: '#fff' }}>Save Project</button>
              </div>
            </form>
          </div>
        </div>

        {projectModal && (
          <div className="dept-modal-overlay" onClick={() => setProjectModal(null)}>
            <div className="dept-modal" onClick={e => e.stopPropagation()} style={{ width: 680 }}>
              <div className="dept-modal-header">
                <div className="dept-modal-title">
                  {projectModal.type === 'add' ? 'Add New Project' : `Edit Project: ${projectForm.id}`}
                </div>
                <button className="dept-modal-close" onClick={() => setProjectModal(null)}><X size={14} /></button>
              </div>
              <div className="dept-modal-body">
                <div className="dept-form-grid-2">
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Project Name *</label>
                    <input className="dept-modal-input" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="e.g. Outer Ring Road Repair" />
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">District *</label>
                    <select className="dept-modal-input" value={projectForm.district || 'New Delhi'} onChange={e => setProjectForm({ ...projectForm, district: e.target.value })} disabled={projectModal.type === 'edit'}>
                      {DELHI_DISTRICTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="dept-form-grid-2">
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Project Type</label>
                    <select className="dept-modal-input" value={projectForm.type} onChange={e => setProjectForm({ ...projectForm, type: e.target.value })}>
                      <option value="Roads">Roads</option>
                      <option value="Flyovers">Flyovers</option>
                      <option value="Bridges">Bridges</option>
                      <option value="Government Buildings">Government Buildings</option>
                      <option value="Drainage">Drainage</option>
                      <option value="Footpaths">Footpaths</option>
                      <option value="Street Lighting">Street Lighting</option>
                    </select>
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Officer In Charge</label>
                    <input className="dept-modal-input" value={projectForm.officer || ''} onChange={e => setProjectForm({ ...projectForm, officer: e.target.value })} placeholder="Er. Rajesh" />
                  </div>
                </div>

                <div className="dept-form-grid-2">
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Contractor</label>
                    <input className="dept-modal-input" value={projectForm.contractor} onChange={e => setProjectForm({ ...projectForm, contractor: e.target.value })} placeholder="e.g. L&T Infrastructure" />
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Executing Agency</label>
                    <input className="dept-modal-input" value={projectForm.executing_agency} onChange={e => setProjectForm({ ...projectForm, executing_agency: e.target.value })} placeholder="e.g. PWD Zone 1" />
                  </div>
                </div>

                <div className="dept-form-grid-3">
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Budget Allocated (₹)</label>
                    <input className="dept-modal-input" type="number" value={projectForm.budget_allocated} onChange={e => setProjectForm({ ...projectForm, budget_allocated: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Budget Released (₹)</label>
                    <input className="dept-modal-input" type="number" value={projectForm.budget_released} onChange={e => setProjectForm({ ...projectForm, budget_released: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Budget Utilized (₹)</label>
                    <input className="dept-modal-input" type="number" value={projectForm.budget_utilized} onChange={e => setProjectForm({ ...projectForm, budget_utilized: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="dept-form-grid-3">
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Deadline</label>
                    <input className="dept-modal-input" type="date" value={projectForm.deadline} onChange={e => setProjectForm({ ...projectForm, deadline: e.target.value })} />
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Status</label>
                    <select className="dept-modal-input" value={projectForm.status} onChange={e => {
                      const newStatus = e.target.value;
                      setProjectForm(prev => ({
                        ...prev,
                        status: newStatus,
                        progress: newStatus === 'Completed' ? 100 : prev.progress
                      }));
                    }}>
                      <option value="On Track">On Track</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Critical">Critical</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Progress ({projectForm.progress}%)</label>
                    <input className="dept-modal-input" type="range" min="0" max="100" value={projectForm.progress} disabled={projectForm.status === 'Completed'} onChange={e => setProjectForm({ ...projectForm, progress: parseInt(e.target.value, 10) || 0 })} />
                  </div>
                </div>

                <div className="dept-modal-field">
                  <label className="dept-modal-label">Project Remarks</label>
                  <input className="dept-modal-input" value={projectForm.remarks || ''} onChange={e => setProjectForm({ ...projectForm, remarks: e.target.value })} placeholder="General updates, reasons for delay, etc." />
                </div>

                {/* Evidence Section (Only editable in Edit mode) */}
                {projectModal.type === 'edit' && (
                  <div style={{ marginTop: 20, borderTop: '1px solid var(--gray-200)', paddingTop: 16 }}>
                    <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-900)', textTransform: 'uppercase', marginBottom: 12 }}>Upload / Edit Evidence</h4>
                    <div className="dept-form-grid-2">
                      <div className="dept-modal-field">
                        <label className="dept-modal-label">Photo Evidence</label>
                        <div 
                          className="photo-upload-zone" 
                          onClick={() => document.getElementById('project-edit-photo-input').click()}
                          style={{ position: 'relative', border: '1.5px dashed var(--gray-300)', borderRadius: 4, padding: 20, textAlign: 'center', cursor: 'pointer', minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Upload size={18} style={{ marginBottom: 6 }} />
                          <div style={{ fontSize: 11, fontWeight: 700 }}>Click to upload image</div>
                          <input id="project-edit-photo-input" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                          {projectForm.evidence?.photo_url && (
                            <img src={projectForm.evidence.photo_url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} alt="Evidence Preview" />
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="dept-modal-field">
                          <label className="dept-modal-label">GPS Coordinates</label>
                          <input className="dept-modal-input" value={projectForm.evidence?.gps || '28.6139° N, 77.2090° E'} disabled />
                        </div>
                        <div className="dept-modal-field">
                          <label className="dept-modal-label">Evidence Remarks</label>
                          <input className="dept-modal-input" value={projectForm.evidence?.remarks || ''} onChange={e => setProjectForm({
                            ...projectForm,
                            evidence: { ...projectForm.evidence, remarks: e.target.value }
                          })} placeholder="Describe status at site..." />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {projectModal.type === 'edit' && (
                  <div style={{ marginTop: 24, borderTop: '1px solid var(--gray-200)', paddingTop: 16 }}>
                    <label className="dept-modal-label" style={{ marginBottom: 12 }}>Detailed Project Actions</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      <button className="btn" style={{ fontSize: 11, padding: '8px 4px', justifyContent: 'center', gap: 4 }} title="Update Progress" onClick={() => { setModal({ type: 'progress', project: projectForm }); setModalProgress(String(projectForm.progress)); setModalRemarks(projectForm.remarks || ''); }}>
                        <ArrowUpRight size={13} /> Progress
                      </button>
                      <button className="btn" style={{ fontSize: 11, padding: '8px 4px', justifyContent: 'center', gap: 4 }} title="Upload Evidence" onClick={() => { setModal({ type: 'evidence', project: projectForm }); setModalEvidenceUrl(projectForm.evidence?.photo_url || ''); setModalRemarks(projectForm.evidence?.remarks || ''); }}>
                        <Camera size={13} /> Evidence
                      </button>
                      <button className="btn" style={{ fontSize: 11, padding: '8px 4px', justifyContent: 'center', gap: 4 }} title="Request Approval" onClick={() => { setModal({ type: 'approval', project: projectForm }); setModalRemarks(''); }}>
                        <CheckCircle size={13} /> Approval
                      </button>
                      <button className="btn" style={{ fontSize: 11, padding: '8px 4px', justifyContent: 'center', gap: 4 }} title="Flag Delay" onClick={() => { setModal({ type: 'delay', project: projectForm }); setModalDelayStatus(projectForm.status === 'Critical' ? 'Critical' : 'Delayed'); setModalRemarks(projectForm.remarks || ''); }}>
                        <Flag size={13} /> Flag Delay
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="dept-modal-footer">
                <button className="btn" onClick={() => setProjectModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveProjectModal}>Save Project</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }



  const handleViewProjectDetailsByUid = async (projectUid) => {
    try {
      const res = await fetch(`${API_BASE}/projects?search=${projectUid}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = await res.json();
      const proj = list.find(p => p.id === projectUid);
      if (proj) {
        setView('data_entry');
        setSelectedProjectDetails(proj);
        setDetailsProgress(String(proj.progress));
        setDetailsProgressRemarks('');
        setDetailsEvidenceUrl(proj.evidence?.photo_url || '');
        setDetailsEvidenceRemarks(proj.evidence?.remarks || '');
        setDetailsApprovalRemarks('');
        setDetailsDelayStatus(proj.status === 'Critical' ? 'Critical' : 'Delayed');
        setDetailsDelayRemarks('');
      } else {
        alert(`Project ${projectUid} not found.`);
      }
    } catch (e) {
      console.error("Failed to view project details:", e);
      alert("Failed to load project details.");
    }
  };

  if (view === 'admin_backlog') {
    const admin_backlog = computedAdminBacklog;
    
    // Filter projectsList based on backlogDistrict
    const currentDistrict = backlogDistrict;
    const filteredProjects = currentDistrict === 'All'
      ? projectsList
      : projectsList.filter(p => p.district === currentDistrict);

    // 1. Delayed Projects
    const delayedProjects = filteredProjects.filter(p => p.status === 'Delayed' || p.status === 'Critical');

    // 2. Pending Approvals
    const pendingApprovals = filteredProjects.filter(p => p.approval && p.approval.status === 'Pending');

    // 3. Reports Awaiting Review (Draft Reports)
    const draftReports = districtSummary 
      ? districtSummary.district_data.filter(d => (currentDistrict === 'All' || d.district_name === currentDistrict) && d.status === 'draft')
      : [];

    return (
      <div className="fade-in">
        {renderTabs()}

        {/* Page Header */}
        <div className="dept-form-header">
          <div>
            <h2 style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-400)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
              Government of NCT of Delhi • Public Works Department (PWD)
            </h2>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-700)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              Administrative Backlog Analysis
            </h1>
          </div>
          
          {/* District Selector Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              District:
            </span>
            <select 
              value={backlogDistrict} 
              onChange={e => setBacklogDistrict(e.target.value)} 
              style={{
                fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: 'var(--gray-700)',
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 14px',
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', outline: 'none', height: 38
              }}
            >
              <option value="All">All Districts</option>
              {DELHI_DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          {/* Card 1: Pending Approvals */}
          <div className="stat-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="stat-icon" style={{ background: 'var(--amber-50)', color: 'var(--amber-500)' }}><FileStack size={20} /></div>
            <div>
              <p className="label">Pending Approvals</p>
              <p className="value" style={{ color: 'var(--amber-500)' }}>
                {admin_backlog?.pending_approvals ?? 0}
              </p>
            </div>
          </div>
          
          {/* Card 2: Reports Awaiting Review */}
          <div className="stat-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="stat-icon" style={{ background: 'var(--blue-50)', color: 'var(--blue-600)' }}><ClipboardList size={20} /></div>
            <div>
              <p className="label">Reports Awaiting Review</p>
              <p className="value" style={{ color: 'var(--blue-600)' }}>
                {admin_backlog?.pending_reports ?? 0}
              </p>
            </div>
          </div>

          {/* Card 3: Requests Awaiting Action */}
          <div className="stat-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="stat-icon" style={{ background: 'var(--purple-50)', color: 'var(--purple-500)' }}><TrendingUp size={20} /></div>
            <div>
              <p className="label">Requests Awaiting Action</p>
              <p className="value" style={{ color: 'var(--purple-500)' }}>
                {admin_backlog?.pending_requests ?? 0}
              </p>
            </div>
          </div>

          {/* Card 4: Delayed Cases */}
          <div className="stat-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="stat-icon" style={{ background: 'var(--red-50)', color: 'var(--red-500)' }}><AlertTriangle size={20} /></div>
            <div>
              <p className="label">Delayed Cases</p>
              <p className="value" style={{ color: 'var(--red-500)' }}>
                {admin_backlog?.delayed_cases ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Age Buckets & Distribution Chart */}
        <div className="dept-charts-grid" style={{ gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
          {/* Age Buckets Counts */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)', marginBottom: 16 }}>
              Age Distribution Breakdown
            </h4>
            <div className="dept-backlog-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {admin_backlog?.age_buckets.map(b => (
                <div 
                  className="dept-backlog-bucket" 
                  key={b.label}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '12px 18px', background: 'var(--gray-50)', border: '1px solid var(--gray-100)',
                    borderRadius: 4
                  }}
                >
                  <div className="bucket-label" style={{ fontWeight: 700, color: 'var(--gray-700)', fontSize: 12 }}>{b.label}</div>
                  <div className="bucket-count" style={{ fontWeight: 900, fontSize: 16, color: 'var(--blue-700)' }}>{b.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Age Distribution Chart */}
          <div className="dept-chart-card">
            <h4>Backlog Age Analysis (Count of Overdue Items)</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={admin_backlog?.age_buckets || []}>
                <defs>
                  <linearGradient id="backlogGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--blue-500)" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="var(--blue-700)" stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700 }} stroke="var(--gray-300)" />
                <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="var(--gray-300)" allowDecimals={false} />
                <Tooltip contentStyle={ChartTooltipStyle} />
                <Bar dataKey="count" fill="url(#backlogGrad)" barSize={45} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Lists Tab Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          {/* Table 1: Delayed Projects */}
          <div className="card">
            <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--red-500)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              Delayed or Critical Cases Awaiting Action ({delayedProjects.length})
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Project Name</th>
                    <th>District</th>
                    <th>Category</th>
                    <th>Progress</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {delayedProjects.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)', fontStyle: 'italic' }}>
                        No delayed cases found for this selection.
                      </td>
                    </tr>
                  ) : (
                    delayedProjects.map(p => (
                      <tr 
                        key={p.id} 
                        style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                        onClick={() => handleViewProjectDetailsByUid(p.id)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ fontWeight: 800, color: 'var(--gray-900)' }}>{p.id}</td>
                        <td style={{ fontWeight: 700 }}>{p.name}</td>
                        <td>{p.district}</td>
                        <td>{p.type}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{p.progress}%</span>
                            <div className="progress-bar" style={{ width: 60, height: 5 }}>
                              <div className="fill" style={{ width: `${p.progress}%`, background: p.status === 'Critical' ? 'var(--red-500)' : 'var(--amber-500)' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtDate(p.deadline)}</td>
                        <td>
                          <span className="badge" style={{
                            background: p.status === 'Critical' ? '#fee2e2' : '#fef3c7',
                            color: p.status === 'Critical' ? 'var(--red-500)' : 'var(--amber-500)',
                            fontWeight: 800
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '6px 12px', fontSize: 11 }}>
                            View Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Pending Project Approvals */}
          <div className="card">
            <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--amber-500)', marginBottom: 16 }}>
              Pending Project Approval Requests ({pendingApprovals.length})
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Project Name</th>
                    <th>District</th>
                    <th>Category</th>
                    <th>Requested By</th>
                    <th>Comments</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)', fontStyle: 'italic' }}>
                        No pending approvals found for this selection.
                      </td>
                    </tr>
                  ) : (
                    pendingApprovals.map(p => (
                      <tr 
                        key={p.id} 
                        style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                        onClick={() => handleViewProjectDetailsByUid(p.id)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ fontWeight: 800, color: 'var(--gray-900)' }}>{p.id}</td>
                        <td style={{ fontWeight: 700 }}>{p.name}</td>
                        <td>{p.district}</td>
                        <td>{p.type}</td>
                        <td style={{ fontWeight: 600 }}>{p.officer || 'PWD Officer'}</td>
                        <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{p.approval?.comments || 'Requested for final review'}</td>
                        <td>
                          <span className="badge" style={{ background: '#fef3c7', color: '#d97706', fontWeight: 800 }}>
                            {p.approval?.status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 11 }}>
                            Review Request
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 3: Draft Reports Awaiting Review */}
          <div className="card">
            <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--blue-600)', marginBottom: 16 }}>
              District Reports Awaiting Submission / Review ({draftReports.length})
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>District ID</th>
                    <th>District Name</th>
                    <th>Total Projects</th>
                    <th>Active Projects</th>
                    <th>Delayed Projects</th>
                    <th>Spent vs Allocated</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {draftReports.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)', fontStyle: 'italic' }}>
                        All district reports are submitted and published!
                      </td>
                    </tr>
                  ) : (
                    draftReports.map(d => (
                      <tr key={d.district_id}>
                        <td style={{ fontWeight: 800, color: 'var(--gray-900)' }}>{d.district_id}</td>
                        <td style={{ fontWeight: 700 }}>{d.district_name}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{d.total_projects}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{d.active_projects || d.total_projects - d.projects_completed}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: d.projects_delayed > 0 ? 'var(--red-500)' : 'inherit', fontWeight: 700 }}>{d.projects_delayed}</td>
                        <td style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {fmtCurrency(d.funds_spent)} / {fmtCurrency(d.funds_allocated)}
                        </td>
                        <td>
                          <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800, textTransform: 'uppercase' }}>
                            Draft (Awaiting Submit)
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn" 
                            style={{ padding: '6px 12px', fontSize: 11 }}
                            onClick={() => {
                              setActiveDistrictId(d.district_id);
                              setView('data_entry');
                            }}
                          >
                            Open Form
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'audit_trail') {
    return (
      <div className="fade-in">
        {renderTabs()}

        {/* Page Header */}
        <div className="dept-form-header">
          <div>
            <h2 style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-400)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
              Government of NCT of Delhi • Public Works Department (PWD)
            </h2>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-700)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              Audit & Decision Trail
            </h1>
          </div>
          <button className="btn" onClick={() => fetchAuditLogs()} style={{ height: 38 }}><RefreshCw size={12} /> Refresh</button>
        </div>

        {/* Filters Bar */}
        <div className="card" style={{ marginBottom: 24, padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', border: '1px solid var(--gray-200)', background: 'var(--white)', padding: '6px 12px', height: 38 }}>
              <Search size={14} style={{ color: 'var(--gray-400)', marginRight: 8 }} />
              <input 
                type="text" 
                placeholder="Search remarks, officer, project..." 
                value={auditSearch}
                onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 12, fontFamily: 'var(--font)' }}
              />
            </div>
            
            <select 
              value={auditActionType} 
              onChange={e => { setAuditActionType(e.target.value); setAuditPage(1); }}
              style={{
                fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
                cursor: 'pointer', outline: 'none', minWidth: 150, height: 38
              }}
            >
              <option value="All">All Action Types</option>
              <option value="Project Created">Project Created</option>
              <option value="Project Updated">Project Updated</option>
              <option value="Project Deleted">Project Deleted</option>
              <option value="Progress Updated">Progress Updated</option>
              <option value="Status Changed">Status Changed</option>
              <option value="Budget Updated">Budget Updated</option>
              <option value="Draft Saved">Draft Saved</option>
              <option value="Report Submitted">Report Submitted</option>
              <option value="Evidence Uploaded">Evidence Uploaded</option>
              <option value="Approval Requested">Approval Requested</option>
              <option value="Delay Flagged">Delay Flagged</option>
              <option value="Action Status Updated">Action Status Updated</option>
              <option value="Metrics Updated">Metrics Updated</option>
            </select>

            <select 
              value={auditModule} 
              onChange={e => { setAuditModule(e.target.value); setAuditPage(1); }}
              style={{
                fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
                cursor: 'pointer', outline: 'none', minWidth: 130, height: 38
              }}
            >
              <option value="All">All Modules</option>
              <option value="Projects">Projects</option>
              <option value="Funds">Funds</option>
              <option value="Reports">Reports</option>
              <option value="Action Tracker">Action Tracker</option>
            </select>

            <select 
              value={auditDistrict} 
              onChange={e => { setAuditDistrict(e.target.value); setAuditPage(1); }}
              style={{
                fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
                cursor: 'pointer', outline: 'none', minWidth: 130, height: 38
              }}
            >
              <option value="All">All Districts</option>
              {DELHI_DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <input 
                type="date" 
                value={auditDate}
                onChange={e => { setAuditDate(e.target.value); setAuditPage(1); }}
                style={{
                  fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
                  background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
                  outline: 'none', height: 38
                }}
              />
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            {auditLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)', fontWeight: 600 }}>
                <div className="spinner" style={{ margin: '0 auto 10px' }} />
                Loading audit logs...
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)', fontStyle: 'italic' }}>
                No audit logs found.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Officer</th>
                    <th>District</th>
                    <th>Module</th>
                    <th>Action Type</th>
                    <th>Related Project</th>
                    <th>Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedAuditLog(log)}>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{log.officer}</td>
                      <td style={{ fontWeight: 700, color: 'var(--gray-600)' }}>{log.district || '—'}</td>
                      <td>
                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569', borderRadius: 0, fontWeight: 800 }}>
                          {log.module}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ 
                          background: log.action_type.includes('Created') || log.action_type.includes('Submitted') ? '#f0fdf4' : log.action_type.includes('Deleted') || log.action_type.includes('Rejected') ? '#fef2f2' : '#fef3c7',
                          color: log.action_type.includes('Created') || log.action_type.includes('Submitted') ? 'var(--green-600)' : log.action_type.includes('Deleted') || log.action_type.includes('Rejected') ? 'var(--red-500)' : '#d97706',
                          borderRadius: 0,
                          fontWeight: 800
                        }}>{log.action_type}</span>
                      </td>
                      <td style={{ fontWeight: 800, fontSize: 11, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                        {log.project_uid || '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--gray-600)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.remarks}
                      </td>
                      <td>
                        <button className="btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setSelectedAuditLog(log); }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination */}
        {!auditLoading && auditPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
            <button 
              className="btn" 
              disabled={auditPage === 1} 
              onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)' }}>
              Page {auditPage} of {auditPages}
            </span>
            <button 
              className="btn" 
              disabled={auditPage === auditPages} 
              onClick={() => setAuditPage(prev => Math.min(auditPages, prev + 1))}
            >
              Next
            </button>
          </div>
        )}

        {/* Audit Log Detail Modal */}
        {selectedAuditLog && (
          <div className="dept-modal-overlay" onClick={() => setSelectedAuditLog(null)}>
            <div className="dept-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: '90%' }}>
              <div className="dept-modal-header" style={{ background: '#0d1b37', color: '#ffffff' }}>
                <div className="dept-modal-title" style={{ color: '#ffffff' }}>
                  Audit Log Detail: LOG-{selectedAuditLog.id}
                </div>
                <button className="dept-modal-close" onClick={() => setSelectedAuditLog(null)} style={{ color: '#ffffff' }}><X size={14} /></button>
              </div>
              <div className="dept-modal-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', fontSize: 13 }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{new Date(selectedAuditLog.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Officer</span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedAuditLog.officer}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedAuditLog.department}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>District</span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedAuditLog.district || 'All Districts'}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module</span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedAuditLog.module}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Type</span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedAuditLog.action_type}</span>
                  </div>
                  {selectedAuditLog.project_uid && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Related Project ID</span>
                      <span style={{ fontWeight: 800, color: 'var(--blue-600)', cursor: 'pointer' }} onClick={() => { setSelectedAuditLog(null); handleViewProjectDetailsByUid(selectedAuditLog.project_uid); }}>
                        {selectedAuditLog.project_uid}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Remarks</span>
                  <div style={{ background: 'var(--gray-50)', padding: '12px 16px', border: '1px solid var(--gray-200)', fontSize: 13, color: 'var(--gray-800)', fontWeight: 500, lineHeight: 1.5 }}>
                    {selectedAuditLog.remarks}
                  </div>
                </div>

                {/* Transition / Diff view */}
                {(selectedAuditLog.prev_value || selectedAuditLog.new_value) && (
                  <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 12 }}>
                    <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Value Transition (Before & After)</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: 12, borderRadius: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--red-500)', textTransform: 'uppercase', marginBottom: 4 }}>Previous Value</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 11, color: 'var(--red-700)', fontWeight: 650 }}>
                          {selectedAuditLog.prev_value || 'None'}
                        </pre>
                      </div>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--green-500)', textTransform: 'uppercase', marginBottom: 4 }}>New Value</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 11, color: 'var(--green-700)', fontWeight: 650 }}>
                          {selectedAuditLog.new_value || 'None'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="dept-modal-footer">
                <button className="btn" onClick={() => setSelectedAuditLog(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'action_tracker') {
    if (actionsLoading && actionsList.length === 0) {
      return (
        <div className="fade-in">
          {renderTabs()}
          <div className="loading-state"><div className="spinner" />Loading Action Tracker...</div>
        </div>
      );
    }

    const filteredActions = actionsList.filter(a => {
      if (actionDistrictFilter !== 'All' && a.district !== actionDistrictFilter) return false;
      if (actionPriorityFilter !== 'All' && a.priority !== actionPriorityFilter) return false;
      if (actionStatusFilter !== 'All' && a.status !== actionStatusFilter) return false;
      if (actionSearchQuery.trim() !== '') {
        const query = actionSearchQuery.toLowerCase();
        const titleMatch = (a.title || '').toLowerCase().includes(query);
        const descMatch = (a.description || '').toLowerCase().includes(query);
        const projMatch = (a.project_name || '').toLowerCase().includes(query);
        const assignedByMatch = (a.assigned_by || '').toLowerCase().includes(query);
        const assignedToMatch = (a.assigned_to || '').toLowerCase().includes(query);
        const uidMatch = (a.action_uid || '').toLowerCase().includes(query);
        return titleMatch || descMatch || projMatch || assignedByMatch || assignedToMatch || uidMatch;
      }
      return true;
    });

    const totalCount = filteredActions.length;
    const awaitingAcceptance = filteredActions.filter(a => a.status === 'Assigned').length;
    const inProgressCount = filteredActions.filter(a => a.status === 'Accepted' || a.status === 'In Progress').length;
    const completedCount = filteredActions.filter(a => a.status === 'Completed' || a.status === 'Verified').length;

    const renderActionStatusBadge = (status) => {
      switch(status) {
        case 'Assigned':
          return <span className="badge" style={{ backgroundColor: 'var(--blue-50)', color: 'var(--blue-700)', border: '1px solid var(--blue-100)', borderRadius: 0 }}>Assigned</span>;
        case 'Accepted':
          return <span className="badge" style={{ backgroundColor: '#ecfeff', color: '#0891b2', border: '1px solid #cffafe', borderRadius: 0 }}>Accepted</span>;
        case 'In Progress':
          return <span className="badge" style={{ backgroundColor: 'var(--amber-50)', color: '#92600a', border: '1px solid var(--gray-200)', borderRadius: 0 }}>In Progress</span>;
        case 'Completed':
          return <span className="badge" style={{ backgroundColor: 'var(--green-50)', color: 'var(--green-500)', border: '1px solid var(--green-100)', borderRadius: 0 }}>Completed</span>;
        case 'Verified':
          return <span className="badge" style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 0 }}>✓ Verified</span>;
        default:
          return <span className="badge" style={{ borderRadius: 0 }}>{status}</span>;
      }
    };

    const getNextWorkflowStatus = (currentStatus) => {
      switch(currentStatus) {
        case 'Assigned': return { status: 'Accepted', label: 'Accept Instruction' };
        case 'Accepted': return { status: 'In Progress', label: 'Start Work' };
        case 'In Progress': return { status: 'Completed', label: 'Complete Instruction' };
        case 'Completed': return { status: 'Verified', label: 'Verify Execution' };
        default: return null;
      }
    };

    return (
      <div className="fade-in">
        {renderTabs()}

        {/* Page Header */}
        <div className="dept-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-400)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
              Government of NCT of Delhi • Public Works Department (PWD)
            </h2>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-700)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              Action Tracker & Instruction Ledger
            </h1>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="card" style={{ marginBottom: 24, padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', border: '1px solid var(--gray-200)', background: 'var(--white)', padding: '6px 12px' }}>
              <Search size={14} style={{ color: 'var(--gray-400)', marginRight: 8 }} />
              <input 
                type="text" 
                placeholder="Search instructions, projects, officers..." 
                value={actionSearchQuery}
                onChange={e => setActionSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 12, fontFamily: 'var(--font)' }}
              />
            </div>
            
            <select 
              value={actionDistrictFilter} 
              onChange={e => setActionDistrictFilter(e.target.value)}
              style={{
                fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
                cursor: 'pointer', outline: 'none', minWidth: 150
              }}
            >
              <option value="All">All Districts</option>
              {DELHI_DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select 
              value={actionPriorityFilter} 
              onChange={e => setActionPriorityFilter(e.target.value)}
              style={{
                fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
                cursor: 'pointer', outline: 'none', minWidth: 150
              }}
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select 
              value={actionStatusFilter} 
              onChange={e => setActionStatusFilter(e.target.value)}
              style={{
                fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
                cursor: 'pointer', outline: 'none', minWidth: 150
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="Accepted">Accepted</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Verified">Verified</option>
            </select>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="dept-kpi-grid" style={{ marginBottom: 28, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div className="dept-perf-card">
            <span className="perf-icon" style={{ color: 'var(--blue-700)' }}>📋</span>
            <div>
              <div className="perf-label">Total Instructions</div>
              <div className="perf-val" style={{ fontSize: 22, fontWeight: 900 }}>{totalCount}</div>
            </div>
          </div>
          <div className="dept-perf-card">
            <span className="perf-icon" style={{ color: 'var(--blue-500)' }}>🔔</span>
            <div>
              <div className="perf-label">Awaiting Acceptance</div>
              <div className="perf-val" style={{ fontSize: 22, fontWeight: 900, color: 'var(--blue-500)' }}>{awaitingAcceptance}</div>
            </div>
          </div>
          <div className="dept-perf-card">
            <span className="perf-icon" style={{ color: 'var(--amber-500)' }}>⚙️</span>
            <div>
              <div className="perf-label">In Progress</div>
              <div className="perf-val" style={{ fontSize: 22, fontWeight: 900, color: 'var(--amber-500)' }}>{inProgressCount}</div>
            </div>
          </div>
          <div className="dept-perf-card">
            <span className="perf-icon" style={{ color: 'var(--green-500)' }}>✅</span>
            <div>
              <div className="perf-label">Completed & Verified</div>
              <div className="perf-val" style={{ fontSize: 22, fontWeight: 900, color: 'var(--green-500)' }}>{completedCount}</div>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="card">
          <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-900)', marginBottom: 16 }}>
            Instruction Ledger ({filteredActions.length})
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Instruction / Action Item</th>
                  <th>Associated Project</th>
                  <th>District</th>
                  <th>Assigned By</th>
                  <th>Assigned To</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActions.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)', fontStyle: 'italic' }}>
                      No instructions found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredActions.map(a => {
                    const next = getNextWorkflowStatus(a.status);
                    return (
                      <tr key={a.action_uid} style={{ verticalAlign: 'middle' }}>
                        <td style={{ fontWeight: 800, fontSize: 11, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{a.action_uid}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{a.title}</div>
                          {a.description && <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>{a.description}</div>}
                          {a.remarks && <div style={{ fontSize: 11, color: 'var(--blue-700)', background: 'var(--blue-50)', padding: '4px 8px', marginTop: 4, display: 'inline-block' }}><strong>Remarks:</strong> {a.remarks}</div>}
                          {a.evidence_url && (
                            <div style={{ marginTop: 4 }}>
                              <a href={a.evidence_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--blue-600)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                                <Camera size={12} /> View Evidence
                              </a>
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{a.project_name}</td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{a.district}</td>
                        <td style={{ fontSize: 12 }}>{a.assigned_by}</td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{a.assigned_to}</td>
                        <td style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{a.deadline}</td>
                        <td>{priorityBadge(a.priority)}</td>
                        <td>{renderActionStatusBadge(a.status)}</td>
                        <td>
                          {next ? (
                            <button 
                              className="btn btn-primary" 
                              style={{ fontSize: 11, padding: '4px 8px', whiteSpace: 'nowrap' }}
                              onClick={() => handleUpdateActionStatus(a, next.status)}
                            >
                              {next.label}
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--gray-400)', fontStyle: 'italic' }}>Verified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workflow Transition Modal */}
        {actionUpdateModal && (
          <div className="dept-modal-overlay" onClick={() => setActionUpdateModal(null)}>
            <div className="dept-modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
              <div className="dept-modal-header">
                <div className="dept-modal-title">Update Instruction Status</div>
                <button className="dept-modal-close" onClick={() => setActionUpdateModal(null)}><X size={14} /></button>
              </div>
              <div className="dept-modal-body">
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 4 }}>Instruction ID</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{actionUpdateModal.action_uid} - {actionUpdateModal.title}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 4 }}>Current Status</div>
                    <div>{renderActionStatusBadge(actionUpdateModal.status)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 4 }}>New Target Status</div>
                    <div>{renderActionStatusBadge(modalActionStatus)}</div>
                  </div>
                </div>

                <div className="dept-modal-field">
                  <label className="dept-modal-label">Execution Remarks / Comments</label>
                  <textarea 
                    className="dept-modal-input" 
                    value={modalActionRemarks}
                    onChange={e => setModalActionRemarks(e.target.value)}
                    placeholder="Enter any notes about the action, completion progress, or verification details..."
                    style={{ height: 80, resize: 'none', padding: 8 }}
                  />
                </div>

                {(modalActionStatus === 'Completed' || modalActionStatus === 'Verified') && (
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Evidence Image URL (Optional)</label>
                    <input 
                      className="dept-modal-input" 
                      type="text" 
                      value={modalActionEvidenceUrl}
                      onChange={e => setModalActionEvidenceUrl(e.target.value)}
                      placeholder="e.g. http://images.gov.in/pothole_fixed.jpg"
                    />
                  </div>
                )}
              </div>
              <div className="dept-modal-footer">
                <button className="btn" onClick={() => setActionUpdateModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitActionStatusUpdate}>Confirm Status Update</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'ai_summary') {
    return (
      <div className="fade-in">
        {renderTabs()}

        {/* Header */}
        <div className="dept-form-header">
          <div>
            <h2 style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-400)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
              Government of NCT of Delhi • Public Works Department (PWD)
            </h2>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-700)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              AI Department Summary
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn" onClick={() => fetchAiSummary(selectedMonth, selectedYear)} disabled={aiLoading} style={{ height: 38 }}>
              <RefreshCw size={13} className={aiLoading ? 'spin' : ''} /> {aiLoading ? 'Analyzing...' : 'Re-run Analysis'}
            </button>
          </div>
        </div>

        {aiLoading || !aiSummaryData ? (
          <div className="loading-state"><div className="spinner" />Running AI synthesis model...</div>
        ) : (
          <div className="dept-form-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Top AI Synthesis Banner */}
            <div style={{ background: 'var(--blue-700)', padding: '24px 32px', color: 'white', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--amber-500)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                AI Department Synthesis
              </div>
              <p style={{ fontSize: 13, color: 'var(--blue-100)', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                Active SQLite audit tracking and district reports parsed. The model has generated key insights regarding delayed projects, civic complaint trends, and fund utilization issues.
              </p>
            </div>

            {/* Row 1: Delayed Projects & Complaint Trends */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
              
              {/* Delayed Projects */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '2px solid var(--gray-100)', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--gray-900)', letterSpacing: '0.06em', margin: 0 }}>
                    Delayed Projects
                  </h3>
                  <span className="badge badge-high" style={{ fontSize: 10 }}>
                    {aiSummaryData.delayed_projects?.count || 0} Critical
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', background: '#fee2e2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 4, margin: 0 }}>
                    {aiSummaryData.delayed_projects?.insight}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
                    {(aiSummaryData.delayed_projects?.list || []).map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid var(--gray-200)', borderRadius: 4 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-950)' }}>{p.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase' }}>{p.id} • {p.district}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 750, color: 'var(--gray-800)' }}>{p.progress}%</span>
                          {statusBadge(p.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Complaint Trends */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '2px solid var(--gray-100)', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--gray-900)', letterSpacing: '0.06em', margin: 0 }}>
                    Complaint Trends
                  </h3>
                  <span className="badge badge-med" style={{ fontSize: 10 }}>
                    {aiSummaryData.complaint_trends?.open || 0} Open Issues
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', background: 'var(--gray-100)', border: '1px solid var(--gray-200)', padding: '10px 14px', borderRadius: 4, margin: 0 }}>
                    {aiSummaryData.complaint_trends?.insight}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ border: '1px solid var(--gray-200)', padding: 12, borderRadius: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--gray-450)', textTransform: 'uppercase' }}>Total Complaints</span>
                      <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gray-800)', marginTop: 4 }}>{aiSummaryData.complaint_trends?.total}</div>
                    </div>
                    <div style={{ border: '1px solid var(--gray-200)', padding: 12, borderRadius: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--gray-450)', textTransform: 'uppercase' }}>Resolution Rate</span>
                      <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--green-500)', marginTop: 4 }}>{aiSummaryData.complaint_trends?.resolution_rate}%</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Row 2: Fund Issues & Recommendations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
              
              {/* Fund Issues */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '2px solid var(--gray-100)', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--gray-900)', letterSpacing: '0.06em', margin: 0 }}>
                    Fund Issues
                  </h3>
                  <span className="badge badge-low" style={{ fontSize: 10 }}>
                    {aiSummaryData.fund_issues?.overall_utilization || 0}% Utilized
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', background: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: 4, margin: 0 }}>
                    {aiSummaryData.fund_issues?.insight}
                  </p>
                  {aiSummaryData.fund_issues?.under_utilized_districts?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Under-utilized Districts (&lt;40% spent):</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {aiSummaryData.fund_issues.under_utilized_districts.map(dist => (
                          <span key={dist} className="badge badge-high" style={{ fontSize: 10, padding: '4px 10px' }}>{dist}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Interventions */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '2px solid var(--gray-100)', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--gray-900)', letterSpacing: '0.06em', margin: 0 }}>
                    Recommendations
                  </h3>
                  <span className="badge badge-low" style={{ fontSize: 10 }}>Actionable</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, maxHeight: 300, overflowY: 'auto' }}>
                  {(aiSummaryData.recommendations || []).map((rec, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, padding: 12, border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                      <span style={{ fontSize: 14, color: 'var(--blue-600)', fontWeight: 800 }}>0{idx + 1}</span>
                      <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--gray-800)', lineHeight: 1.4 }}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════
     FUND MANAGEMENT SUB-PAGE VIEW
     ══════════════════════════════════════════════════ */
  if (view === 'fund_management') {
    const fund_management = computedFundManagement;
    return (
      <div className="fade-in">
        {renderTabs()}

        {/* Header */}
        <div className="dept-form-header">
          <div>
            <h2 style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-400)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
              Government of NCT of Delhi • Public Works Department (PWD)
            </h2>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-700)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              Fund Management
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn" onClick={() => fetchData(false, selectedMonth, selectedYear)} style={{ height: 38 }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Fund KPI Cards */}
        <div className="stats-grid dept-kpi-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card" style={{ padding: 20 }}>
            <div>
              <p className="label">Allocated Budget</p>
              <p className="value" style={{ fontSize: 22 }}>{fmtCurrency(fund_management.allocated)}</p>
            </div>
          </div>
          <div className="stat-card" style={{ padding: 20 }}>
            <div>
              <p className="label">Released Budget</p>
              <p className="value" style={{ fontSize: 22 }}>{fmtCurrency(fund_management.released)}</p>
            </div>
          </div>
          <div className="stat-card" style={{ padding: 20 }}>
            <div>
              <p className="label">Utilized Budget</p>
              <p className="value" style={{ fontSize: 22, color: 'var(--green-500)' }}>{fmtCurrency(fund_management.utilized)}</p>
            </div>
          </div>
          <div className="stat-card" style={{ padding: 20 }}>
            <div>
              <p className="label">Remaining Budget</p>
              <p className="value" style={{ fontSize: 22, color: 'var(--amber-500)' }}>{fmtCurrency(fund_management.remaining)}</p>
            </div>
          </div>
        </div>

        {/* Chief Secretary District Summary */}
        {districtSummary && districtSummary.district_data && (
          <div className="card">
            <h4 style={{ margin: '0 0 16px 0', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-900)', letterSpacing: '0.05em' }}>
              District-wise Project & Fund Utilization (Chief Secretary Overview)
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>District ID</th>
                    <th>District Name</th>
                    <th>Funds Allocated</th>
                    <th>Funds Released</th>
                    <th>Funds Spent</th>
                    <th>Total Projects</th>
                    <th>Completed</th>
                    <th>Delayed</th>
                  </tr>
                </thead>
                <tbody>
                  {districtSummary.district_data.map((dist) => (
                    <tr key={dist.district_id}>
                      <td style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{dist.district_id}</td>
                      <td style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{dist.district_name}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtCurrency(dist.funds_allocated)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtCurrency(dist.funds_released)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--green-600)' }}>{fmtCurrency(dist.funds_spent)}</td>
                      <td style={{ fontWeight: 700 }}>{dist.total_projects}</td>
                      <td style={{ fontWeight: 700, color: 'var(--green-600)' }}>{dist.projects_completed}</td>
                      <td style={{ fontWeight: 700, color: dist.projects_delayed > 0 ? 'var(--red-500)' : 'inherit' }}>{dist.projects_delayed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════
     ANALYTICS SUB-PAGE VIEW
     ══════════════════════════════════════════════════ */
  if (view === 'analytics') {
    return (
      <div className="fade-in">
        {renderTabs()}

        {/* Header */}
        <div className="dept-form-header">
          <div>
            <h2 style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-400)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
              Government of NCT of Delhi • Public Works Department (PWD)
            </h2>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-700)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              PWD Department Analytics
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{
              fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
              background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', outline: 'none', height: 38
            }}>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input type="number" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value, 10) || 2026)} style={{
              fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
              background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
              outline: 'none', height: 38, width: 80
            }} />
          </div>
        </div>

        {analyticsLoading || !analyticsData ? (
          <div className="loading-state"><div className="spinner" />Loading chart visuals and aggregating datasets...</div>
        ) : (
          <div className="dept-form-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Section 1: PWD Facilities & Active Work Sites */}
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--gray-900)', letterSpacing: '0.06em', marginBottom: 16, borderBottom: '2px solid var(--gray-100)', paddingBottom: 10 }}>
                Facilities & Work Sites
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                {(analyticsData.facilities || []).map((f) => (
                  <div key={f.category} style={{ padding: 16, border: '1.5px solid var(--gray-200)', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {f.category}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-600)' }}>{f.count}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)' }}>{f.metric}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 2: Staff Availability & Material Stock */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
              
              {/* Staff Availability */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--gray-900)', letterSpacing: '0.06em', marginBottom: 16, borderBottom: '2px solid var(--gray-100)', paddingBottom: 10 }}>
                  Officer & Contractor Availability
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Overall Staff Attendance</span>
                      <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green-500)' }}>{analyticsData.staff_availability?.overall_rate}%</div>
                    </div>
                    <span className="badge badge-low" style={{ fontSize: 10 }}>Operational</span>
                  </div>

                  {/* Engineers Progress */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)' }}>
                      <span>Engineers on Duty</span>
                      <span>{analyticsData.staff_availability?.engineers_on_duty} / {analyticsData.staff_availability?.engineers_total}</span>
                    </div>
                    <div className="progress-bar" style={{ height: 6, margin: 0 }}>
                      <div className="fill" style={{ 
                        width: `${(analyticsData.staff_availability?.engineers_on_duty / analyticsData.staff_availability?.engineers_total) * 100}%`,
                        backgroundColor: 'var(--blue-600)'
                      }} />
                    </div>
                  </div>

                  {/* Inspectors Progress */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)' }}>
                      <span>Field Inspectors on Duty</span>
                      <span>{analyticsData.staff_availability?.inspectors_on_duty} / {analyticsData.staff_availability?.inspectors_total}</span>
                    </div>
                    <div className="progress-bar" style={{ height: 6, margin: 0 }}>
                      <div className="fill" style={{ 
                        width: `${(analyticsData.staff_availability?.inspectors_on_duty / analyticsData.staff_availability?.inspectors_total) * 100}%`,
                        backgroundColor: 'var(--blue-600)'
                      }} />
                    </div>
                  </div>

                  {/* Contractors Progress */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)' }}>
                      <span>Active Contractors</span>
                      <span>{analyticsData.staff_availability?.contractors_active} / {analyticsData.staff_availability?.contractors_total}</span>
                    </div>
                    <div className="progress-bar" style={{ height: 6, margin: 0 }}>
                      <div className="fill" style={{ 
                        width: `${(analyticsData.staff_availability?.contractors_active / analyticsData.staff_availability?.contractors_total) * 100}%`,
                        backgroundColor: 'var(--blue-600)'
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Material Stock */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--gray-900)', letterSpacing: '0.06em', marginBottom: 16, borderBottom: '2px solid var(--gray-100)', paddingBottom: 10 }}>
                  Material Stock Levels
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center' }}>
                  {(analyticsData.material_stock || []).map((m) => {
                    const badgeClass = m.status === 'Good' ? 'badge-low' : m.status === 'Moderate' ? 'badge-med' : 'badge-high';
                    const fillBg = m.status === 'Good' ? 'var(--green-500)' : m.status === 'Moderate' ? 'var(--amber-500)' : 'var(--red-500)';
                    return (
                      <div key={m.item} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 750, color: 'var(--gray-800)' }}>{m.item}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)' }}>{m.stock}% ({m.unit})</span>
                            <span className={`badge ${badgeClass}`} style={{ fontSize: 9, padding: '2px 6px' }}>{m.status}</span>
                          </div>
                        </div>
                        <div className="progress-bar" style={{ height: 5, margin: 0 }}>
                          <div className="fill" style={{ width: `${m.stock}%`, backgroundColor: fillBg }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Row 3: Machinery & Fleet Availability */}
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--gray-900)', letterSpacing: '0.06em', marginBottom: 16, borderBottom: '2px solid var(--gray-100)', paddingBottom: 10 }}>
                Machinery & Fleet Status
              </h3>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.machinery_availability} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                    <XAxis dataKey="type" tick={{ fontSize: 10, fontWeight: 700 }} stroke="var(--gray-400)" />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="var(--gray-400)" allowDecimals={false} />
                    <Tooltip contentStyle={ChartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                    <Bar dataKey="operational" stackId="a" fill="var(--blue-600)" name="Operational" />
                    <Bar dataKey="maintenance" stackId="a" fill="var(--red-500)" name="Under Maintenance" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════
     MAIN DASHBOARD VIEW
     ══════════════════════════════════════════════════ */
  const fund_management = computedFundManagement;
  const admin_backlog = computedAdminBacklog;
  const district_scores = computedDistrictScores;

  return (
    <div className="fade-in">
      {/* ── Sub-Page Navigation Tabs ── */}
      {renderTabs()}

      {/* ── Preview Mode Banner ── */}
      {view === 'preview_dashboard' && (
        <div className="dept-preview-banner">
          <span>[PREVIEW MODE: Viewing Draft Data]</span>
          <div className="dept-preview-banner-actions">
            <button className="btn" onClick={() => setView('data_entry')}>
              <ArrowLeft size={13} /> Back to Project Management
            </button>
            <button className="btn btn-primary" onClick={handlePublish}>
              <CheckCircle size={13} /> Submit & Publish Live
            </button>
          </div>
        </div>
      )}

      {/* ── Dashboard Header ── */}
      <header style={{ marginBottom: 28, borderLeft: '6px solid var(--blue-700)', paddingLeft: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-400)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
            Government of NCT of Delhi • Public Works Department (PWD)
          </h2>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue-700)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            Department Dashboard {view === 'preview_dashboard' && '(Preview)'}
          </h1>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-400)', marginTop: 6 }}>
            Last Updated: {fmtDate(data.last_updated)} • {new Date(data.last_updated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {view !== 'preview_dashboard' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select value={selectedMonth} onChange={e => {
              setSelectedMonth(e.target.value);
            }} style={{
              fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
              background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', outline: 'none', height: 38
            }}>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input type="number" value={selectedYear} onChange={e => {
              setSelectedYear(parseInt(e.target.value, 10) || 2026);
            }} style={{
              fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--gray-700)',
              background: 'var(--white)', border: '1.5px solid var(--gray-200)', padding: '8px 12px',
              outline: 'none', height: 38, width: 80
            }} />
          </div>
        )}
      </header>

      {/* ── Executive Alerts ── */}
      {alerts.length > 0 && (
        <div className="dept-alerts-bar">
          {alerts.map((a, i) => (
            <div key={i} className={`dept-alert-item alert-${a.type}`}>
              {a.type === 'red' && <AlertCircle size={14} />}
              {a.type === 'amber' && <AlertTriangle size={14} />}
              {a.type === 'green' && <CheckCircle size={14} />}
              {a.text}
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Stats Grid ── */}
      <div className="stats-grid dept-kpi-grid">
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, cursor: 'pointer' }} onClick={() => { setQuickFilter(null); setStatusFilter('All'); document.getElementById('project-management-section')?.scrollIntoView({ behavior: 'smooth' }); }}>
          <div className="stat-icon" style={{ background: 'var(--blue-50)', color: 'var(--blue-500)' }}><Briefcase size={20} /></div>
          <div><p className="label">Active Projects</p><p className="value">{computedKpi?.active_projects ?? '—'}</p></div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, cursor: 'pointer' }} onClick={() => setQuickFilter('delayed')}>
          <div className="stat-icon" style={{ background: 'var(--red-50)', color: 'var(--red-500)' }}><AlertTriangle size={20} /></div>
          <div><p className="label">Delayed Projects</p><p className="value" style={{ color: 'var(--red-500)' }}>{computedKpi?.delayed_projects ?? '—'}</p></div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
          <div className="stat-icon" style={{ background: 'var(--amber-50)', color: 'var(--amber-500)' }}><ClipboardList size={20} /></div>
          <div><p className="label">Open Tasks</p><p className="value">{computedKpi?.open_tasks ?? '—'}</p></div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
          <div className="stat-icon" style={{ background: 'var(--green-50)', color: 'var(--green-500)' }}><TrendingUp size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="label">Fund Util.</p>
            <p className="value" style={{ color: 'var(--green-500)' }}>{computedKpi?.fund_utilization_pct ?? '—'}%</p>
            <div className="progress-bar" style={{ marginTop: 4, height: 4 }}>
              <div className="fill" style={{ width: `${computedKpi?.fund_utilization_pct || 0}%`, background: 'var(--green-500)' }} />
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, cursor: 'pointer' }} onClick={() => setView('admin_backlog')}>
          <div className="stat-icon" style={{ background: 'var(--purple-50)', color: 'var(--purple-500)' }}><FileStack size={20} /></div>
          <div><p className="label">Admin Backlog</p><p className="value">{computedKpi?.admin_backlog ?? '—'}</p></div>
        </div>

        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
          <div className="stat-icon" style={{ background: 'var(--blue-50)', color: 'var(--blue-600)' }}><Award size={20} /></div>
          <div>
            <p className="label">Dept. Score</p>
            <p className="value">{computedKpi?.department_score ?? '—'}<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-400)', marginLeft: 2 }}>/{computedKpi?.department_score_max}</span></p>
          </div>
        </div>
      </div>

      {/* ── District Performance Panel ── */}
      {districtInsights && (
        <div className="dept-perf-grid">
          <div className="dept-perf-card">
            <div className="perf-icon">🏆</div>
            <div>
              <div className="perf-label">Best Performing District</div>
              <div className="perf-district">{districtInsights.best.district}</div>
              <div className="perf-value">Score: {districtInsights.best.score}/100</div>
            </div>
          </div>
          <div className="dept-perf-card">
            <div className="perf-icon">⚠️</div>
            <div>
              <div className="perf-label">Needs Attention</div>
              <div className="perf-district">{districtInsights.worst.district}</div>
              <div className="perf-value">Score: {districtInsights.worst.score}/100</div>
            </div>
          </div>
          <div className="dept-perf-card">
            <div className="perf-icon">💰</div>
            <div>
              <div className="perf-label">Highest Budget Utilization</div>
              <div className="perf-district">{districtInsights.bestBudget?.district || '—'}</div>
              <div className="perf-value">{districtInsights.bestBudget?.pct || 0}%</div>
            </div>
          </div>
          <div className="dept-perf-card">
            <div className="perf-icon">📈</div>
            <div>
              <div className="perf-label">Most Improved District</div>
              <div className="perf-district">{districtInsights.mostImproved.district}</div>
              <div className="perf-value">+{districtInsights.mostImproved.trend}% this month</div>
            </div>
          </div>
        </div>
      )}



      {/* ── AI Department Summary ── */}
      <div className="dept-ai-container">
        <div className="dept-ai-header">
          <div className="dept-ai-title-wrap">
            <span className="dept-ai-title-label">Live Governance Intelligence</span>
            <h3 className="dept-ai-main-title">AI Department Summary</h3>
          </div>
          <div className="dept-ai-status-badge">
            <span className="dept-ai-status-dot"></span>
            <span>Ollama AI Connected • DeepSeek-R1</span>
          </div>
        </div>

        {aiLoading || !aiSummaryData ? (
          <div>
            {/* Top Row Skeleton (3 Columns) */}
            <div className="dept-ai-top-row">
              {[1, 2, 3].map(n => (
                <div key={n} className="dept-ai-card skeleton-card">
                  <div className="dept-ai-shimmer-wrapper">
                    <div className="dept-ai-shimmer-title" />
                    <div className="dept-ai-shimmer-text" />
                    <div className="dept-ai-shimmer-text medium" />
                  </div>
                </div>
              ))}
            </div>
            {/* Bottom Row Skeleton (Wide Card with 3 Columns) */}
            <div className="dept-ai-card recs dept-ai-bottom-row skeleton-card">
              <div className="dept-ai-shimmer-title" style={{ marginBottom: 20 }} />
              <div className="dept-ai-recs-grid">
                {[1, 2, 3].map(n => (
                  <div key={n} className="dept-ai-rec-card-item">
                    <div className="dept-ai-shimmer-title" style={{ width: 60 }} />
                    <div className="dept-ai-shimmer-text" />
                    <div className="dept-ai-shimmer-text medium" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Top Row: The 3 Analysis Cards */}
            <div className="dept-ai-top-row">
              {/* Delayed Projects */}
              <div className="dept-ai-card delayed">
                <div className="dept-ai-card-header">
                  <span className="dept-ai-card-icon" style={{ marginRight: 6 }}><AlertTriangle size={15} /></span>
                  <span className="dept-ai-card-title">Delayed Projects</span>
                </div>
                <div className="dept-ai-meta-badges">
                  <span className="dept-ai-meta-badge">{aiSummaryData.project_overview?.critical || 0} Critical</span>
                  <span className="dept-ai-meta-badge">{aiSummaryData.project_overview?.delayed || 0} Delayed</span>
                  <span className="dept-ai-meta-badge">{aiSummaryData.project_overview?.total || 0} Total</span>
                </div>
                <p className="dept-ai-card-text">
                  {aiSummaryData.delayed_projects?.insight}
                </p>
              </div>

              {/* Complaint Trends */}
              <div className="dept-ai-card complaints">
                <div className="dept-ai-card-header">
                  <span className="dept-ai-card-icon" style={{ marginRight: 6 }}><TrendingUp size={15} /></span>
                  <span className="dept-ai-card-title">Complaint Trends</span>
                </div>
                <div className="dept-ai-meta-badges">
                  <span className="dept-ai-meta-badge">{aiSummaryData.complaint_trends?.resolution_rate || 0}% Resolved</span>
                  <span className="dept-ai-meta-badge">{aiSummaryData.complaint_trends?.open || 0} Open</span>
                  <span className="dept-ai-meta-badge">Top: {aiSummaryData.complaint_trends?.top_category || 'None'}</span>
                </div>
                <p className="dept-ai-card-text">
                  {aiSummaryData.complaint_trends?.insight}
                </p>
              </div>

              {/* Fund Issues */}
              <div className="dept-ai-card funds">
                <div className="dept-ai-card-header">
                  <span className="dept-ai-card-icon" style={{ marginRight: 6 }}><Briefcase size={15} /></span>
                  <span className="dept-ai-card-title">Fund Utilization Risks</span>
                </div>
                <div className="dept-ai-meta-badges">
                  <span className="dept-ai-meta-badge">{aiSummaryData.fund_issues?.overall_utilization || 0}% Utilized</span>
                  <span className="dept-ai-meta-badge">{aiSummaryData.fund_issues?.under_utilized_count || 0} Districts Under-Limit</span>
                </div>
                <p className="dept-ai-card-text">
                  {aiSummaryData.fund_issues?.insight}
                </p>
              </div>
            </div>

            {/* Bottom Row: Actionable Directives */}
            <div className="dept-ai-card recs dept-ai-bottom-row">
              <div className="dept-ai-card-header" style={{ marginBottom: 20 }}>
                <span className="dept-ai-card-icon" style={{ marginRight: 6 }}><Zap size={15} /></span>
                <span className="dept-ai-card-title">Actionable Directives</span>
              </div>
              <div className="dept-ai-recs-grid">
                {(aiSummaryData.recommendations || []).map((rec, idx) => (
                  <div key={idx} className="dept-ai-rec-card-item">
                    <div className="dept-ai-rec-num-wrapper">
                      <span className="dept-ai-rec-num">0{idx + 1}</span>
                      <span className="dept-ai-rec-tag">Directive</span>
                    </div>
                    <p className="dept-ai-rec-text">
                      {renderMarkdownText(cleanRecommendation(rec))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>





      {/* ══════════════════════════════════════════════════
         MODAL DIALOG
         ══════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════
         PROJECT DETAILS MODAL
         ══════════════════════════════════════════════════ */}
      {selectedProjectDetails && (
        <div className="dept-modal-overlay" onClick={() => setSelectedProjectDetails(null)}>
          <div className="dept-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 950, width: '95%', margin: '40px auto' }}>
            <div className="dept-modal-header" style={{ background: '#0d1b37', color: '#ffffff' }}>
              <div className="dept-modal-title" style={{ color: '#ffffff' }}>
                Project Details: {selectedProjectDetails.id}
              </div>
              <button className="dept-modal-close" onClick={() => setSelectedProjectDetails(null)} style={{ color: '#ffffff' }}><X size={14} /></button>
            </div>
            
            <div className="dept-modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, padding: 24, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              
              {/* Left Column: Project Information */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, borderBottom: '2px solid var(--gray-200)', paddingBottom: 6, color: '#0d1b37' }}>
                    Project Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Name</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedProjectDetails.name}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>District</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedProjectDetails.district}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Type</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedProjectDetails.type}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                      <span style={{ display: 'block', marginTop: 2 }}>{statusBadge(selectedProjectDetails.status)}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Officer In Charge</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedProjectDetails.officer || 'Not Assigned'}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contractor</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedProjectDetails.contractor || 'Not Appointed'}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Executing Agency</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedProjectDetails.executing_agency || 'Not Specified'}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadline</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{selectedProjectDetails.deadline || 'No Deadline'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '12px 0 12px 0', fontSize: 14, fontWeight: 700, borderBottom: '2px solid var(--gray-200)', paddingBottom: 6, color: '#0d1b37' }}>
                    Financial Overview
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget Allocated</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(selectedProjectDetails.budget_allocated)}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget Released</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(selectedProjectDetails.budget_released)}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget Utilized</span>
                      <span style={{ fontWeight: 700, color: 'var(--blue-600)', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(selectedProjectDetails.budget_utilized)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '12px 0 12px 0', fontSize: 14, fontWeight: 700, borderBottom: '2px solid var(--gray-200)', paddingBottom: 6, color: '#0d1b37' }}>
                    Progress & Remarks
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{selectedProjectDetails.progress}%</span>
                        <div style={{ flex: 1, height: 8, background: 'var(--gray-100)', overflow: 'hidden' }}>
                          <div style={{ width: `${selectedProjectDetails.progress}%`, height: '100%', background: 'var(--green-500)' }} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-400)', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remarks</span>
                      <span style={{ fontStyle: selectedProjectDetails.remarks ? 'normal' : 'italic', color: selectedProjectDetails.remarks ? 'var(--gray-700)' : 'var(--gray-400)', fontWeight: 500 }}>
                        {selectedProjectDetails.remarks || 'No remarks provided.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. Approval Status Panel */}
                <div>
                  <h3 style={{ margin: '12px 0 12px 0', fontSize: 14, fontWeight: 700, borderBottom: '2px solid var(--gray-200)', paddingBottom: 6, color: '#0d1b37' }}>
                    Approval Status
                  </h3>
                  {selectedProjectDetails.approval ? (
                    <div style={{ border: '1px solid var(--gray-200)', padding: 12, background: 'var(--gray-50)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--gray-400)' }}>Status:</span>
                        <span style={{ 
                          fontWeight: 700, 
                          padding: '2px 8px', 
                          fontSize: 11, 
                          color: selectedProjectDetails.approval.status === 'Approved' ? 'var(--green-700)' : selectedProjectDetails.approval.status === 'Rejected' ? 'var(--red-700)' : 'var(--amber-700)',
                          background: selectedProjectDetails.approval.status === 'Approved' ? 'var(--green-50)' : selectedProjectDetails.approval.status === 'Rejected' ? 'var(--red-50)' : 'var(--amber-50)',
                          border: `1px solid ${selectedProjectDetails.approval.status === 'Approved' ? 'var(--green-200)' : selectedProjectDetails.approval.status === 'Rejected' ? 'var(--red-200)' : 'var(--amber-200)'}`
                        }}>
                          {selectedProjectDetails.approval.status}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--gray-400)' }}>Approver:</span>
                        <span style={{ fontWeight: 700, color: 'var(--gray-900)', marginLeft: 6 }}>{selectedProjectDetails.approval.approver || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--gray-400)' }}>Timestamp:</span>
                        <span style={{ fontWeight: 600, color: 'var(--gray-700)', marginLeft: 6 }}>
                          {selectedProjectDetails.approval.timestamp ? new Date(selectedProjectDetails.approval.timestamp).toLocaleString('en-IN') : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--gray-400)' }}>Comments:</span>
                        <div style={{ fontWeight: 500, color: 'var(--gray-800)', marginTop: 2, background: 'var(--white)', padding: '6px 10px', border: '1px solid var(--gray-100)' }}>
                          {selectedProjectDetails.approval.comments || 'No comments.'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 16, border: '1px dashed var(--gray-300)', textAlign: 'center', color: 'var(--gray-400)', fontSize: 12, fontStyle: 'italic' }}>
                      Not yet submitted for approval.
                    </div>
                  )}
                </div>

                {/* 2. Delay Details Panel */}
                {selectedProjectDetails.delay && (
                  <div>
                    <h3 style={{ margin: '12px 0 12px 0', fontSize: 14, fontWeight: 700, borderBottom: '2px solid var(--gray-200)', paddingBottom: 6, color: 'var(--red-600)' }}>
                      Delay Information
                    </h3>
                    <div style={{ border: '1px solid var(--red-100)', padding: 12, background: 'var(--red-50)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--red-700)' }}>Reason:</span>
                        <span style={{ fontWeight: 700, color: 'var(--red-900)', marginLeft: 6 }}>{selectedProjectDetails.delay.reason}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--red-700)' }}>Revised Completion Date:</span>
                        <span style={{ fontWeight: 700, color: 'var(--red-900)', marginLeft: 6 }}>{selectedProjectDetails.delay.revised_deadline}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--red-700)' }}>Remarks:</span>
                        <div style={{ fontWeight: 500, color: 'var(--red-950)', marginTop: 2 }}>
                          {selectedProjectDetails.delay.remarks || 'No remarks.'}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--red-500)', marginTop: 2 }}>
                        Flagged on: {selectedProjectDetails.delay.timestamp ? new Date(selectedProjectDetails.delay.timestamp).toLocaleString('en-IN') : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Uploaded Evidence History */}
                <div>
                  <h3 style={{ margin: '12px 0 12px 0', fontSize: 14, fontWeight: 700, borderBottom: '2px solid var(--gray-200)', paddingBottom: 6, color: '#0d1b37' }}>
                    Uploaded Evidence History
                  </h3>
                  {selectedProjectDetails.evidences && selectedProjectDetails.evidences.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {selectedProjectDetails.evidences.map((ev, index) => (
                        <div key={index} style={{ border: '1px solid var(--gray-200)', padding: 12, background: 'var(--gray-50)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {ev.photo_url ? (
                            <div style={{ width: '100%', height: 160, overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
                              <img src={ev.photo_url} alt={`Evidence ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ) : (
                            <div style={{ width: '100%', height: 80, background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontStyle: 'italic', fontSize: 12 }}>
                              No image uploaded
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                            <div>
                              <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>GPS Coordinates:</span>
                              <div style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{ev.gps || 'N/A'}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Timestamp:</span>
                              <div style={{ fontWeight: 700, color: 'var(--gray-700)' }}>
                                {ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-IN') : 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: 11 }}>
                            <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Evidence Remarks:</span>
                            <div style={{ fontWeight: 500, color: 'var(--gray-700)', marginTop: 2 }}>{ev.remarks || 'None'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: 16, border: '1px dashed var(--gray-300)', textAlign: 'center', color: 'var(--gray-400)', fontSize: 12, fontStyle: 'italic' }}>
                      No evidence has been uploaded for this project yet.
                    </div>
                  )}
                </div>

              </div>
              
              {/* Right Column: Inline Actions Panel */}
              <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, borderBottom: '2px solid var(--gray-200)', paddingBottom: 6, color: '#0d1b37' }}>
                  Project Actions
                </h3>
                
                {/* 1. Update Progress */}
                <div style={{ border: '1px solid var(--gray-200)', padding: 14 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#0d1b37' }}>
                    <ArrowUpRight size={14} /> Update Progress
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="dept-modal-input" type="number" min="0" max="100" placeholder="New %" value={detailsProgress} onChange={e => setDetailsProgress(e.target.value)} style={{ width: 80, height: 32, fontSize: 12, padding: '4px 8px' }} />
                      <input className="dept-modal-input" placeholder="Remarks" value={detailsProgressRemarks} onChange={e => setDetailsProgressRemarks(e.target.value)} style={{ flex: 1, height: 32, fontSize: 12, padding: '4px 8px' }} />
                    </div>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 11, height: 28, width: 'fit-content' }} onClick={() => handleDetailsAction('update_progress')}>
                      Update Progress
                    </button>
                  </div>
                </div>

                {/* 2. Upload Evidence */}
                <div style={{ border: '1px solid var(--gray-200)', padding: 14 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#0d1b37' }}>
                    <Camera size={14} /> Upload Evidence
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button className="btn" style={{ padding: '4px 10px', fontSize: 11, height: 28, border: '1px solid var(--gray-300)' }} onClick={() => document.getElementById('details-photo-file-input').click()}>
                        Choose Photo
                      </button>
                      <input id="details-photo-file-input" type="file" accept="image/*" onChange={handleDetailsPhotoUpload} style={{ display: 'none' }} />
                      {detailsEvidenceUrl && (
                        <span style={{ fontSize: 11, color: 'var(--green-600)', fontWeight: 600 }}>✓ Image Selected</span>
                      )}
                    </div>
                    {detailsEvidenceUrl && (
                      <div style={{ width: 80, height: 50, overflow: 'hidden', border: '1px solid var(--gray-200)', marginTop: 4 }}>
                        <img src={detailsEvidenceUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', background: 'var(--gray-50)', padding: '6px 8px', border: '1px solid var(--gray-200)' }}>
                      <div><strong>GPS:</strong> 28.6139° N, 77.2090° E</div>
                      <div><strong>Time:</strong> {new Date().toLocaleString('en-IN')}</div>
                    </div>
                    <input className="dept-modal-input" placeholder="Remarks" value={detailsEvidenceRemarks} onChange={e => setDetailsEvidenceRemarks(e.target.value)} style={{ height: 32, fontSize: 12, padding: '4px 8px' }} />
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 11, height: 28, width: 'fit-content' }} onClick={() => handleDetailsAction('upload_evidence')}>
                      Upload Evidence
                    </button>
                  </div>
                </div>

                {/* 3. Request Approval */}
                <div style={{ border: '1px solid var(--gray-200)', padding: 14 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#0d1b37' }}>
                    <CheckCircle size={14} /> Request Approval
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select className="dept-modal-input" value={detailsApprovalStatus} onChange={e => setDetailsApprovalStatus(e.target.value)} style={{ height: 32, fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <input className="dept-modal-input" placeholder="Approver Officer Details" value={detailsApprovalApprover} onChange={e => setDetailsApprovalApprover(e.target.value)} style={{ height: 32, fontSize: 12, padding: '4px 8px' }} />
                    <input className="dept-modal-input" placeholder="Justification / Remarks" value={detailsApprovalRemarks} onChange={e => setDetailsApprovalRemarks(e.target.value)} style={{ height: 32, fontSize: 12, padding: '4px 8px' }} />
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 11, height: 28, width: 'fit-content' }} onClick={() => handleDetailsAction('request_approval')}>
                      Submit Request
                    </button>
                  </div>
                </div>

                {/* 4. Flag Delay */}
                <div style={{ border: '1px solid var(--gray-200)', padding: 14 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#0d1b37' }}>
                    <Flag size={14} /> Flag Delay
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select className="dept-modal-input" value={detailsDelayStatus} onChange={e => setDetailsDelayStatus(e.target.value)} style={{ height: 32, fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>
                      <option value="Delayed">Delayed</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <select className="dept-modal-input" value={detailsDelayReason} onChange={e => setDetailsDelayReason(e.target.value)} style={{ height: 32, fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>
                      <option value="Labour Shortage">Labour Shortage</option>
                      <option value="Material Supply Issue">Material Supply Issue</option>
                      <option value="Weather / Natural Cause">Weather / Natural Cause</option>
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="Land Dispute">Land Dispute</option>
                      <option value="Budget Constraint">Budget Constraint</option>
                      <option value="Other">Other</option>
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Expected Revised Completion Date</label>
                      <input className="dept-modal-input" type="date" value={detailsDelayRevisedDeadline} onChange={e => setDetailsDelayRevisedDeadline(e.target.value)} style={{ height: 32, fontSize: 12, padding: '4px 8px' }} />
                    </div>
                    <input className="dept-modal-input" placeholder="Delay remarks" value={detailsDelayRemarks} onChange={e => setDetailsDelayRemarks(e.target.value)} style={{ height: 32, fontSize: 12, padding: '4px 8px' }} />
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 11, height: 28, width: 'fit-content', background: 'var(--red-600)', borderColor: 'var(--red-600)' }} onClick={() => handleDetailsAction('flag_delay')}>
                      Flag Delay
                    </button>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="dept-modal-footer">
              <button className="btn" onClick={() => setSelectedProjectDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="dept-modal-overlay" onClick={() => setModal(null)}>
          <div className="dept-modal" onClick={e => e.stopPropagation()}>
            <div className="dept-modal-header">
              <div className="dept-modal-title">
                {modal.type === 'progress' && 'Update Progress'}
                {modal.type === 'evidence' && 'Upload Evidence'}
                {modal.type === 'approval' && 'Request Approval'}
                {modal.type === 'delay' && 'Flag Delay'}
              </div>
              <button className="dept-modal-close" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <div className="dept-modal-body">
              <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--gray-50)', border: '1px solid var(--gray-100)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{modal.project.name}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{modal.project.id} • {modal.project.district}</div>
              </div>

              {modal.type === 'progress' && (
                <>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">New Progress (%)</label>
                    <input className="dept-modal-input" type="number" min="0" max="100" value={modalProgress} onChange={e => setModalProgress(e.target.value)} placeholder="e.g. 85" />
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Remarks</label>
                    <input className="dept-modal-input" value={modalRemarks} onChange={e => setModalRemarks(e.target.value)} placeholder="Describe work completed..." />
                  </div>
                </>
              )}
              {modal.type === 'evidence' && (
                <>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Photo Evidence</label>
                    <div 
                      style={{ border: '2.5px dashed var(--gray-300)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--gray-500)', cursor: 'pointer', position: 'relative', minHeight: 120, justifyContent: 'center' }}
                      onClick={() => document.getElementById('modal-photo-file-input').click()}
                    >
                      <Upload size={24} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Click to upload image</span>
                      <span style={{ fontSize: 10, fontWeight: 600 }}>JPEG, PNG (max 10MB)</span>
                      <input id="modal-photo-file-input" type="file" accept="image/*" onChange={handleModalPhotoUpload} style={{ display: 'none' }} />
                      {modalEvidenceUrl && (
                        <img src={modalEvidenceUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} alt="Evidence Preview" />
                      )}
                    </div>
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">GPS Location</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-500)', fontSize: 12 }}>
                      <MapPin size={14} /><span style={{ fontWeight: 600 }}>28.6139° N, 77.2090° E (Auto-captured)</span>
                    </div>
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Timestamp</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-500)', fontSize: 12 }}>
                      <Clock size={14} /><span style={{ fontWeight: 600 }}>{new Date().toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Remarks</label>
                    <input className="dept-modal-input" value={modalRemarks} onChange={e => setModalRemarks(e.target.value)} placeholder="Describe the evidence..." />
                  </div>
                </>
              )}
              {modal.type === 'approval' && (
                <>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Approval Status</label>
                    <select className="dept-modal-input" value={modalApprovalStatus} onChange={e => setModalApprovalStatus(e.target.value)} style={{ cursor: 'pointer' }}>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Approver Details</label>
                    <input className="dept-modal-input" value={modalApprovalApprover} onChange={e => setModalApprovalApprover(e.target.value)} placeholder="e.g. Chief Commissioner" />
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Remarks / Justification</label>
                    <input className="dept-modal-input" value={modalRemarks} onChange={e => setModalRemarks(e.target.value)} placeholder="Provide reasoning..." />
                  </div>
                </>
              )}
              {modal.type === 'delay' && (
                <>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Flag Status</label>
                    <select className="dept-modal-input" value={modalDelayStatus} onChange={e => setModalDelayStatus(e.target.value)} style={{ cursor: 'pointer' }}>
                      <option value="Delayed">Delayed</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Reason for Delay</label>
                    <select className="dept-modal-input" value={modalDelayReason} onChange={e => setModalDelayReason(e.target.value)} style={{ cursor: 'pointer' }}>
                      <option value="Labour Shortage">Labour Shortage</option>
                      <option value="Material Supply Issue">Material Supply Issue</option>
                      <option value="Weather / Natural Cause">Weather / Natural Cause</option>
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="Land Dispute">Land Dispute</option>
                      <option value="Budget Constraint">Budget Constraint</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Revised Completion Date</label>
                    <input className="dept-modal-input" type="date" value={modalDelayRevisedDeadline} onChange={e => setModalDelayRevisedDeadline(e.target.value)} />
                  </div>
                  <div className="dept-modal-field">
                    <label className="dept-modal-label">Detailed Remarks</label>
                    <input className="dept-modal-input" value={modalRemarks} onChange={e => setModalRemarks(e.target.value)} placeholder="Describe the cause of delay..." />
                  </div>
                </>
              )}
            </div>
            <div className="dept-modal-footer">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleModalSubmit}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
