import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';
import CareersPage from './pages/CareersPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Employee Portal Imports
import { AuthProvider } from './context/AuthContext';
import EmployeeLayout from './layouts/EmployeeLayout';
import EmployeeLogin from './pages/employee/EmployeeLogin';
import EmployeeDashboardHome from './pages/employee/EmployeeDashboardHome';
import AttendancePage from './pages/employee/AttendancePage';
import FaceRecognitionPage from './pages/employee/FaceRecognitionPage';
import MyTasksPage from './pages/employee/MyTasksPage';
import TaskProgressPage from './pages/employee/TaskProgressPage';
import DailyWorkLogPage from './pages/employee/DailyWorkLogPage';
import DailyReportPage from './pages/employee/DailyReportPage';
import LeaveManagementPage from './pages/employee/LeaveManagementPage';
import CalendarPage from './pages/employee/CalendarPage';
import NotificationsPage from './pages/employee/NotificationsPage';
import AnnouncementsPage from './pages/employee/AnnouncementsPage';
import MyProfilePage from './pages/employee/MyProfilePage';
import DocumentsPage from './pages/employee/DocumentsPage';
import PerformancePage from './pages/employee/PerformancePage';
import CompanyDirectoryPage from './pages/employee/CompanyDirectoryPage';
import HelpSupportPage from './pages/employee/HelpSupportPage';

function App() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    setAdminToken(null);
  };

  return (
    <Router>
      <Routes>
        {/* Start with Login Page directly on root */}
        <Route path="/" element={<EmployeeLogin />} />
        <Route path="/login" element={<EmployeeLogin />} />
        <Route path="/employee/login" element={<EmployeeLogin />} />

        {/* Public Careers & Admin Portal Routes */}
        <Route path="/careers" element={<CareersPage />} />
        <Route 
          path="/admin" 
          element={adminToken ? <AdminDashboard token={adminToken} onLogout={handleAdminLogout} /> : <AdminLogin onLoginSuccess={setAdminToken} />} 
        />

        {/* Protected Employee Portal Routes */}
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route index element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboardHome />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="attendance/today" element={<AttendancePage />} />
          <Route path="attendance/history" element={<AttendancePage />} />
          <Route path="face-recognition" element={<FaceRecognitionPage />} />
          <Route path="tasks" element={<MyTasksPage />} />
          <Route path="task-progress" element={<TaskProgressPage />} />
          <Route path="work-log" element={<DailyWorkLogPage />} />
          <Route path="daily-report" element={<DailyReportPage />} />
          <Route path="leave" element={<LeaveManagementPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="profile" element={<MyProfilePage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="directory" element={<CompanyDirectoryPage />} />
          <Route path="support" element={<HelpSupportPage />} />
        </Route>

        {/* Catch-all route -> redirect to root login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
