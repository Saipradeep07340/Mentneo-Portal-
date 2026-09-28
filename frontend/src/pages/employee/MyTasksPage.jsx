import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [workNotes, setWorkNotes] = useState('');
  const [blockerReason, setBlockerReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    loadTasks();
  }, [activeTab, priorityFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getTasks({
        status: activeTab,
        priority: priorityFilter,
        search: searchQuery
      });
      setTasks(res.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (task) => {
    setSelectedTask(task);
    setUpdateStatus(task.status);
    setUpdateProgress(task.progress);
    setWorkNotes('');
    setBlockerReason(task.blocker_note || '');
    try {
      setDetailLoading(true);
      const res = await employeeApi.getTaskDetails(task.id);
      setTaskDetails(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateProgressAndStatus = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      setActionLoading(true);
      const res = await employeeApi.updateTaskProgress(selectedTask.id, {
        progress: updateProgress,
        status: updateStatus,
        workUpdate: workNotes,
        blockerNote: updateStatus === 'BLOCKED' ? blockerReason : null
      });
      setAlertMsg({ type: 'success', text: 'Task progress and status updated.' });
      await handleOpenDetail(res.task);
      await loadTasks();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;
    try {
      setActionLoading(true);
      await employeeApi.addTaskComment(selectedTask.id, newComment);
      setNewComment('');
      // Reload task detail
      const res = await employeeApi.getTaskDetails(selectedTask.id);
      setTaskDetails(res);
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const isOverdue = (task) => {
    return task.status !== 'COMPLETED' && task.due_date < new Date().toISOString().slice(0, 10);
  };

  return (
    <div>
      {alertMsg && (
        <div style={{
          background: alertMsg.type === 'success' ? 'var(--portal-success-bg)' : 'var(--portal-danger-bg)',
          border: `1px solid ${alertMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: alertMsg.type === 'success' ? 'var(--portal-success)' : 'var(--portal-danger)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20
        }}>
          {alertMsg.text}
        </div>
      )}

      {/* FILTER TABS & SEARCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div className="portal-tabs-nav" style={{ margin: 0, border: 'none' }}>
          {['all', 'pending', 'in_progress', 'blocked', 'completed', 'overdue'].map(st => (
            <button
              key={st}
              className={`portal-tab-btn ${activeTab === st ? 'active' : ''}`}
              onClick={() => setActiveTab(st)}
            >
              {st.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select 
            className="portal-select" 
            style={{ width: 140 }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <input 
            type="text"
            className="portal-input"
            style={{ width: 200 }}
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTasks()}
          />
        </div>
      </div>

      {/* TASK LIST CARDS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="portal-spinner" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="portal-empty-state">
          <div className="portal-empty-icon">📋</div>
          <h4>No tasks assigned yet.</h4>
          <p>You have no active deliverables matching this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {tasks.map(task => {
            const overdue = isOverdue(task);
            return (
              <div 
                key={task.id} 
                className="portal-card"
                style={{ cursor: 'pointer', borderLeft: overdue ? '4px solid var(--portal-danger)' : '1px solid var(--portal-card-border)' }}
                onClick={() => handleOpenDetail(task)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)', fontWeight: 600 }}>
                    {task.task_code}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`portal-badge ${
                      task.priority === 'URGENT' ? 'portal-badge-danger' :
                      task.priority === 'HIGH' ? 'portal-badge-warning' : 'portal-badge-primary'
                    }`}>
                      {task.priority}
                    </span>
                    <span className={`portal-badge ${
                      task.status === 'COMPLETED' ? 'portal-badge-success' :
                      task.status === 'BLOCKED' ? 'portal-badge-danger' :
                      task.status === 'IN_PROGRESS' ? 'portal-badge-primary' : 'portal-badge-subtle'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--portal-text-main)' }}>
                  {task.title}
                </h3>

                <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--portal-text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {task.description}
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                    <span style={{ color: 'var(--portal-text-subtle)' }}>Progress</span>
                    <span style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>{task.progress}%</span>
                  </div>
                  <div className="portal-progress-track">
                    <div className="portal-progress-fill" style={{ width: `${task.progress}%` }} />
                  </div>
                </div>

                {/* Footer metadata */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--portal-text-subtle)', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--portal-card-border)' }}>
                  <span>Est: {task.estimated_hours}h</span>
                  <span style={{ color: overdue ? 'var(--portal-danger)' : 'inherit', fontWeight: overdue ? 700 : 'normal' }}>
                    {overdue ? '⚠️ Overdue: ' : 'Due: '}{task.due_date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 740 }}>
            <div className="portal-modal-header">
              <div>
                <span style={{ fontSize: 12, color: 'var(--portal-primary)', fontWeight: 600 }}>{selectedTask.task_code}</span>
                <h3 style={{ margin: '2px 0 0' }}>{selectedTask.title}</h3>
              </div>
              <button className="portal-modal-close" onClick={() => setSelectedTask(null)}>✕</button>
            </div>

            <div className="portal-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Task Meta Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>Priority</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedTask.priority}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>Due Date</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: isOverdue(selectedTask) ? 'var(--portal-danger)' : 'inherit' }}>
                    {selectedTask.due_date}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>Estimated Hours</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedTask.estimated_hours} hrs</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>Current Status</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--portal-primary)' }}>{selectedTask.status}</div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, margin: '0 0 6px', color: 'var(--portal-text-subtle)', textTransform: 'uppercase' }}>
                  Description
                </h4>
                <div style={{ fontSize: 13.5, color: 'var(--portal-text-main)', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
                  {selectedTask.description}
                </div>
              </div>

              {/* Progress & Status Update Form */}
              <form onSubmit={handleUpdateProgressAndStatus} style={{ background: 'rgba(56, 189, 248, 0.04)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--portal-primary)' }}>
                  Update Task Status & Progress
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label>Task Status</label>
                    <select 
                      className="portal-select"
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value)}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="COMPLETED">COMPLETED (Submit for Review)</option>
                    </select>
                  </div>

                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label>Progress: <b>{updateProgress}%</b></label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={updateProgress}
                      onChange={(e) => setUpdateProgress(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: 'var(--portal-primary)', marginTop: 8 }}
                    />
                  </div>
                </div>

                {updateStatus === 'BLOCKED' && (
                  <div className="portal-form-group">
                    <label style={{ color: 'var(--portal-danger)' }}>Blocker Reason / Impediment</label>
                    <input 
                      type="text" 
                      className="portal-input"
                      placeholder="Specify what dependency or resource is blocking progress..."
                      value={blockerReason}
                      onChange={(e) => setBlockerReason(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="portal-form-group">
                  <label>Work Update / Status Note</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="Brief description of work done in this step..."
                    value={workNotes}
                    onChange={(e) => setWorkNotes(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={actionLoading} style={{ fontSize: 13 }}>
                  Save Task Update
                </button>
              </form>

              {/* Activity Timeline */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, margin: '0 0 12px', color: 'var(--portal-text-subtle)', textTransform: 'uppercase' }}>
                  Execution Activity History
                </h4>

                {detailLoading ? (
                  <div className="portal-spinner" />
                ) : !taskDetails?.activities || taskDetails.activities.length === 0 ? (
                  <div style={{ color: 'var(--portal-text-subtle)', fontSize: 12 }}>No activity recorded yet.</div>
                ) : (
                  <div className="portal-timeline">
                    {taskDetails.activities.map(act => (
                      <div key={act.id} className="portal-timeline-item">
                        <div className="portal-timeline-dot" />
                        <div className="portal-timeline-content">
                          <div className="portal-timeline-meta">
                            <span style={{ fontWeight: 600 }}>{act.activity_type}</span>
                            <span>{new Date(act.created_at).toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--portal-text-main)' }}>
                            {act.message}
                          </div>
                          {act.new_progress !== null && (
                            <div style={{ fontSize: 11, color: 'var(--portal-primary)', marginTop: 4 }}>
                              Progress: {act.old_progress}% → {act.new_progress}% | Status: {act.old_status} → {act.new_status}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments Thread */}
              <div>
                <h4 style={{ fontSize: 13, margin: '0 0 12px', color: 'var(--portal-text-subtle)', textTransform: 'uppercase' }}>
                  Discussion & Comments ({taskDetails?.comments?.length || 0})
                </h4>

                {taskDetails?.comments?.map(comm => (
                  <div key={comm.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--portal-card-border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>
                        {comm.first_name} {comm.last_name} ({comm.designation})
                      </span>
                      <span style={{ color: 'var(--portal-text-subtle)', fontSize: 11 }}>
                        {new Date(comm.created_at).toLocaleDateString()} {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--portal-text-main)' }}>
                      {comm.comment}
                    </p>
                  </div>
                ))}

                {/* Add Comment Input */}
                <form onSubmit={handlePostComment} style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="Write a comment or update for the manager..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button type="submit" className="btn-secondary" disabled={actionLoading || !newComment.trim()}>
                    Post
                  </button>
                </form>
              </div>
            </div>

            <div className="portal-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedTask(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
