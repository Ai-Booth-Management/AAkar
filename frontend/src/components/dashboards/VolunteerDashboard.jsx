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
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Visit 20 households in Block A', sub: 'Priority: High', done: false },
    { id: 2, title: 'Conduct local meeting at Chowk', sub: 'Time: 05:00 PM', done: true },
    { id: 3, title: 'Verify 5 new voter applications', sub: 'Deadline: Today', done: false },
    { id: 4, title: 'Check water supply status Zone 2', sub: 'Quick Update', done: false },
    { id: 5, title: 'Submit evening field report', sub: 'Time: 07:00 PM', done: false },
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const completedCount = tasks.filter(t => t.done).length;
  const progress = Math.round((completedCount / tasks.length) * 100);

  return (
    <>
      <div className="dash-page-header">
        <div className="dash-page-title">Daily Tasks</div>
        <span className="pill pill-blue">Jun 17, 2026</span>
      </div>
      <div className="dash-stats">
        <div className="dash-stat"><div className="ds-value">{completedCount}/{tasks.length}</div><div className="ds-label">Completed</div></div>
        <div className="dash-stat-dark"><div className="ds-value">{progress}%</div><div className="ds-label">Progress</div></div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Assigned Tasks — Sector 4</h3></div>
        <div className="dash-section-body">
          {tasks.map((t) => (
            <div key={t.id} className="task-item" onClick={() => toggleTask(t.id)} style={{ cursor: 'pointer' }}>
              <div className={`task-check ${t.done ? 'task-check-done' : ''}`}>
                {t.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div>
                <div className={`task-title ${t.done ? 'task-title-done' : ''}`}>{t.title}</div>
                <div className="task-sub">{t.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CheckIn() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [history] = useState([
    { date: 'Jun 16', time: '08:45 AM', loc: 'Sector 3' },
    { date: 'Jun 15', time: '09:10 AM', loc: 'Sector 4' },
    { date: 'Jun 14', time: '08:55 AM', loc: 'Sector 4' },
  ]);

  return (
    <>
      <div className="dash-page-header"><div className="dash-page-title">Field Check-In</div></div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>GPS-Verified Presence</h3></div>
        <div className="checkin-block">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={checkedIn ? "var(--green-500)" : "var(--blue-500)"} strokeWidth="2" style={{ margin: '0 auto', transition: 'stroke 0.3s' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <div className="ci-location">Sector 4, Booth B102</div>
          <div className="ci-sub">Mandal: CENTRAL · Constituency: LC-01</div>
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
          {history.map((h, i) => (
            <div key={i} className="summary-row" style={{ padding: '12px 16px', borderBottom: i < history.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
              <span className="summary-label">{h.date} · {h.loc}</span>
              <span className="summary-value" style={{ color: 'var(--green-500)' }}>{h.time}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Surveys() {
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [step, setStep] = useState(0);

  const surveys = [
    { id: 1, title: 'Voter Feedback Survey', q: 12, mins: 5, questions: ['How satisfied are you with local water supply?', 'Rate the road conditions in your block.', 'Is the street lighting adequate?'] },
    { id: 2, title: 'Irrigation Issue Assessment', q: 8, mins: 3, questions: ['Are you receiving canal water on time?', 'Is the groundwater level sufficient?', 'Condition of minor distributaries?'] },
  ];

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
          {surveys.map(s => (
            <div key={s.id} className="meeting-item">
              <div style={{ flex: 1 }}>
                <div className="meeting-title">{s.title}</div>
                <div className="meeting-meta">{s.q} Questions · ~{s.mins} mins</div>
              </div>
              <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={() => setActiveSurvey(s)}>START</button>
            </div>
          ))}
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
        <div className="dash-stat"><div className="ds-value">42</div><div className="ds-label">Households Today</div></div>
        <div className="dash-stat"><div className="ds-value">8</div><div className="ds-label">Tasks Done</div></div>
        <div className="dash-stat-dark"><div className="ds-value">1,240</div><div className="ds-label">Points Earned</div></div>
      </div>
      <div className="dash-section">
        <div className="dash-section-head"><h3>Today's Activity Log</h3></div>
        <div className="dash-section-body">
          {[
            ['12:40 PM', 'Visited Household H-22, H-23, H-24', true],
            ['11:15 AM', 'Logged Water Issue — Zone 4', false],
            ['10:30 AM', 'Survey submitted — 3 responses', false],
            ['09:00 AM', 'Mandal Check-in Complete', true],
          ].map(([time, action, active]) => (
            <div key={time} className="timeline-item">
              <span className="tl-time">{time}</span>
              <div className={`tl-dot ${active ? 'tl-dot-active' : ''}`} />
              <div className="tl-content">
                <div className="tl-title">{action}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

