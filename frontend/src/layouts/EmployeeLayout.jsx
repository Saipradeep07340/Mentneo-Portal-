import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmployeeSidebar from '../components/employee/EmployeeSidebar';
import EmployeeNavbar from '../components/employee/EmployeeNavbar';
import '../styles/EmployeePortal.css';

// Page title mapper for header
function getPageHeaderInfo(pathname) {
  if (pathname.includes('/dashboard')) return { title: 'Employee Dashboard', subtitle: "Welcome back! Here is your daily workplace overview." };
  if (pathname.includes('/attendance')) return { title: 'Attendance Management', subtitle: 'Clock-in, breaks, working hours, and history logs.' };
  if (pathname.includes('/face-recognition')) return { title: 'Biometric Face Recognition', subtitle: 'Secure face registration and instant contactless attendance.' };
  if (pathname.includes('/task-progress')) return { title: 'Task Progress & Timeline', subtitle: 'Milestone tracking and execution activity log.' };
  if (pathname.includes('/tasks')) return { title: 'My Assigned Tasks', subtitle: 'Action items, deliverables, comments, and milestones.' };
  if (pathname.includes('/work-log')) return { title: 'Daily Work Log', subtitle: 'Log activities, hours spent, and development challenges.' };
  if (pathname.includes('/daily-report')) return { title: 'Daily Standup Report', subtitle: 'End-of-day summary, accomplishments, and blockers.' };
  if (pathname.includes('/leave')) return { title: 'Leave Management', subtitle: 'Leave entitlement, requests, balance, and status tracking.' };
  if (pathname.includes('/calendar')) return { title: 'Employee Calendar', subtitle: 'Company holidays, scheduled leaves, tasks, and meetings.' };
  if (pathname.includes('/notifications')) return { title: 'Notification Center', subtitle: 'System alerts, task assignments, and department updates.' };
  if (pathname.includes('/announcements')) return { title: 'Company Announcements', subtitle: 'Latest news, executive briefs, and policy notices.' };
  if (pathname.includes('/profile')) return { title: 'My Profile & Security', subtitle: 'Personal credentials, active sessions, and HR records.' };
  if (pathname.includes('/documents')) return { title: 'Employee Documents', subtitle: 'Authorized documents, policies, letters, and payslips.' };
  if (pathname.includes('/performance')) return { title: 'Performance & Goals', subtitle: 'Quarterly OKRs, manager reviews, and task metrics.' };
  if (pathname.includes('/directory')) return { title: 'Company Directory', subtitle: 'Connect with colleagues across engineering and operations.' };
  if (pathname.includes('/support')) return { title: 'Help & Support Desk', subtitle: 'Raise IT, HR, and facility requests with ticket tracking.' };
  return { title: 'Employee Portal', subtitle: 'Mentneo Corporate Portal' };
}

export default function EmployeeLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--portal-bg)', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="portal-spinner" style={{ width: 40, height: 40, marginBottom: 16 }} />
          <div style={{ fontSize: 14, color: 'var(--portal-text-muted)' }}>Loading Mentneo Portal...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/employee/login" state={{ from: location }} replace />;
  }

  const { title, subtitle } = getPageHeaderInfo(location.pathname);

  return (
    <div className="portal-container">
      <EmployeeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="portal-main-wrapper">
        <EmployeeNavbar 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          pageTitle={title}
          pageSubtitle={subtitle}
        />

        <main className="portal-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
