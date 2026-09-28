import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function LeaveManagementPage() {
  const [searchParams] = useSearchParams();
  const shouldOpenApply = searchParams.get('action') === 'apply';

  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showApplyModal, setShowApplyModal] = useState(shouldOpenApply);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [applyForm, setApplyForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    daysCount: 1,
    reason: '',
    attachmentUrl: ''
  });

  useEffect(() => {
    loadLeaveData();
  }, [activeTab]);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const [balRes, reqRes] = await Promise.all([
        employeeApi.getLeaveBalances(),
        employeeApi.getLeaveRequests(activeTab)
      ]);
      setBalances(balRes.balances || []);
      setRequests(reqRes.requests || []);
      if (balRes.balances?.length > 0 && !applyForm.leaveTypeId) {
        setApplyForm(prev => ({ ...prev, leaveTypeId: balRes.balances[0].leave_type_id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate days count whenever start or end date changes
  const handleDateChange = (field, value) => {
    const updated = { ...applyForm, [field]: value };
    if (updated.startDate && updated.endDate) {
      const s = new Date(updated.startDate);
      const e = new Date(updated.endDate);
      if (e >= s) {
        const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
        updated.daysCount = Math.max(1, diffDays);
      }
    }
    setApplyForm(updated);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await employeeApi.applyLeave(applyForm);
      setAlert({ type: 'success', text: 'Leave application submitted successfully. Pending manager review.' });
      setShowApplyModal(false);
      setApplyForm({
        leaveTypeId: balances[0]?.leave_type_id || '',
        startDate: '',
        endDate: '',
        daysCount: 1,
        reason: '',
        attachmentUrl: ''
      });
      await loadLeaveData();
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelLeave = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      setActionLoading(true);
      await employeeApi.cancelLeave(id);
      setAlert({ type: 'success', text: 'Leave request cancelled successfully.' });
      await loadLeaveData();
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
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

      {/* BALANCE CARDS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        {balances.map(b => (
          <div key={b.id} className="portal-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--portal-text-main)' }}>
                {b.leave_type_name}
              </span>
              <span className="portal-badge portal-badge-primary">{b.leave_type_code}</span>
            </div>

            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--portal-success)', marginBottom: 4 }}>
              {b.available_days}
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--portal-text-subtle)', marginLeft: 4 }}>days left</span>
            </div>

            <div className="portal-progress-track">
              <div 
                className="portal-progress-fill"
                style={{ width: `${Math.min(100, Math.round(((b.used_days + b.pending_days) / b.total_entitlement) * 100))}%` }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--portal-text-subtle)', marginTop: 6 }}>
              <span>Entitlement: <b>{b.total_entitlement}</b></span>
              <span>Used: <b>{b.used_days}</b></span>
              <span>Pending: <b>{b.pending_days}</b></span>
            </div>
          </div>
        ))}
      </div>

      {/* HEADER ACTIONS & FILTER TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="portal-tabs-nav" style={{ margin: 0, border: 'none' }}>
          {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(st => (
            <button
              key={st}
              className={`portal-tab-btn ${activeTab === st ? 'active' : ''}`}
              onClick={() => setActiveTab(st)}
            >
              {st.toUpperCase()}
            </button>
          ))}
        </div>

        <button className="btn-primary" onClick={() => setShowApplyModal(true)}>
          🏖️ Apply for Leave
        </button>
      </div>

      {/* LEAVE REQUESTS TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
      ) : requests.length === 0 ? (
        <div className="portal-empty-state">
          <div className="portal-empty-icon">🏖️</div>
          <h4>No leave requests found.</h4>
          <p>You have not applied for any time off under this status filter.</p>
        </div>
      ) : (
        <div className="portal-table-container">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Manager Notes</th>
                <th>Applied On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const canCancel = req.status === 'PENDING' || (req.status === 'APPROVED' && req.start_date > new Date().toISOString().slice(0, 10));
                return (
                  <tr key={req.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--portal-text-main)' }}>{req.leave_type_name}</span>
                      <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>{req.leave_type_code}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--portal-text-main)' }}>
                      {req.start_date} → {req.end_date}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>
                      {req.days_count} {req.days_count === 1 ? 'day' : 'days'}
                    </td>
                    <td style={{ maxWidth: 220, fontSize: 12.5 }}>
                      {req.reason}
                    </td>
                    <td>
                      <span className={`portal-badge ${
                        req.status === 'APPROVED' ? 'portal-badge-success' :
                        req.status === 'PENDING' ? 'portal-badge-warning' :
                        req.status === 'REJECTED' ? 'portal-badge-danger' : 'portal-badge-subtle'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--portal-text-subtle)' }}>
                      {req.review_notes || '--'}
                    </td>
                    <td style={{ fontSize: 11.5 }}>
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {canCancel && (
                        <button 
                          className="btn-qa"
                          style={{ fontSize: 11, padding: '4px 8px', color: 'var(--portal-danger)' }}
                          onClick={() => handleCancelLeave(req.id)}
                          disabled={actionLoading}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* APPLY LEAVE MODAL */}
      {showApplyModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h3>Apply for Leave</h3>
              <button className="portal-modal-close" onClick={() => setShowApplyModal(false)}>✕</button>
            </div>
            <form onSubmit={handleApply}>
              <div className="portal-modal-body">
                <div className="portal-form-group">
                  <label>Leave Category *</label>
                  <select 
                    className="portal-select"
                    value={applyForm.leaveTypeId}
                    onChange={(e) => setApplyForm({ ...applyForm, leaveTypeId: e.target.value })}
                    required
                  >
                    {balances.map(b => (
                      <option key={b.leave_type_id} value={b.leave_type_id}>
                        {b.leave_type_name} — ({b.available_days} days available)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="portal-form-group">
                    <label>Start Date *</label>
                    <input 
                      type="date"
                      className="portal-input"
                      value={applyForm.startDate}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                      required
                    />
                  </div>

                  <div className="portal-form-group">
                    <label>End Date *</label>
                    <input 
                      type="date"
                      className="portal-input"
                      value={applyForm.endDate}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="portal-form-group">
                  <label>Total Leave Days</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    min="0.5" 
                    className="portal-input"
                    value={applyForm.daysCount}
                    onChange={(e) => setApplyForm({ ...applyForm, daysCount: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Reason for Leave *</label>
                  <textarea 
                    className="portal-textarea"
                    placeholder="Provide justification for time off request..."
                    value={applyForm.reason}
                    onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Optional Attachment / Medical Certificate URL</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="Link or document path if applicable..."
                    value={applyForm.attachmentUrl}
                    onChange={(e) => setApplyForm({ ...applyForm, attachmentUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
