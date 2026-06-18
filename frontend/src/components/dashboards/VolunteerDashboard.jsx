"use client";
import React, { useState } from 'react';

export default function VolunteerDashboard({ tab }) {
  const content = (() => {
    switch (tab) {
      case 'tasks':      return <DailyTasks />;
      case 'attendance': return <CheckIn />;
      case 'surveys':    return <Surveys />;
      case 'ai-suggestions': return null;
      case 'reports':    return <ReportSubmit />;
      case 'summary':    return <MyImpact />;
      default:           return <DailyTasks />;
    }
  })();

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 80 }}>
      {content}
    </div>
  );
}

function DailyTasks() {
  const [tasks, setTasks] = useState([]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const completedCount = tasks.filter(t => t.done).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <>
      <div className="dash-page-header">
        <div className="dash-page-title">Daily Tasks</div>
        <span className="pill pill-blue">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">{completedCount}/{tasks.length}</div><div className="ds-label">Completed</div></div>
        <div className="dash-stat-dark"><div className="ds-value">{progress}%</div><div className="ds-label">Progress</div></div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Assigned Tasks</h3></div>
        <div className="dash-section-body">
          {tasks.length > 0 ? tasks.map((t) => (
            <div key={t.id} className="task-item" onClick={() => toggleTask(t.id)} style={{ cursor: 'pointer' }}>
              <div className={`task-check ${t.done ? 'task-check-done' : ''}`}>
                {t.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div>
                <div className={`task-title ${t.done ? 'task-title-done' : ''}`}>{t.title}</div>
                <div className="task-sub">{t.sub}</div>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No tasks assigned</div>
          )}
        </div>
      </div>
    </>
  );
}

function CheckIn() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [history] = useState([]);

  return (
    <>
      <div className="dash-page-header"><div className="dash-page-title">Field Check-In</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>GPS-Verified Presence</h3></div>
        <div className="checkin-block">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={checkedIn ? "var(--green-500)" : "var(--blue-500)"} strokeWidth="2" style={{ margin: '0 auto', transition: 'stroke 0.3s' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <div className="ci-location">Location pending</div>
          <div className="ci-time-block">
            <div className="ci-time-label">Current Time</div>
            <div className="ci-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <button 
            className={`btn ${checkedIn ? 'btn-success' : 'btn-primary'}`} 
            style={{ padding: '14px 32px', fontSize: 14, width: '100%', transition: 'all 0.3s' }}
            onClick={() => setCheckedIn(true)}
            disabled={checkedIn}
          >
            {checkedIn ? 'PRESENCE VERIFIED' : 'CONFIRM PRESENCE'}
          </button>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head"><h3>Recent Log</h3></div>
        <div className="dash-section-body" style={{ padding: 0 }}>
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No check-in history</div>
        </div>
      </div>
    </>
  );
}

function Surveys() {
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [step, setStep] = useState(0);

  const surveys = [];

  if (activeSurvey) {
    const q = activeSurvey.questions[step] || 'Survey Complete. Thank you!';
    const isFinished = step >= activeSurvey.questions.length;

    return (
      <>
        <div className="dash-page-header">
          <div className="dash-page-title">{activeSurvey.title}</div>
          <button className="pill pill-blue" onClick={() => setActiveSurvey(null)}>EXIT</button>
        </div>
        <div className="dash-section">
          <div className="dash-section-body">
            {!isFinished ? (
              <>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>Question {step + 1} of {activeSurvey.questions.length}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 24, lineHeight: 1.4 }}>{q}</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'].map(opt => (
                    <button key={opt} className="btn" style={{ justifyContent: 'center', padding: 14 }} onClick={() => setStep(step + 1)}>{opt}</button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--green-500)" strokeWidth="2" style={{ marginBottom: 16 }}><polyline points="20 6 9 17 4 12"/></svg>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Thank You!</div>
                <div style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Your feedback has been recorded safely.</div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setActiveSurvey(null)}>BACK TO SURVEYS</button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="dash-page-header"><div className="dash-page-title">Surveys</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Active Surveys</h3></div>
        <div className="dash-section-body">
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No surveys available</div>
        </div>
      </div>
    </>
  );
}

function ReportSubmit() {
  const [sent, setSent] = useState(false);
  const [category, setCategory] = useState('General');

  if (sent) {
    return (
      <div className="dash-section" style={{ marginTop: 40, textAlign: 'center', padding: '48px 24px' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--blue-500)" strokeWidth="2" style={{ marginBottom: 16 }}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Report Submitted</div>
        <div style={{ color: 'var(--gray-500)', marginBottom: 24 }}>The sector officer has been notified of your report.</div>
        <button className="btn btn-primary" onClick={() => setSent(false)}>SUBMIT ANOTHER</button>
      </div>
    );
  }

  return (
    <>
      <div className="dash-page-header"><div className="dash-page-title">Submit Report</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Field Activity Report</h3></div>
        <div className="dash-section-body">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>Select Category</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['General', 'Water', 'Roads', 'Voter Issue', 'Urgent'].map(c => (
                <button key={c} className={`pill ${category === c ? 'pill-blue' : ''}`} style={{ cursor: 'pointer', border: 'none' }} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          </div>
          <textarea className="broadcast-area" rows={5} placeholder={`Details about ${category} issues...`} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn" style={{ flex: 1, justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              PHOTO
            </button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSent(true)}>SEND REPORT</button>
          </div>
        </div>
      </div>
    </>
  );
}

function MyImpact() {
  return (
    <>
      <div className="dash-page-header"><div className="dash-page-title">My Impact</div></div>
      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Households Today</div></div>
        <div className="dash-stat"><div className="ds-value">0</div><div className="ds-label">Tasks Done</div></div>
        <div className="dash-stat-dark"><div className="ds-value">0</div><div className="ds-label">Points Earned</div></div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Today's Activity Log</h3></div>
        <div className="dash-section-body">
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: 12, fontWeight: 600 }}>No activity recorded</div>
        </div>
      </div>
    </>
  );
}
