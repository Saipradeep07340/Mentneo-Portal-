import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { employeeApi } from '../../api/employeeApi';

export default function EmployeeNavbar({ onToggleSidebar, pageTitle = 'Dashboard', pageSubtitle = 'Employee Operations & Workday' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadHeaderData();
  }, []);

  const loadHeaderData = async () => {
    try {
      const [dashData, notifData] = await Promise.all([
        employeeApi.getDashboard(),
        employeeApi.getNotifications()
      ]);
      setAttendanceStatus(dashData.attendance?.record);
      setNotifications(notifData.notifications?.slice(0, 5) || []);
      setUnreadCount(notifData.unreadCount || 0);
    } catch (err) {
      console.warn('Header fetch error:', err.message);
    }
  };

  const handleMarkAsRead = async (id, linkUrl) => {
    try {
      await employeeApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (linkUrl) {
        setNotificationsOpen(false);
        navigate(linkUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/employee/login');
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <header className="portal-navbar">
      <div className="portal-navbar-left">
        <button className="portal-mobile-toggle" onClick={onToggleSidebar} title="Toggle Navigation">
          ☰
        </button>
        <div className="portal-page-heading">
          <h1>{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>
      </div>

      <div className="portal-navbar-right">
        {/* Live Clock */}
        <div className="portal-live-clock">
          <span>📅 {formattedDate}</span>
          <span>•</span>
          <span style={{ fontWeight: 600, color: 'var(--portal-text-main)' }}>🕒 {formattedTime}</span>
        </div>

        {/* Current Attendance Status */}
        {attendanceStatus?.check_in && !attendanceStatus?.check_out ? (
          <div className="portal-status-pill present" title={`Checked in at ${attendanceStatus.check_in}`}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--portal-success)' }} />
            <span>In Work ({attendanceStatus.check_in})</span>
          </div>
        ) : attendanceStatus?.check_out ? (
          <div className="portal-status-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--portal-text-muted)' }}>
            <span>Out ({attendanceStatus.check_out})</span>
          </div>
        ) : (
          <div className="portal-status-pill absent">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--portal-danger)' }} />
            <span>Not Checked In</span>
          </div>
        )}

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            className="portal-notif-btn" 
            onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && <span className="portal-notif-badge-dot" />}
          </button>

          {notificationsOpen && (
            <div className="portal-dropdown-menu" style={{ width: 320, padding: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--portal-card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Notifications</span>
                {unreadCount > 0 && <span className="portal-badge portal-badge-danger">{unreadCount} New</span>}
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--portal-text-subtle)', fontSize: 12 }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id, n.link_url)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        background: n.is_read ? 'transparent' : 'rgba(56, 189, 248, 0.05)',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 12.5, fontWeight: n.is_read ? 500 : 700, color: 'var(--portal-text-main)' }}>
                          {n.title}
                        </span>
                        {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--portal-primary)' }} />}
                      </div>
                      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--portal-text-muted)', lineHeight: 1.3 }}>
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--portal-card-border)', textAlign: 'center' }}>
                <Link 
                  to="/employee/notifications" 
                  onClick={() => setNotificationsOpen(false)}
                  style={{ color: 'var(--portal-primary)', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="portal-profile-dropdown">
          <button 
            className="portal-profile-btn" 
            onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
          >
            <div className="portal-user-avatar">
              {user?.fullName?.charAt(0) || 'E'}
            </div>
            <div style={{ textAlign: 'left', display: 'none', md: 'block' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--portal-text-main)' }}>
                {user?.fullName || 'Employee'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>
                {user?.employeeCode || 'EMP'}
              </div>
            </div>
          </button>

          {profileOpen && (
            <div className="portal-dropdown-menu">
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--portal-card-border)' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.fullName}</div>
                <div style={{ fontSize: 11.5, color: 'var(--portal-text-muted)' }}>{user?.email}</div>
                <div style={{ fontSize: 11, color: 'var(--portal-primary)', marginTop: 2 }}>{user?.designation}</div>
              </div>
              <Link to="/employee/profile" className="portal-dropdown-item" onClick={() => setProfileOpen(false)}>
                <span>👤</span> My Profile
              </Link>
              <Link to="/employee/support" className="portal-dropdown-item" onClick={() => setProfileOpen(false)}>
                <span>💬</span> Help & Support
              </Link>
              <div style={{ height: 1, background: 'var(--portal-card-border)', margin: '4px 0' }} />
              <button className="portal-dropdown-item danger" onClick={handleLogout}>
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
