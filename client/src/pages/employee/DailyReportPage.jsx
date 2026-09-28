import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function DailyReportPage() {
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'history'
  const [todayReport, setTodayReport] = useState(null);
  const [reportsHistory, setReportsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [form, setForm] = useState({
    accomplishments: '',
    workInProgress: '',
    blockers: '',
    tomorrowPlan: '',
    additionalNotes: ''
  });

  useEffect(() => {
    loadTodayReport();
    loadReportsHistory();
  }, []);

  const loadTodayReport = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getTodayDailyReport();
      if (res.report) {
        setTodayReport(res.report);
        setForm({
          accomplishments: res.report.accomplishments || '',
          workInProgress: res.report.work_in_progress || '',
          blockers: res.report.blockers || '',
          tomorrowPlan: res.report.tomorrow_plan || '',
          additionalNotes: res.report.additional_notes || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReportsHistory = async () => {
    try {
      const res = await employeeApi.getDailyReports();
      setReportsHistory(res.reports || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (isSubmit = false) => {
    if (!form.accomplishments.trim()) {
      setAlert({ type: 'error', text: "Please enter today's accomplishments before saving." });
      return;
    }

    try {
      setActionLoading(true);
      const res = await employeeApi.saveDailyReport({
        ...form,
        isSubmit
      });
      setAlert({ type: 'success', text: res.message });
      await loadTodayReport();
      await loadReportsHistory();
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const isSubmitted = todayReport?.status === 'SUBMITTED' || todayReport?.status === 'REVIEWED';

  return (
    <div>
      {alert && (
        <div style={{
          background: alert.type === 'success' ? 'var(--portal-success-bg)' : 'var(--portal-danger-bg)',
          border: `1px solid ${alert.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: alert.type === 'success' ? 'var(--portal-success)' : 'var(--portal-danger)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20
        }}>
          {alert.text}
        </div>
      )}

      {/* TABS */}
      <div className="portal-tabs-nav">
        <button 
          className={`portal-tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          📑 Today's Standup Report
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Report History ({reportsHistory.length})
        </button>
      </div>

      {activeTab === 'today' && (
        <div className="portal-grid-dashboard">
          <div className="portal-card col-8">
            <div className="portal-card-header">
              <div>
                <h3 style={{ margin: 0 }}>End of Day Report — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--portal-text-subtle)' }}>
                  Submit this daily summary of your progress and blockers for manager visibility.
                </p>
              </div>

              {todayReport ? (
                <span className={`portal-badge ${
                  todayReport.status === 'SUBMITTED' ? 'portal-badge-success' :
                  todayReport.status === 'DRAFT' ? 'portal-badge-warning' : 'portal-badge-primary'
                }`}>
                  {todayReport.status}
                </span>
              ) : (
                <span className="portal-badge portal-badge-subtle">NOT STARTED</span>
              )}
            </div>

            {isSubmitted && (
              <div style={{ background: 'var(--portal-success-bg)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 14, marginBottom: 20, color: 'var(--portal-success)', fontSize: 13 }}>
                ✅ Your daily report for today was submitted at {new Date(todayReport.submitted_at || todayReport.updated_at).toLocaleTimeString()}. Records are locked for review.
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSave(true); }}>
              {/* Accomplishments */}
              <div className="portal-form-group">
                <label>1. Today's Accomplishments (What was completed?) *</label>
                <textarea 
                  className="portal-textarea"
                  placeholder="Summarize key tasks, features coded, issues resolved, experiments finished..."
                  value={form.accomplishments}
                  onChange={(e) => setForm({ ...form, accomplishments: e.target.value })}
                  disabled={isSubmitted}
                  rows={3}
                  required
                />
              </div>

              {/* Work in progress */}
              <div className="portal-form-group">
                <label>2. Work in Progress (What is still actively being worked on?)</label>
                <textarea 
                  className="portal-textarea"
                  placeholder="Ongoing implementation, training jobs running, code reviews pending..."
                  value={form.workInProgress}
                  onChange={(e) => setForm({ ...form, workInProgress: e.target.value })}
                  disabled={isSubmitted}
                  rows={2}
                />
              </div>

              {/* Blockers */}
              <div className="portal-form-group">
                <label>3. Blockers / Problems (What obstacles or dependencies were encountered?)</label>
                <textarea 
                  className="portal-textarea"
                  placeholder="Technical bottlenecks, pending approvals, resource limits (or state 'None')..."
                  value={form.blockers}
                  onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                  disabled={isSubmitted}
                  rows={2}
                />
              </div>

              {/* Tomorrow's plan */}
              <div className="portal-form-group">
                <label>4. Tomorrow's Plan (What will be prioritized next?)</label>
                <textarea 
                  className="portal-textarea"
                  placeholder="Planned agenda, milestones, or meetings for tomorrow..."
                  value={form.tomorrowPlan}
                  onChange={(e) => setForm({ ...form, tomorrowPlan: e.target.value })}
                  disabled={isSubmitted}
                  rows={2}
                />
              </div>

              {/* Additional notes */}
              <div className="portal-form-group">
                <label>5. Additional Notes & Links</label>
                <input 
                  type="text" 
                  className="portal-input"
                  placeholder="PR links, docs, reference tickets..."
                  value={form.additionalNotes}
                  onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                  disabled={isSubmitted}
                />
              </div>

              {!isSubmitted ? (
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => handleSave(false)}
                    disabled={actionLoading}
                  >
                    💾 Save as Draft
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={actionLoading}
                  >
                    🚀 Submit Final Report
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--portal-text-subtle)' }}>
                  Report finalized and submitted to engineering management.
                </div>
              )}
            </form>
          </div>

          <div className="portal-card col-4">
            <div className="portal-card-header">
              <h3>Reporting Guidelines</h3>
            </div>
            <ul style={{ color: 'var(--portal-text-muted)', fontSize: 13, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
              <li><b>Submission Window:</b> Daily reports should ideally be submitted by 06:30 PM before ending your shift.</li>
              <li><b>Review Process:</b> Engineering leads and PMs inspect standup reports daily for blocker resolution.</li>
              <li><b>Draft Saving:</b> You can incrementally save your report throughout the day and click "Submit Final Report" when clocking out.</li>
              <li><b>Impediments:</b> Clearly identify any blocker that requires cross-functional assistance.</li>
            </ul>

            {todayReport?.review_feedback && (
              <div style={{ marginTop: 20, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 8, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--portal-primary)', marginBottom: 4 }}>
                  Manager Review Feedback:
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--portal-text-main)' }}>
                  {todayReport.review_feedback}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h3>Submitted Daily Standup Reports</h3>
          </div>

          {reportsHistory.length === 0 ? (
            <div className="portal-empty-state">
              <div className="portal-empty-icon">📑</div>
              <h4>No historical reports found.</h4>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {reportsHistory.map(rep => (
                <div key={rep.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--portal-card-border)', borderRadius: 8, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--portal-text-main)' }}>
                        {rep.date}
                      </span>
                      {rep.submitted_at && (
                        <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--portal-text-subtle)' }}>
                          Submitted at {new Date(rep.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <span className={`portal-badge ${
                      rep.status === 'SUBMITTED' ? 'portal-badge-success' : 'portal-badge-warning'
                    }`}>
                      {rep.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--portal-primary)', marginBottom: 2 }}>Accomplishments:</div>
                      <p style={{ margin: 0, color: 'var(--portal-text-muted)', lineHeight: 1.4 }}>{rep.accomplishments}</p>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--portal-secondary)', marginBottom: 2 }}>Work In Progress:</div>
                      <p style={{ margin: 0, color: 'var(--portal-text-muted)', lineHeight: 1.4 }}>{rep.work_in_progress || 'None'}</p>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--portal-warning)', marginBottom: 2 }}>Blockers:</div>
                      <p style={{ margin: 0, color: 'var(--portal-text-muted)', lineHeight: 1.4 }}>{rep.blockers || 'None'}</p>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--portal-success)', marginBottom: 2 }}>Tomorrow's Plan:</div>
                      <p style={{ margin: 0, color: 'var(--portal-text-muted)', lineHeight: 1.4 }}>{rep.tomorrow_plan || 'None'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
