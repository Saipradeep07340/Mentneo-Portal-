const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('employeeToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function handleResponse(response) {
  if (response.status === 401) {
    // If not on login page, redirect
    if (!window.location.pathname.includes('/employee/login')) {
      localStorage.removeItem('employeeToken');
      localStorage.removeItem('employeeUser');
      window.location.href = '/employee/login?expired=1';
    }
  }

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (typeof data === 'object') ? (data?.detail || data?.error || JSON.stringify(data)) : `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const employeeApi = {
  // Authentication
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/employee/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  logout: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/employee/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      await handleResponse(res);
    } finally {
      localStorage.removeItem('employeeToken');
      localStorage.removeItem('employeeUser');
    }
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE}/auth/employee/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await fetch(`${API_BASE}/employee/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return handleResponse(res);
  },

  // Dashboard Overview
  getDashboard: async () => {
    const res = await fetch(`${API_BASE}/employee/dashboard`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Attendance
  getAttendance: async (period = 'all', startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    // Fetch today status and history concurrently
    try {
      const todayRes = await fetch(`${API_BASE}/attendance/today`, { headers: getAuthHeaders() });
      const todayData = await handleResponse(todayRes);
      const histRes = await fetch(`${API_BASE}/attendance/history?${params.toString()}`, { headers: getAuthHeaders() });
      const histData = await handleResponse(histRes);
      return {
        todayRecord: todayData.has_attendance ? {
          check_in: todayData.check_in,
          check_out: todayData.check_out,
          status: todayData.status,
          total_working_minutes: todayData.working_minutes,
          total_break_minutes: todayData.break_minutes,
          is_late: todayData.is_late
        } : null,
        activeBreak: todayData.is_on_break ? {
          start_time: todayData.active_break_start ? new Date(todayData.active_break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
          reason: 'Active Break'
        } : null,
        history: (histData.history || []).map(h => ({
          id: h.id,
          date: h.date,
          check_in: h.checkIn,
          check_out: h.checkOut,
          status: h.status,
          total_working_minutes: h.workingMinutes,
          total_break_minutes: h.breakMinutes,
          is_late: h.isLate,
          is_early: h.isEarly,
          method: h.method
        })),
        stats: {
          present: (histData.history || []).filter(x => x.status === 'PRESENT').length,
          late: (histData.history || []).filter(x => x.status === 'LATE').length,
          halfDay: (histData.history || []).filter(x => x.status === 'HALF_DAY').length,
          totalWorkingHours: Math.round((histData.history || []).reduce((acc, x) => acc + (x.workingMinutes || 0), 0) / 60)
        }
      };
    } catch {
      // Fallback to legacy endpoint if available
      const res = await fetch(`${API_BASE}/employee/attendance?${params.toString()}`, { headers: getAuthHeaders() });
      return handleResponse(res);
    }
  },

  getTodayAttendance: async () => {
    const res = await fetch(`${API_BASE}/attendance/today`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  getAttendanceSummary: async (month, year) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    const res = await fetch(`${API_BASE}/attendance/summary?${params.toString()}`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  checkIn: async (method = 'FACE_RECOGNITION') => {
    const res = await fetch(`${API_BASE}/attendance/check-in`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes: `Clocked in via ${method}` })
    });
    return handleResponse(res);
  },

  checkInWithFace: async (imageBase64, notes = null) => {
    const res = await fetch(`${API_BASE}/attendance/check-in`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ image: imageBase64, notes })
    });
    return handleResponse(res);
  },

  checkOut: async () => {
    const res = await fetch(`${API_BASE}/attendance/check-out`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });
    return handleResponse(res);
  },

  checkOutWithFace: async (imageBase64) => {
    const res = await fetch(`${API_BASE}/attendance/check-out`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ image: imageBase64 })
    });
    return handleResponse(res);
  },

  startBreak: async (reason = 'Regular Break') => {
    const res = await fetch(`${API_BASE}/attendance/break/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  endBreak: async () => {
    const res = await fetch(`${API_BASE}/attendance/break/end`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  requestCorrection: async (data) => {
    const res = await fetch(`${API_BASE}/attendance/correction`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  getCorrections: async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/history`, { headers: getAuthHeaders() });
      const data = await handleResponse(res);
      return { corrections: data.corrections || [] };
    } catch {
      return { corrections: [] };
    }
  },

  // Face Recognition (Biometrics)
  registerFace: async (imageOrData, qualityScore) => {
    const isImage = typeof imageOrData === 'string' && (imageOrData.startsWith('data:image') || imageOrData.length > 500);
    const body = isImage ? { image: imageOrData, qualityScore } : { templateData: imageOrData, qualityScore };
    const res = await fetch(`${API_BASE}/face/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  },

  verifyFace: async (imageOrData, action = 'CHECK_IN') => {
    const isImage = typeof imageOrData === 'string' && (imageOrData.startsWith('data:image') || imageOrData.length > 500);
    const body = isImage ? { image: imageOrData, action } : { templateData: imageOrData, action };
    const res = await fetch(`${API_BASE}/face/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  },

  getFaceStatus: async () => {
    const res = await fetch(`${API_BASE}/face/status`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  deleteFaceRegistration: async () => {
    const res = await fetch(`${API_BASE}/face/registration`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Tasks & Progress
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);
    const res = await fetch(`${API_BASE}/employee/tasks?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getTaskDetails: async (taskId) => {
    const res = await fetch(`${API_BASE}/employee/tasks/${taskId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  updateTaskProgress: async (taskId, data) => {
    const res = await fetch(`${API_BASE}/employee/tasks/${taskId}/progress`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  addTaskComment: async (taskId, comment, attachmentUrl, attachmentName) => {
    const res = await fetch(`${API_BASE}/employee/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ comment, attachmentUrl, attachmentName })
    });
    return handleResponse(res);
  },

  // Daily Work Log
  getWorkLogs: async (date = null, taskId = null) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (taskId) params.append('taskId', taskId);
    const res = await fetch(`${API_BASE}/employee/work-logs?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  addWorkLog: async (logData) => {
    const res = await fetch(`${API_BASE}/employee/work-logs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(logData)
    });
    return handleResponse(res);
  },

  updateWorkLog: async (id, logData) => {
    const res = await fetch(`${API_BASE}/employee/work-logs/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(logData)
    });
    return handleResponse(res);
  },

  // Daily Reports
  getTodayDailyReport: async () => {
    const res = await fetch(`${API_BASE}/employee/daily-reports/today`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getDailyReports: async () => {
    const res = await fetch(`${API_BASE}/employee/daily-reports`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  saveDailyReport: async (reportData) => {
    const res = await fetch(`${API_BASE}/employee/daily-reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reportData)
    });
    return handleResponse(res);
  },

  submitDailyReport: async (reportId) => {
    const res = await fetch(`${API_BASE}/employee/daily-reports/${reportId}/submit`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Leave Management
  getLeaveBalances: async () => {
    const res = await fetch(`${API_BASE}/employee/leave/balance`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getLeaveRequests: async (status = 'all') => {
    const res = await fetch(`${API_BASE}/employee/leave/requests?status=${status}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  applyLeave: async (leaveData) => {
    const res = await fetch(`${API_BASE}/employee/leave/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(leaveData)
    });
    return handleResponse(res);
  },

  cancelLeave: async (requestId) => {
    const res = await fetch(`${API_BASE}/employee/leave/${requestId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Calendar
  getCalendarEvents: async () => {
    const res = await fetch(`${API_BASE}/employee/calendar`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Notifications
  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/employee/notifications`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`${API_BASE}/employee/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_BASE}/employee/notifications/mark-all-read`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Announcements
  getAnnouncements: async () => {
    const res = await fetch(`${API_BASE}/employee/announcements`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  markAnnouncementRead: async (id) => {
    const res = await fetch(`${API_BASE}/employee/announcements/${id}/read`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Profile
  getProfile: async () => {
    const res = await fetch(`${API_BASE}/employee/profile`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  updateProfile: async (data) => {
    const res = await fetch(`${API_BASE}/employee/profile`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Documents
  getDocuments: async () => {
    const res = await fetch(`${API_BASE}/employee/documents`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  downloadDocument: (docId) => {
    const token = localStorage.getItem('employeeToken');
    window.open(`${API_BASE}/employee/documents/${docId}/download?token=${encodeURIComponent(token)}`, '_blank');
  },

  // Performance
  getPerformance: async () => {
    const res = await fetch(`${API_BASE}/employee/performance`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Directory
  getDirectory: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.department) params.append('department', filters.department);
    if (filters.designation) params.append('designation', filters.designation);
    const res = await fetch(`${API_BASE}/employee/directory?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Help & Support
  getSupportTickets: async () => {
    const res = await fetch(`${API_BASE}/employee/support/tickets`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getSupportTicket: async (ticketId) => {
    const res = await fetch(`${API_BASE}/employee/support/tickets/${ticketId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  createSupportTicket: async (ticketData) => {
    const res = await fetch(`${API_BASE}/employee/support/tickets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(ticketData)
    });
    return handleResponse(res);
  },

  replySupportTicket: async (ticketId, message, attachmentUrl, attachmentName) => {
    const res = await fetch(`${API_BASE}/employee/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, attachmentUrl, attachmentName })
    });
    return handleResponse(res);
  },

  closeSupportTicket: async (ticketId) => {
    const res = await fetch(`${API_BASE}/employee/support/tickets/${ticketId}/close`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};
