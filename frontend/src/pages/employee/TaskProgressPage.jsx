import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function TaskProgressPage() {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [taskDetail, setTaskDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressVal, setProgressVal] = useState(0);
  const [statusVal, setStatusVal] = useState('IN_PROGRESS');
  const [workNotes, setWorkNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getTasks();
      const taskList = res.tasks || [];
      setTasks(taskList);
      if (taskList.length > 0) {
        setSelectedTaskId(taskList[0].id);
        loadTaskDetails(taskList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskDetails = async (id) => {
    try {
      const res = await employeeApi.getTaskDetails(id);
      setTaskDetail(res);
      setProgressVal(res.task.progress);
      setStatusVal(res.task.status);
      setWorkNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskSelect = (id) => {
    setSelectedTaskId(id);
    loadTaskDetails(id);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTaskId) return;

    try {
      setActionLoading(true);
      const res = await employeeApi.updateTaskProgress(selectedTaskId, {
        progress: progressVal,
        status: statusVal,
        workUpdate: workNotes || `Progress set to ${progressVal}%`
      });

      setAlert({ type: 'success', text: `Task progress updated to ${progressVal}%. Activity recorded in audit trail.` });
      await loadTaskDetails(selectedTaskId);
      // Refresh task in list
      setTasks(prev => prev.map(t => t.id === selectedTaskId ? res.task : t));
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const applyMilestone = (percent) => {
    setProgressVal(percent);
    if (percent === 100) setStatusVal('COMPLETED');
    else if (percent > 0 && statusVal === 'PENDING') setStatusVal('IN_PROGRESS');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="portal-spinner" />
      </div>
    );
  }

  const currentTask = taskDetail?.task;

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

      <div className="portal-grid-dashboard">
        {/* TASK SELECTOR SIDE */}
        <div className="portal-card col-4">
          <div className="portal-card-header">
            <h3><span>📋</span> Assigned Tasks</h3>
            <span className="portal-badge portal-badge-primary">{tasks.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map(t => {
              const isSelected = t.id === selectedTaskId;
              return (
                <div
                  key={t.id}
                  onClick={() => handleTaskSelect(t.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? 'var(--portal-primary)' : 'var(--portal-card-border)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)' }}>{t.task_code}</span>
                    <span className={`portal-badge ${t.status === 'COMPLETED' ? 'portal-badge-success' : 'portal-badge-warning'}`}>
                      {t.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--portal-text-main)', marginBottom: 8 }}>
                    {t.title}
                  </div>
                  <div className="portal-progress-track" style={{ height: 5 }}>
                    <div className="portal-progress-fill" style={{ width: `${t.progress}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--portal-text-subtle)', marginTop: 4 }}>
                    <span>Progress: <b>{t.progress}%</b></span>
                    <span>Due: {t.due_date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PROGRESS WORKBENCH & AUDIT TIMELINE */}
        <div className="portal-card col-8">
          {currentTask ? (
            <div>
              <div className="portal-card-header">
                <div>
                  <span style={{ fontSize: 12, color: 'var(--portal-primary)', fontWeight: 600 }}>{currentTask.task_code}</span>
                  <h2 style={{ margin: '2px 0 0', fontSize: 18 }}>{currentTask.title}</h2>
                </div>
                <span className={`portal-badge ${currentTask.priority === 'URGENT' ? 'portal-badge-danger' : 'portal-badge-warning'}`}>
                  {currentTask.priority}
                </span>
              </div>

              {/* Progress Stepper Milestones */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 18, borderRadius: 10, border: '1px solid var(--portal-card-border)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Milestone Progression:</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--portal-primary)' }}>{progressVal}%</span>
                </div>

                {/* Milestone Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { val: 0, label: '0% Not Started' },
                    { val: 25, label: '25% Started' },
                    { val: 50, label: '50% In Progress' },
                    { val: 75, label: '75% Near Completion' },
                    { val: 100, label: '100% Completed' }
                  ].map(m => (
                    <button
                      key={m.val}
                      type="button"
                      className="btn-qa"
                      style={{
                        justifyContent: 'center',
                        fontSize: 11.5,
                        padding: '10px 4px',
                        background: progressVal >= m.val ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        borderColor: progressVal >= m.val ? 'var(--portal-primary)' : 'transparent',
                        color: progressVal >= m.val ? '#fff' : 'var(--portal-text-subtle)'
                      }}
                      onClick={() => applyMilestone(m.val)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Slider */}
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5"
                  value={progressVal}
                  onChange={(e) => setProgressVal(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--portal-primary)' }}
                />
              </div>

              {/* Progress Update Form */}
              <form onSubmit={handleUpdate} style={{ marginBottom: 28 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 12 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label>Lifecycle Status</label>
                    <select 
                      className="portal-select"
                      value={statusVal}
                      onChange={(e) => setStatusVal(e.target.value)}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="COMPLETED">COMPLETED (Submit for Review)</option>
                    </select>
                  </div>

                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label>Work Update / Step Note</label>
                    <input 
                      type="text" 
                      className="portal-input"
                      placeholder="e.g. Completed initial unit test coverage, moving to integration..."
                      value={workNotes}
                      onChange={(e) => setWorkNotes(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Recording Update...' : 'Commit Progress to Audit Timeline'}
                </button>
              </form>

              {/* Immutable Activity Timeline */}
              <div>
                <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--portal-text-subtle)', textTransform: 'uppercase' }}>
                  Execution Timeline & Audit History
                </h4>

                <div className="portal-timeline">
                  {taskDetail.activities?.map(act => (
                    <div key={act.id} className="portal-timeline-item">
                      <div className="portal-timeline-dot" />
                      <div className="portal-timeline-content">
                        <div className="portal-timeline-meta">
                          <span style={{ fontWeight: 600, color: 'var(--portal-primary)' }}>
                            {act.activity_type}
                          </span>
                          <span>{new Date(act.created_at).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--portal-text-main)' }}>
                          {act.message}
                        </div>
                        {act.new_progress !== null && (
                          <div style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)', marginTop: 4 }}>
                            Progress recorded: <b>{act.old_progress}% → {act.new_progress}%</b> | Status: <b>{act.old_status} → {act.new_status}</b>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="portal-empty-state">
              <h4>Select a task to view and update its progress.</h4>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
