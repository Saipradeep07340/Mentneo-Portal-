import React, { useState, useEffect } from 'react';
import '../styles/AdminDashboard.css';

const AdminDashboard = ({ token, onLogout }) => {
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('applications');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationDetail, setShowApplicationDetail] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [filters, setFilters] = useState({ status: 'all', search: '' });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch stats
      const statsRes = await fetch('http://localhost:5000/api/admin/dashboard', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch applications
      const appRes = await fetch('http://localhost:5000/api/admin/applications', { headers });
      if (appRes.ok) {
        const appData = await appRes.json();
        setApplications(appData.applications || []);
      }

      // Fetch jobs
      const jobRes = await fetch('http://localhost:5000/api/admin/jobs', { headers });
      if (jobRes.ok) {
        const jobData = await jobRes.json();
        setJobs(jobData.jobs || []);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationClick = (app) => {
    setSelectedApplication(app);
    setNewStatus(app.status || '');
    setAdminNotes(app.admin_notes || '');
    setShowApplicationDetail(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedApplication || !newStatus) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/applications/${selectedApplication.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus, notes: adminNotes })
        }
      );

      if (!response.ok) throw new Error('Failed to update status');

      setShowApplicationDetail(false);
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteApplication = async (appId) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/applications/${appId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete application');
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredApplications = applications.filter(app => {
    const statusMatch = filters.status === 'all' || app.status === filters.status;
    const searchMatch = app.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
                       app.email.toLowerCase().includes(filters.search.toLowerCase()) ||
                       app.application_id.toLowerCase().includes(filters.search.toLowerCase());
    return statusMatch && searchMatch;
  });

  if (loading) {
    return <div className="admin-loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-content container">
          <h1>Admin Dashboard</h1>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Stats Section */}
      <section className="dashboard-stats container">
        <div className="stat-card">
          <h3>Total Applications</h3>
          <p className="stat-value">{stats.totalApplications || 0}</p>
        </div>
        <div className="stat-card">
          <h3>New Applications</h3>
          <p className="stat-value">{stats.statusBreakdown?.New || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Shortlisted</h3>
          <p className="stat-value">{stats.statusBreakdown?.Shortlisted || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Selected</h3>
          <p className="stat-value">{stats.statusBreakdown?.Selected || 0}</p>
        </div>
      </section>

      {/* Tabs */}
      <div className="admin-tabs container">
        <button
          className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          Applications ({applications.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs ({jobs.length})
        </button>
      </div>

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <section className="admin-section container">
          <div className="section-header">
            <h2>Job Applications</h2>
            <div className="filters">
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="search-input"
              />
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="status-filter"
              >
                <option value="all">All Status</option>
                <option value="New">New</option>
                <option value="Under Review">Under Review</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Selected">Selected</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {filteredApplications.length === 0 ? (
            <div className="empty-state">
              <p>No applications found</p>
            </div>
          ) : (
            <div className="applications-table">
              <table>
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Candidate Name</th>
                    <th>Email</th>
                    <th>Position</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map(app => (
                    <tr key={app.id} className={`status-${app.status?.toLowerCase().replace(' ', '-')}`}>
                      <td className="app-id">{app.application_id}</td>
                      <td>{app.full_name}</td>
                      <td>{app.email}</td>
                      <td>{app.jobs?.title || 'N/A'}</td>
                      <td><span className="status-badge">{app.status}</span></td>
                      <td>{new Date(app.submission_date).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleApplicationClick(app)}
                          className="action-btn view-btn"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          className="action-btn delete-btn"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <section className="admin-section container">
          <div className="section-header">
            <h2>Job Postings</h2>
            <button className="add-job-btn">+ Add New Job</button>
          </div>

          {jobs.length === 0 ? (
            <div className="empty-state">
              <p>No jobs created yet</p>
            </div>
          ) : (
            <div className="jobs-list">
              {jobs.map(job => (
                <div key={job.id} className={`job-item ${job.published ? 'published' : 'draft'}`}>
                  <div className="job-main">
                    <h3>{job.title}</h3>
                    <p className="job-dept">{job.department} • {job.location}</p>
                  </div>
                  <div className="job-status">
                    <span className={`publish-badge ${job.published ? 'published' : 'draft'}`}>
                      {job.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="job-actions">
                    <button className="action-btn">Edit</button>
                    <button className="action-btn">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Application Detail Modal */}
      {showApplicationDetail && selectedApplication && (
        <div className="detail-modal-overlay" onClick={() => setShowApplicationDetail(false)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Application Details</h2>
              <button onClick={() => setShowApplicationDetail(false)} className="close-btn">✕</button>
            </div>

            <div className="modal-content">
              <div className="detail-section">
                <h3>Candidate Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Name:</strong>
                    <p>{selectedApplication.full_name}</p>
                  </div>
                  <div className="info-item">
                    <strong>Email:</strong>
                    <p>{selectedApplication.email}</p>
                  </div>
                  <div className="info-item">
                    <strong>Mobile:</strong>
                    <p>{selectedApplication.mobile}</p>
                  </div>
                  <div className="info-item">
                    <strong>Application ID:</strong>
                    <p>{selectedApplication.application_id}</p>
                  </div>
                  <div className="info-item">
                    <strong>Experience:</strong>
                    <p>{selectedApplication.experience}</p>
                  </div>
                  <div className="info-item">
                    <strong>Qualification:</strong>
                    <p>{selectedApplication.qualification}</p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Update Status</h3>
                <div className="status-update">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="status-select"
                  >
                    <option value="">Select Status</option>
                    <option value="New">New</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Interview Scheduled">Interview Scheduled</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="detail-section">
                <h3>Admin Notes</h3>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  className="notes-field"
                />
              </div>

              {selectedApplication.resume_url && (
                <div className="detail-section">
                  <h3>Resume</h3>
                  <a href={selectedApplication.resume_url} target="_blank" rel="noopener noreferrer" className="resume-link">
                    📄 Download Resume
                  </a>
                </div>
              )}

              <div className="modal-actions">
                <button onClick={() => setShowApplicationDetail(false)} className="btn-cancel">
                  Cancel
                </button>
                <button onClick={handleStatusUpdate} className="btn-update">
                  Update Status & Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
