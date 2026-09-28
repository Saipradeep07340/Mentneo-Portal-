import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeSidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();

  const isAttendanceActive = location.pathname.startsWith('/employee/attendance');
  const isWorkActive = location.pathname.startsWith('/employee/tasks') || 
                       location.pathname.startsWith('/employee/task-progress') ||
                       location.pathname.startsWith('/employee/work-log') ||
                       location.pathname.startsWith('/employee/daily-report');

  return (
    <>
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 95,
            backdropFilter: 'blur(3px)'
          }}
        />
      )}

      <aside className={`portal-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="portal-sidebar-header">
          <Link to="/employee/dashboard" className="portal-brand" onClick={onClose}>
            <div className="portal-brand-logo">M</div>
            <div className="portal-brand-text">
              <h2>MENTNEO</h2>
              <span>Employee Portal</span>
            </div>
          </Link>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* MAIN */}
          <div className="portal-nav-section">
            <div className="portal-nav-title">OVERVIEW</div>
            <ul className="portal-nav-links">
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/dashboard" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>📊</span>
                    <span>Dashboard</span>
                  </span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* ATTENDANCE */}
          <div className="portal-nav-section">
            <div className="portal-nav-title">ATTENDANCE</div>
            <ul className="portal-nav-links">
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/attendance/today" 
                  className={({ isActive }) => isActive || (isAttendanceActive && !location.pathname.includes('history')) ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>⏱️</span>
                    <span>Today's Attendance</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/attendance/history" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>📅</span>
                    <span>Attendance History</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/face-recognition" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>📷</span>
                    <span>Face Recognition</span>
                  </span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* MY WORK */}
          <div className="portal-nav-section">
            <div className="portal-nav-title">MY WORK</div>
            <ul className="portal-nav-links">
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/tasks" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>📋</span>
                    <span>My Tasks</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/task-progress" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>📈</span>
                    <span>Task Progress</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/work-log" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>📝</span>
                    <span>Daily Work Log</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/daily-report" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>📑</span>
                    <span>Daily Report</span>
                  </span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* LEAVE */}
          <div className="portal-nav-section">
            <div className="portal-nav-title">LEAVE</div>
            <ul className="portal-nav-links">
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/leave" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>🏖️</span>
                    <span>Leave Management</span>
                  </span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* GENERAL & COMPANY */}
          <div className="portal-nav-section">
            <div className="portal-nav-title">ORGANIZATION</div>
            <ul className="portal-nav-links">
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/calendar" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>🗓️</span>
                    <span>Calendar</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/notifications" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>🔔</span>
                    <span>Notifications</span>
                  </span>
                  {user?.unreadNotifications > 0 && (
                    <span className="portal-nav-badge">{user.unreadNotifications}</span>
                  )}
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/announcements" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>📢</span>
                    <span>Announcements</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/profile" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>👤</span>
                    <span>My Profile</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/documents" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>📁</span>
                    <span>Documents</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/performance" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>🎯</span>
                    <span>Performance</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/directory" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>👥</span>
                    <span>Company Directory</span>
                  </span>
                </NavLink>
              </li>
              <li className="portal-nav-item">
                <NavLink 
                  to="/employee/support" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <span className="nav-label-box">
                    <span>💬</span>
                    <span>Help & Support</span>
                  </span>
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* FOOTER USER CARD */}
        <div className="portal-sidebar-footer">
          <Link to="/employee/profile" style={{ textDecoration: 'none' }} onClick={onClose}>
            <div className="portal-user-brief">
              <div className="portal-user-avatar">
                {user?.fullName?.charAt(0) || 'E'}
              </div>
              <div className="portal-user-info">
                <div className="portal-user-name">{user?.fullName || 'Employee'}</div>
                <div className="portal-user-role">{user?.designation || 'Staff'}</div>
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
