import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function AttendancePage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'history' ? 'history' : 'today';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [filterPeriod, setFilterPeriod] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [activeBreak, setActiveBreak] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    requestedCheckIn: '09:00 AM',
    requestedCheckOut: '06:00 PM',
    reason: ''
  });
  const [statusMessage, setStatusMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAttendanceData();
    loadCorrections();
  }, [filterPeriod]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getAttendance(filterPeriod, customStart || null, customEnd || null);
      setHistory(res.history || []);
      setTodayRecord(res.todayRecord || null);
      setActiveBreak(res.activeBreak || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCorrections = async () => {
    try {
      const res = await employeeApi.getCorrections();
      setCorrections(res.corrections || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const res = await employeeApi.checkIn('STANDARD');
      setStatusMessage({ type: 'success', text: res.message });
      await loadAttendanceData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const res = await employeeApi.checkOut();
      setStatusMessage({ type: 'success', text: res.message });
      await loadAttendanceData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      setActionLoading(true);
      const res = await employeeApi.startBreak();
      setStatusMessage({ type: 'success', text: res.message });
      await loadAttendanceData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setActionLoading(true);
      const res = await employeeApi.endBreak();
      setStatusMessage({ type: 'success', text: res.message });
      await loadAttendanceData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await employeeApi.requestCorrection(correctionForm);
      setShowCorrectionModal(false);
      setStatusMessage({ type: 'success', text: 'Attendance correction request submitted for review.' });
      setCorrectionForm({
        date: new Date().toISOString().slice(0, 10),
        requestedCheckIn: '09:00 AM',
        requestedCheckOut: '06:00 PM',
        reason: ''
      });
      await loadCorrections();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Monthly summary calculations
  const totalWorkedMinutes = history.reduce((sum, r) => sum + (r.total_working_minutes || 0), 0);
  const totalLateCount = history.filter(r => r.is_late === 1).length;
  const totalEarlyCount = history.filter(r => r.is_early === 1).length;
  const presentCount = history.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;

  return (
    <div>
      {statusMessage && (
        <div style={{
          background: statusMessage.type === 'success' ? 'var(--portal-success-bg)' : 'var(--portal-danger-bg)',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: statusMessage.type === 'success' ? 'var(--portal-success)' : 'var(--portal-danger)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* TABS */}
      <div className="portal-tabs-nav">
        <button 
          className={`portal-tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          ⏱️ Today's Attendance
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Attendance History
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'corrections' ? 'active' : ''}`}
          onClick={() => setActiveTab('corrections')}
        >
          📝 Correction Requests ({corrections.length})
        </button>
      </div>

      {/* TAB 1: TODAY'S ATTENDANCE */}
      {activeTab === 'today' && (
        <div className="portal-grid-dashboard">
          <div className="portal-card col-6">
            <div className="portal-card-header">
              <h3>Today's Workday Status</h3>
              {todayRecord ? (
                <span className={`portal-badge ${todayRecord.status === 'LATE' ? 'portal-badge-warning' : 'portal-badge-success'}`}>
                  {todayRecord.status}
                </span>
              ) : (
                <span className="portal-badge portal-badge-danger">NOT CHECKED IN</span>
              )}
            </div>

            <div style={{ padding: '10px 0 20px' }}>
              <div style={{ fontSize: 13, color: 'var(--portal-text-muted)', marginBottom: 12 }}>
                Standard Shift: <b>09:00 AM – 06:00 PM (8h work + 1h break)</b>
              </div>

              <div className="portal-metrics-row">
                <div className="portal-metric-box">
                  <div className="portal-metric-value" style={{ color: 'var(--portal-primary)' }}>
                    {todayRecord?.check_in || '--:--'}
                  </div>
                  <div className="portal-metric-label">Check-In Time</div>
                </div>

                <div className="portal-metric-box">
                  <div className="portal-metric-value">
                    {todayRecord?.check_out || '--:--'}
                  </div>
                  <div className="portal-metric-label">Check-Out Time</div>
                </div>

                <div className="portal-metric-box">
                  <div className="portal-metric-value" style={{ color: 'var(--portal-success)' }}>
                    {todayRecord ? `${Math.floor((todayRecord.total_working_minutes || 0) / 60)}h ${(todayRecord.total_working_minutes || 0) % 60}m` : '0h 0m'}
                  </div>
                  <div className="portal-metric-label">Working Hours</div>
                </div>

                <div className="portal-metric-box">
                  <div className="portal-metric-value" style={{ color: 'var(--portal-warning)' }}>
                    {todayRecord?.total_break_minutes || 0}m
                  </div>
                  <div className="portal-metric-label">Break Duration</div>
                </div>
              </div>

              {activeBreak && (
                <div style={{ background: 'var(--portal-warning-bg)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: 12, marginTop: 12, color: 'var(--portal-warning)', fontSize: 13 }}>
                  ☕ Break currently active since {activeBreak.start_time} ({activeBreak.reason}).
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid var(--portal-card-border)', alignItems: 'center' }}>
              {!todayRecord?.check_in && (
                <>
                  <button className="btn-primary" onClick={() => window.location.href = '/employee/face-recognition?mode=CHECK_IN'}>
                    <span>📷</span> Face Check-In
                  </button>
                  <button className="btn-secondary" onClick={handleCheckIn} disabled={actionLoading}>
                    <span>🕒</span> Quick Clock In
                  </button>
                </>
              )}

              {todayRecord?.check_in && !todayRecord?.check_out && (
                <>
                  {!activeBreak ? (
                    <button className="btn-qa btn-qa-warning" onClick={handleStartBreak} disabled={actionLoading}>
                      <span>☕</span> Start Break
                    </button>
                  ) : (
                    <button className="btn-qa btn-qa-success" onClick={handleEndBreak} disabled={actionLoading}>
                      <span>▶️</span> End Break
                    </button>
                  )}

                  <button className="btn-danger" onClick={() => window.location.href = '/employee/face-recognition?mode=CHECK_OUT'}>
                    <span>📷</span> Face Check-Out
                  </button>
                  <button className="btn-secondary" onClick={handleCheckOut} disabled={actionLoading}>
                    <span>🛑</span> Clock Out
                  </button>
                </>
              )}

              {todayRecord?.check_in && todayRecord?.check_out && (
                <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--portal-success)', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  ✓ Attendance Completed for Today
                </div>
              )}

              <button className="btn-secondary" onClick={() => setShowCorrectionModal(true)}>
                <span>✏️</span> Request Regularization
              </button>
            </div>
          </div>

          <div className="portal-card col-6">
            <div className="portal-card-header">
              <h3>Attendance Policy & Rules</h3>
            </div>
            <ul style={{ color: 'var(--portal-text-muted)', fontSize: 13, lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
              <li><b>Standard Check-in:</b> 09:00 AM. Any check-in after 09:30 AM is automatically marked as <code>LATE</code>.</li>
              <li><b>Standard Check-out:</b> 06:00 PM. Check-out prior to 05:30 PM is marked as <code>EARLY EXIT</code>.</li>
              <li><b>Breaks:</b> Standard lunch/tea break allocation is 60 minutes per workday.</li>
              <li><b>Biometric Authentication:</b> You may also clock in seamlessly using the built-in Face Recognition module.</li>
              <li><b>Corrections:</b> Direct manual record editing is forbidden. Please submit a correction request for manager approval.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE HISTORY */}
      {activeTab === 'history' && (
        <div>
          {/* Summary Cards */}
          <div className="portal-metrics-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-success)' }}>{presentCount}</div>
              <div className="portal-metric-label">Days Present</div>
            </div>
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-primary)' }}>
                {Math.floor(totalWorkedMinutes / 60)}h {totalWorkedMinutes % 60}m
              </div>
              <div className="portal-metric-label">Total Hours Worked</div>
            </div>
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-warning)' }}>{totalLateCount}</div>
              <div className="portal-metric-label">Late Arrivals</div>
            </div>
            <div className="portal-metric-box">
              <div className="portal-metric-value" style={{ color: 'var(--portal-danger)' }}>{totalEarlyCount}</div>
              <div className="portal-metric-label">Early Departures</div>
            </div>
          </div>

          {/* Filtering */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['today', 'this_week', 'this_month', 'all'].map(p => (
                <button 
                  key={p} 
                  className={`btn-qa ${filterPeriod === p ? 'btn-qa-primary' : ''}`}
                  onClick={() => setFilterPeriod(p)}
                >
                  {p.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            <button className="btn-secondary" onClick={() => setShowCorrectionModal(true)}>
              <span>✏️</span> Request Attendance Correction
            </button>
          </div>

          {/* Table */}
          <div className="portal-table-container">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Break Duration</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 30, color: 'var(--portal-text-subtle)' }}>
                      No attendance records found for this period.
                    </td>
                  </tr>
                ) : (
                  history.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600, color: 'var(--portal-text-main)' }}>{row.date}</td>
                      <td>{row.check_in || '--'}</td>
                      <td>{row.check_out || '--'}</td>
                      <td>{row.total_break_minutes || 0} mins</td>
                      <td>{Math.floor((row.total_working_minutes || 0) / 60)}h {(row.total_working_minutes || 0) % 60}m</td>
                      <td>
                        <span className={`portal-badge ${
                          row.status === 'PRESENT' ? 'portal-badge-success' :
                          row.status === 'LATE' ? 'portal-badge-warning' :
                          row.status === 'WEEK_OFF' ? 'portal-badge-subtle' :
                          'portal-badge-danger'
                        }`}>
                          {row.status}
                        </span>
                        {row.is_late === 1 && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--portal-warning)' }}>Late</span>}
                        {row.is_early === 1 && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--portal-danger)' }}>Early</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>Method: {row.check_in_method || 'STANDARD'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CORRECTIONS */}
      {activeTab === 'corrections' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Attendance Correction Submissions</h3>
            <button className="btn-primary" onClick={() => setShowCorrectionModal(true)}>
              + Request New Correction
            </button>
          </div>

          <div className="portal-table-container">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Original Times</th>
                  <th>Requested Times</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {corrections.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: 'var(--portal-text-subtle)' }}>
                      No attendance correction requests submitted.
                    </td>
                  </tr>
                ) : (
                  corrections.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: 'var(--portal-text-main)' }}>{c.date}</td>
                      <td>{c.existing_check_in || '--'} – {c.existing_check_out || '--'}</td>
                      <td style={{ color: 'var(--portal-primary)' }}>{c.requested_check_in} – {c.requested_check_out}</td>
                      <td>{c.reason}</td>
                      <td>
                        <span className={`portal-badge ${
                          c.status === 'APPROVED' ? 'portal-badge-success' :
                          c.status === 'REJECTED' ? 'portal-badge-danger' :
                          'portal-badge-warning'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CORRECTION REQUEST MODAL */}
      {showCorrectionModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h3>Request Attendance Correction</h3>
              <button className="portal-modal-close" onClick={() => setShowCorrectionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitCorrection}>
              <div className="portal-modal-body">
                <div className="portal-form-group">
                  <label>Date of Attendance</label>
                  <input 
                    type="date" 
                    className="portal-input"
                    value={correctionForm.date}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="portal-form-group">
                    <label>Requested Check-In</label>
                    <input 
                      type="text" 
                      className="portal-input"
                      placeholder="e.g. 09:05 AM"
                      value={correctionForm.requestedCheckIn}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, requestedCheckIn: e.target.value })}
                      required
                    />
                  </div>

                  <div className="portal-form-group">
                    <label>Requested Check-Out</label>
                    <input 
                      type="text" 
                      className="portal-input"
                      placeholder="e.g. 06:15 PM"
                      value={correctionForm.requestedCheckOut}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, requestedCheckOut: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="portal-form-group">
                  <label>Reason for Correction</label>
                  <textarea 
                    className="portal-textarea"
                    placeholder="Provide detailed justification (e.g. client visit, biometric reader network failure, on-site deployment)..."
                    value={correctionForm.reason}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="portal-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCorrectionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
