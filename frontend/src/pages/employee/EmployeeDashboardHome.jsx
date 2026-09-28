import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function EmployeeDashboardHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await employeeApi.getDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard overview.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckIn = async (method = 'STANDARD') => {
    try {
      setActionLoading(true);
      const res = await employeeApi.checkIn(method);
      setActionMessage({ type: 'success', text: res.message });
      await loadDashboard();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleQuickCheckOut = async () => {
    try {
      setActionLoading(true);
      const res = await employeeApi.checkOut();
      setActionMessage({ type: 'success', text: res.message });
      await loadDashboard();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleStartBreak = async () => {
    try {
      setActionLoading(true);
      const res = await employeeApi.startBreak();
      setActionMessage({ type: 'success', text: res.message });
      await loadDashboard();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleEndBreak = async () => {
    try {
      setActionLoading(true);
      const res = await employeeApi.endBreak();
      setActionMessage({ type: 'success', text: res.message });
      await loadDashboard();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div className="portal-spinner" style={{ width: 36, height: 36, marginBottom: 12 }} />
        <div style={{ color: 'var(--portal-text-muted)', fontSize: 14 }}>Loading Employee Dashboard metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'var(--portal-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <h3 style={{ color: 'var(--portal-danger)', margin: '0 0 8px' }}>Failed to Load Dashboard</h3>
        <p style={{ color: 'var(--portal-text-muted)', margin: '0 0 16px' }}>{error}</p>
        <button className="btn-primary" onClick={loadDashboard}>Try Again</button>
      </div>
    );
  }

  const { attendance, tasks, leave, dailyWork, performance, notifications, announcements, employee } = data;
  const isCheckedIn = !!(attendance?.record?.check_in);
  const isCheckedOut = !!(attendance?.record?.check_out);
  const isOnBreak = !!(attendance?.activeBreak);

  return (
    <div>
      {/* Action Notification Alert */}
      {actionMessage && (
        <div style={{
          background: actionMessage.type === 'success' ? 'var(--portal-success-bg)' : 'var(--portal-danger-bg)',
          border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: actionMessage.type === 'success' ? 'var(--portal-success)' : 'var(--portal-danger)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13.5
        }}>
          <span>{actionMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* QUICK ACTIONS BAR (Section 19) */}
      <section className="portal-quick-actions-bar">
        <div className="portal-qa-status">
          <div className="portal-qa-icon">⚡</div>
          <div className="portal-qa-meta">
            <h3>Quick Actions</h3>
            <p>
              {!isCheckedIn && 'Not clocked in yet today. Ready to begin your workday?'}
              {isCheckedIn && !isCheckedOut && !isOnBreak && `Checked In at ${attendance.record.check_in}. Currently active.`}
              {isCheckedIn && !isCheckedOut && isOnBreak && `On break since ${attendance.activeBreak.start_time}.`}
              {isCheckedOut && `Workday completed. Checked out at ${attendance.record.check_out}.`}
            </p>
          </div>
        </div>

        <div className="portal-qa-buttons">
          {/* Check In Options: Only valid if not checked in */}
          {!isCheckedIn && (
            <>
              <button 
                className="btn-qa btn-qa-primary" 
                onClick={() => handleQuickCheckIn('STANDARD')}
                disabled={actionLoading}
              >
                <span>🕒</span> Check In
              </button>
              <button 
                className="btn-qa"
                style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--portal-primary)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                onClick={() => navigate('/employee/face-recognition')}
              >
                <span>📷</span> Face Check-In
              </button>
            </>
          )}

          {/* Active Work Options: If checked in and not checked out */}
          {isCheckedIn && !isCheckedOut && (
            <>
              {!isOnBreak ? (
                <button 
                  className="btn-qa btn-qa-warning" 
                  onClick={handleStartBreak}
                  disabled={actionLoading}
                >
                  <span>☕</span> Start Break
                </button>
              ) : (
                <button 
                  className="btn-qa btn-qa-success" 
                  onClick={handleEndBreak}
                  disabled={actionLoading}
                >
                  <span>▶️</span> End Break
                </button>
              )}

              <button 
                className="btn-qa btn-qa-danger" 
                onClick={handleQuickCheckOut}
                disabled={actionLoading}
              >
                <span>🛑</span> Check Out
              </button>

              <button 
                className="btn-qa"
                style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--portal-primary)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                onClick={() => navigate('/employee/face-recognition')}
              >
                <span>📷</span> Face Check-Out
              </button>
            </>
          )}

          {/* Static Quick Action Shortcuts */}
          <button className="btn-qa" onClick={() => navigate('/employee/work-log?action=new')}>
            <span>📝</span> Add Work Log
          </button>
          <button className="btn-qa" onClick={() => navigate('/employee/daily-report')}>
            <span>📑</span> Submit Report
          </button>
          <button className="btn-qa" onClick={() => navigate('/employee/leave?action=apply')}>
            <span>🏖️</span> Apply Leave
          </button>
          <button className="btn-qa" onClick={() => navigate('/employee/tasks')}>
            <span>📋</span> View Tasks
          </button>
          <button className="btn-qa" onClick={() => navigate('/employee/support?action=new')}>
            <span>💬</span> Raise Ticket
          </button>
        </div>
      </section>

      {/* DASHBOARD CARDS GRID (Section 2) */}
      <div className="portal-grid-dashboard">
        
        {/* 1. ATTENDANCE CARD */}
        <div className="portal-card col-4">
          <div className="portal-card-header">
            <h3><span>⏱️</span> Today's Attendance</h3>
            <Link to="/employee/attendance/today" className="portal-card-link">View Details →</Link>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--portal-text-muted)' }}>Workday Status</span>
              {attendance.record ? (
                <span className={`portal-badge ${attendance.record.status === 'LATE' ? 'portal-badge-warning' : 'portal-badge-success'}`}>
                  {attendance.record.status}
                </span>
              ) : (
                <span className="portal-badge portal-badge-danger">NOT CHECKED IN</span>
              )}
            </div>

            <div className="portal-metrics-row">
              <div className="portal-metric-box">
                <div className="portal-metric-value" style={{ fontSize: 16, color: 'var(--portal-primary)' }}>
                  {attendance.record?.check_in || '--:--'}
                </div>
                <div className="portal-metric-label">Check In</div>
              </div>
              <div className="portal-metric-box">
                <div className="portal-metric-value" style={{ fontSize: 16 }}>
                  {attendance.record?.check_out || '--:--'}
                </div>
                <div className="portal-metric-label">Check Out</div>
              </div>
              <div className="portal-metric-box">
                <div className="portal-metric-value" style={{ fontSize: 16, color: 'var(--portal-success)' }}>
                  {attendance.record ? `${Math.floor((attendance.record.total_working_minutes || 0) / 60)}h ${(attendance.record.total_working_minutes || 0) % 60}m` : '0h 0m'}
                </div>
                <div className="portal-metric-label">Working Hours</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--portal-text-muted)', paddingTop: 8 }}>
              <span>Break Duration: <b>{attendance.record?.total_break_minutes || 0} mins</b></span>
              <span>Method: <b>{attendance.record?.check_in_method || 'STANDARD'}</b></span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--portal-card-border)' }}>
            <button 
              className="btn-secondary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: 12.5 }}
              onClick={() => navigate('/employee/face-recognition')}
            >
              <span>📷</span> Instant Face Recognition Check-In
            </button>
          </div>
        </div>

        {/* 2. TASK CARD */}
        <div className="portal-card col-4">
          <div className="portal-card-header">
            <h3><span>📋</span> My Tasks</h3>
            <Link to="/employee/tasks" className="portal-card-link">View All ({tasks.stats.total}) →</Link>
          </div>

          <div className="portal-metrics-row">
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-warning)' }}>
                {tasks.stats.pending || 0}
              </div>
              <div className="portal-metric-label">Pending</div>
            </div>
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-primary)' }}>
                {tasks.stats.in_progress || 0}
              </div>
              <div className="portal-metric-label">In Progress</div>
            </div>
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-success)' }}>
                {tasks.stats.completed || 0}
              </div>
              <div className="portal-metric-label">Completed</div>
            </div>
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-danger)' }}>
                {tasks.stats.overdue || 0}
              </div>
              <div className="portal-metric-label">Overdue</div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--portal-text-subtle)', marginBottom: 8, textTransform: 'uppercase' }}>
              Action Items:
            </div>
            {tasks.urgentTasks.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--portal-text-subtle)', fontStyle: 'italic' }}>
                No active tasks assigned yet.
              </div>
            ) : (
              tasks.urgentTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ overflow: 'hidden', paddingRight: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--portal-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>
                      Due: {t.due_date} • {t.progress}% done
                    </div>
                  </div>
                  <span className={`portal-badge ${t.priority === 'URGENT' ? 'portal-badge-danger' : 'portal-badge-warning'}`}>
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. LEAVE CARD */}
        <div className="portal-card col-4">
          <div className="portal-card-header">
            <h3><span>🏖️</span> Leave Management</h3>
            <Link to="/employee/leave" className="portal-card-link">Apply Leave →</Link>
          </div>

          <div className="portal-metrics-row">
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-success)' }}>
                {leave.summary.available}
              </div>
              <div className="portal-metric-label">Available</div>
            </div>
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-text-muted)' }}>
                {leave.summary.used}
              </div>
              <div className="portal-metric-label">Used</div>
            </div>
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-warning)' }}>
                {leave.summary.pending}
              </div>
              <div className="portal-metric-label">Pending</div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--portal-text-subtle)', marginBottom: 8, textTransform: 'uppercase' }}>
              Balance Breakdown:
            </div>
            {leave.breakdown.map(b => (
              <div key={b.leave_type_code} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span>{b.leave_type_name}</span>
                  <span style={{ fontWeight: 600 }}>{b.available_days} / {b.total_entitlement} days left</span>
                </div>
                <div className="portal-progress-track">
                  <div 
                    className="portal-progress-fill"
                    style={{ width: `${Math.min(100, Math.round(((b.used_days + b.pending_days) / b.total_entitlement) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. DAILY WORK CARD */}
        <div className="portal-card col-4">
          <div className="portal-card-header">
            <h3><span>📝</span> Daily Work Status</h3>
            <Link to="/employee/work-log" className="portal-card-link">Manage Logs →</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Today's Work Logs</span>
                <span className="portal-badge portal-badge-primary">{dailyWork.workLogsCount} entries</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--portal-text-muted)' }}>
                Total recorded: <b>{dailyWork.totalHoursToday} hours</b>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Daily Standup Report</span>
                <span className={`portal-badge ${
                  dailyWork.reportStatus === 'SUBMITTED' ? 'portal-badge-success' : 
                  dailyWork.reportStatus === 'DRAFT' ? 'portal-badge-warning' : 'portal-badge-subtle'
                }`}>
                  {dailyWork.reportStatus}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--portal-text-muted)' }}>
                {dailyWork.reportStatus === 'SUBMITTED' ? 'Completed and submitted for today.' : 'Please submit your accomplishments before clocking out.'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <button className="btn-primary" style={{ width: '100%', fontSize: 13 }} onClick={() => navigate('/employee/daily-report')}>
              {dailyWork.reportStatus === 'SUBMITTED' ? 'View Submitted Report' : 'Fill & Submit Daily Report →'}
            </button>
          </div>
        </div>

        {/* 5. PERFORMANCE CARD */}
        <div className="portal-card col-4">
          <div className="portal-card-header">
            <h3><span>🎯</span> Goals & Performance</h3>
            <Link to="/employee/performance" className="portal-card-link">Review OKRs →</Link>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Quarterly Goals Progress</span>
              <span style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>{Math.round(performance.goals.avg_progress)}%</span>
            </div>
            <div className="portal-progress-track">
              <div className="portal-progress-fill" style={{ width: `${performance.goals.avg_progress}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--portal-text-subtle)', marginTop: 4 }}>
              <span>{performance.goals.total_goals} Total Goals</span>
              <span>{performance.goals.completed_goals} Completed</span>
            </div>
          </div>

          {performance.feedback ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{performance.feedback.review_period}</span>
                <span style={{ color: '#facc15', fontSize: 13 }}>⭐ {performance.feedback.overall_rating} / 5.0</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--portal-text-muted)', lineHeight: 1.4, fontStyle: 'italic' }}>
                "{performance.feedback.feedback.slice(0, 120)}..."
              </p>
              <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)', marginTop: 6 }}>
                Reviewer: {performance.feedback.reviewer_name}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--portal-text-subtle)', fontStyle: 'italic' }}>
              No appraisal review records yet.
            </div>
          )}
        </div>

        {/* 6. NOTIFICATIONS CARD */}
        <div className="portal-card col-4">
          <div className="portal-card-header">
            <h3><span>🔔</span> Notifications</h3>
            <Link to="/employee/notifications" className="portal-card-link">View All ({notifications.unreadCount}) →</Link>
          </div>

          <div style={{ display: 'flex', flexDirections: 'column', gap: 8 }}>
            {notifications.latest.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--portal-text-subtle)', fontStyle: 'italic' }}>
                No new notifications.
              </div>
            ) : (
              notifications.latest.map(n => (
                <div key={n.id} style={{ padding: '8px 10px', background: n.is_read ? 'transparent' : 'rgba(56,189,248,0.05)', borderRadius: 6, border: '1px solid var(--portal-card-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: n.is_read ? 500 : 700 }}>
                    <span>{n.title}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--portal-text-subtle)' }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--portal-text-muted)', lineHeight: 1.3 }}>
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 7. ANNOUNCEMENTS CARD */}
        <div className="portal-card col-12">
          <div className="portal-card-header">
            <h3><span>📢</span> Latest Company Announcements</h3>
            <Link to="/employee/announcements" className="portal-card-link">All Announcements →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {announcements.length === 0 ? (
              <div style={{ color: 'var(--portal-text-subtle)', fontSize: 13 }}>No announcements published yet.</div>
            ) : (
              announcements.map(a => (
                <div key={a.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--portal-card-border)', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--portal-text-main)' }}>
                      {a.title}
                    </h4>
                    <span className={`portal-badge ${a.priority === 'IMPORTANT' ? 'portal-badge-warning' : 'portal-badge-subtle'}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--portal-text-muted)', lineHeight: 1.4 }}>
                    {a.content.slice(0, 160)}...
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--portal-text-subtle)' }}>
                    <span>By {a.author_name}</span>
                    <span>{new Date(a.published_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
