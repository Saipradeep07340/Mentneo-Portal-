import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function DailyWorkLogPage() {
  const [searchParams] = useSearchParams();
  const shouldOpenNew = searchParams.get('action') === 'new';

  const [logs, setLogs] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(shouldOpenNew);
  const [editingLogId, setEditingLogId] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterTask, setFilterTask] = useState('');
  const [alert, setAlert] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    taskId: '',
    date: todayStr,
    description: '',
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    hoursSpent: '8.0',
    status: 'COMPLETED',
    challenges: '',
    notes: ''
  });

  useEffect(() => {
    loadWorkLogs();
    loadTasks();
  }, [filterDate, filterTask]);

  const loadWorkLogs = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getWorkLogs(filterDate || null, filterTask || null);
      setLogs(res.logs || []);
      setTotalHours(res.totalHours || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const res = await employeeApi.getTasks();
      setTasks(res.tasks || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      if (editingLogId) {
        await employeeApi.updateWorkLog(editingLogId, formData);
        setAlert({ type: 'success', text: 'Work log updated successfully.' });
      } else {
        await employeeApi.addWorkLog(formData);
        setAlert({ type: 'success', text: 'New daily work log entry recorded.' });
      }
      setShowModal(false);
      setEditingLogId(null);
      setFormData({
        taskId: '',
        date: todayStr,
        description: '',
        startTime: '10:00 AM',
        endTime: '06:00 PM',
        hoursSpent: '8.0',
        status: 'COMPLETED',
        challenges: '',
        notes: ''
      });
      await loadWorkLogs();
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (log) => {
    if (log.date !== todayStr) {
      setAlert({ type: 'error', text: 'Historical work logs cannot be edited as per compliance policy.' });
      return;
    }
    setEditingLogId(log.id);
    setFormData({
      taskId: log.task_id || '',
      date: log.date,
      description: log.description,
      startTime: log.start_time || '10:00 AM',
      endTime: log.end_time || '06:00 PM',
      hoursSpent: String(log.hours_spent),
      status: log.status || 'COMPLETED',
      challenges: log.challenges || '',
      notes: log.notes || ''
    });
    setShowModal(true);
  };

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

      {/* HEADER METRICS & ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div className="portal-metrics-row" style={{ margin: 0, minWidth: 320 }}>
          <div className="portal-metric-box">
            <div className="portal-metric-value" style={{ color: 'var(--portal-primary)' }}>{logs.length}</div>
            <div className="portal-metric-label">Logged Entries</div>
          </div>
          <div className="portal-metric-box">
            <div className="portal-metric-value" style={{ color: 'var(--portal-success)' }}>{totalHours} hrs</div>
            <div className="portal-metric-label">Total Time Recorded</div>
          </div>
        </div>

        <button className="btn-primary" onClick={() => { setEditingLogId(null); setShowModal(true); }}>
          + Add Work Log
        </button>
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input 
          type="date"
          className="portal-input"
          style={{ width: 180 }}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />

        <select 
          className="portal-select"
          style={{ width: 220 }}
          value={filterTask}
          onChange={(e) => setFilterTask(e.target.value)}
        >
          <option value="">All Tasks</option>
          {tasks.map(t => (
            <option key={t.id} value={t.id}>{t.task_code} - {t.title.slice(0, 30)}</option>
          ))}
        </select>

        {(filterDate || filterTask) && (
          <button className="btn-secondary" onClick={() => { setFilterDate(''); setFilterTask(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* LOGS TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
      ) : logs.length === 0 ? (
        <div className="portal-empty-state">
          <div className="portal-empty-icon">📝</div>
          <h4>No work logs recorded.</h4>
          <p>Click "Add Work Log" to record your completed development activities for the day.</p>
        </div>
      ) : (
        <div className="portal-table-container">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Task / Code</th>
                <th>Work Description</th>
                <th>Time Window</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Challenges</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const isToday = log.date === todayStr;
                return (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600, color: 'var(--portal-text-main)' }}>{log.date}</td>
                    <td>
                      {log.task_code ? (
                        <div>
                          <span style={{ color: 'var(--portal-primary)', fontWeight: 600, fontSize: 12 }}>{log.task_code}</span>
                          <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>{log.task_title}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--portal-text-subtle)' }}>General R&D</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontSize: 13, color: 'var(--portal-text-main)', lineHeight: 1.4 }}>
                        {log.description}
                      </div>
                      {log.notes && (
                        <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)', marginTop: 2 }}>
                          Note: {log.notes}
                        </div>
                      )}
                    </td>
                    <td>{log.start_time || '--'} – {log.end_time || '--'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--portal-success)' }}>{log.hours_spent}h</td>
                    <td>
                      <span className={`portal-badge ${log.status === 'COMPLETED' ? 'portal-badge-success' : 'portal-badge-warning'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: log.challenges ? 'var(--portal-warning)' : 'var(--portal-text-subtle)' }}>
                      {log.challenges || 'None'}
                    </td>
                    <td>
                      {isToday ? (
                        <button className="btn-qa" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleEditClick(log)}>
                          ✏️ Edit
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>Locked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h3>{editingLogId ? 'Edit Work Log Entry' : 'Record Daily Work Log'}</h3>
              <button className="portal-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="portal-form-group">
                    <label>Date</label>
                    <input 
                      type="date" 
                      className="portal-input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="portal-form-group">
                    <label>Related Task</label>
                    <select 
                      className="portal-select"
                      value={formData.taskId}
                      onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                    >
                      <option value="">General Work / Research</option>
                      {tasks.map(t => (
                        <option key={t.id} value={t.id}>{t.task_code} - {t.title.slice(0, 30)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="portal-form-group">
                  <label>Work Description</label>
                  <textarea 
                    className="portal-textarea"
                    placeholder="Describe specific engineering tasks completed, models trained, bugfixes implemented..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="portal-form-group">
                    <label>Start Time</label>
                    <input 
                      type="text" 
                      className="portal-input"
                      placeholder="10:00 AM"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div className="portal-form-group">
                    <label>End Time</label>
                    <input 
                      type="text" 
                      className="portal-input"
                      placeholder="06:00 PM"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                  <div className="portal-form-group">
                    <label>Hours Spent</label>
                    <input 
                      type="number" 
                      step="0.5"
                      min="0.5"
                      max="16"
                      className="portal-input"
                      value={formData.hoursSpent}
                      onChange={(e) => setFormData({ ...formData, hoursSpent: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="portal-form-group">
                  <label>Challenges / Blockers Encountered (Optional)</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="e.g. GPU out of memory, awaiting API key access..."
                    value={formData.challenges}
                    onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                  />
                </div>

                <div className="portal-form-group">
                  <label>Additional Notes</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="Links to PRs, commit hashes, or documentation..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {editingLogId ? 'Update Log' : 'Save Work Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
