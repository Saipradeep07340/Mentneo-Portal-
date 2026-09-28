import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employeeApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/EmployeePortal.css';

export default function MyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'employment' | 'security'
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getProfile();
      setProfile(res.profile);
      setSessions(res.sessions || []);
      setPhone(res.profile.phone || '');
      setAddress(res.profile.address || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePersonal = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await employeeApi.updateProfile({ phone, address });
      setAlert({ type: 'success', text: 'Personal contact details updated successfully.' });
      await loadProfile();
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAlert({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setAlert({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    try {
      setActionLoading(true);
      await employeeApi.changePassword(currentPassword, newPassword);
      setAlert({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
    );
  }

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

      {/* TOP USER CARD */}
      <div className="portal-card" style={{ marginBottom: 24, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div className="portal-user-avatar" style={{ width: 68, height: 68, fontSize: 28 }}>
            {profile?.first_name?.charAt(0) || 'E'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              {profile?.first_name} {profile?.last_name}
            </h2>
            <div style={{ color: 'var(--portal-primary)', fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {profile?.designation} • {profile?.department_name || 'Engineering'}
            </div>
            <div style={{ color: 'var(--portal-text-subtle)', fontSize: 12, marginTop: 4 }}>
              Employee ID: <b>{profile?.employee_code}</b> | Status: <span style={{ color: 'var(--portal-success)' }}>{profile?.employment_status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="portal-tabs-nav">
        <button 
          className={`portal-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          👤 Personal Information
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'employment' ? 'active' : ''}`}
          onClick={() => setActiveTab('employment')}
        >
          🏢 Employment Details (Read-Only)
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          🔐 Security & Active Sessions
        </button>
      </div>

      {/* TAB 1: PERSONAL INFO */}
      {activeTab === 'personal' && (
        <div className="portal-card col-8">
          <div className="portal-card-header">
            <h3>Editable Contact Information</h3>
            <span style={{ fontSize: 12, color: 'var(--portal-text-subtle)' }}>Only contact fields are employee-editable</span>
          </div>

          <form onSubmit={handleUpdatePersonal}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="portal-form-group">
                <label>First Name</label>
                <input type="text" className="portal-input" value={profile?.first_name || ''} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="portal-form-group">
                <label>Last Name</label>
                <input type="text" className="portal-input" value={profile?.last_name || ''} disabled style={{ opacity: 0.7 }} />
              </div>
            </div>

            <div className="portal-form-group">
              <label>Work Email (System Assigned)</label>
              <input type="email" className="portal-input" value={profile?.email || ''} disabled style={{ opacity: 0.7 }} />
            </div>

            <div className="portal-form-group">
              <label>Contact Phone Number *</label>
              <input 
                type="text" 
                className="portal-input"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="portal-form-group">
              <label>Residential Address *</label>
              <textarea 
                className="portal-textarea"
                rows={3}
                placeholder="Complete address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={actionLoading}>
              Save Contact Changes
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: EMPLOYMENT DETAILS */}
      {activeTab === 'employment' && (
        <div className="portal-card col-8">
          <div className="portal-card-header">
            <h3>Official Corporate Records</h3>
            <span className="portal-badge portal-badge-subtle">HR Verified</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)' }}>Employee Code</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--portal-text-main)' }}>{profile?.employee_code}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)' }}>Designation / Title</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--portal-primary)' }}>{profile?.designation}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)' }}>Department</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--portal-text-main)' }}>{profile?.department_name}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)' }}>Reporting Manager</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--portal-text-main)' }}>{profile?.manager_name || 'Executive Leadership'}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)' }}>Date of Joining</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--portal-text-main)' }}>{profile?.joining_date}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)' }}>Primary Work Location</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--portal-text-main)' }}>{profile?.work_location}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & SESSIONS */}
      {activeTab === 'security' && (
        <div className="portal-grid-dashboard">
          <div className="portal-card col-6">
            <div className="portal-card-header">
              <h3>Change Password</h3>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="portal-form-group">
                <label>Current Password *</label>
                <input 
                  type="password" 
                  className="portal-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="portal-form-group">
                <label>New Password (min 8 characters) *</label>
                <input 
                  type="password" 
                  className="portal-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="portal-form-group">
                <label>Confirm New Password *</label>
                <input 
                  type="password" 
                  className="portal-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={actionLoading}>
                Update Password
              </button>
            </form>
          </div>

          <div className="portal-card col-6">
            <div className="portal-card-header">
              <h3>Active Portal Sessions</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map(s => (
                <div key={s.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--portal-card-border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {s.ip_address}
                    </span>
                    {s.is_current ? (
                      <span className="portal-badge portal-badge-success">Current Session</span>
                    ) : (
                      <span className="portal-badge portal-badge-subtle">Active</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.user_agent}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--portal-text-muted)' }}>
                    Last active: {new Date(s.last_active_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
