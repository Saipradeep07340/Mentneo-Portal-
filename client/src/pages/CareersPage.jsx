import React, { useState, useEffect } from 'react';
import '../styles/CareersPage.css';
import JobCard from '../components/JobCard';
import ApplicationModal from '../components/ApplicationModal';

const CareersPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [filters, setFilters] = useState({ department: 'all', location: 'all' });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/careers/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleApplicationSuccess = (applicationId) => {
    setShowApplicationModal(false);
    setSelectedJob(null);
  };

  const filteredJobs = jobs.filter(job => {
    const deptMatch = filters.department === 'all' || job.department === filters.department;
    const locMatch = filters.location === 'all' || job.location === filters.location;
    return deptMatch && locMatch;
  });

  const departments = [...new Set(jobs.map(job => job.department))];
  const locations = [...new Set(jobs.map(job => job.location))];

  return (
    <div className="careers-page">
      {/* Hero Section */}
      <section className="careers-hero">
        <div className="careers-hero-content container">
          <h1 className="careers-title">Join Our Team</h1>
          <p className="careers-subtitle">
            Be part of a cutting-edge AI research and development company transforming industries with intelligent solutions.
          </p>
        </div>
      </section>

      {/* Filter Section */}
      <section className="careers-filters container">
        <div className="filter-group">
          <label htmlFor="dept-filter">Department:</label>
          <select
            id="dept-filter"
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="loc-filter">Location:</label>
          <select
            id="loc-filter"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <button onClick={fetchJobs} className="refresh-btn">Refresh</button>
      </section>

      {/* Jobs Listing */}
      <section className="careers-listing container">
        {loading ? (
          <div className="loading-state">
            <p>Loading career opportunities...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>Error: {error}</p>
            <button onClick={fetchJobs} className="retry-btn">Try Again</button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="empty-state">
            <p>No positions available matching your filters.</p>
            <button onClick={() => setFilters({ department: 'all', location: 'all' })} className="reset-btn">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="jobs-grid">
            {filteredJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onApplyClick={handleApplyClick}
              />
            ))}
          </div>
        )}
      </section>

      {/* Application Modal */}
      {showApplicationModal && selectedJob && (
        <ApplicationModal
          job={selectedJob}
          onClose={() => setShowApplicationModal(false)}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </div>
  );
};

export default CareersPage;
