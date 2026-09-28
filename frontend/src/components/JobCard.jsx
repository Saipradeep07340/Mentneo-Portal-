import React from 'react';
import '../styles/JobCard.css';

const JobCard = ({ job, onApplyClick }) => {
  return (
    <div className="job-card">
      <div className="job-card-header">
        <h3 className="job-title">{job.title}</h3>
        <span className="job-department">{job.department}</span>
      </div>

      <div className="job-info">
        <div className="job-info-item">
          <span className="info-label">📍 Location:</span>
          <span className="info-value">{job.location}</span>
        </div>
        <div className="job-info-item">
          <span className="info-label">⏱️ Type:</span>
          <span className="info-value">{job.employment_type || 'Full-time'}</span>
        </div>
        <div className="job-info-item">
          <span className="info-label">📊 Experience:</span>
          <span className="info-value">{job.experience_required || 'Entry Level'}</span>
        </div>
      </div>

      {job.salary && (
        <div className="job-salary">
          <strong>💰 {job.salary}</strong>
        </div>
      )}

      <div className="job-description">
        <p>{job.description?.substring(0, 150)}...</p>
      </div>

      {job.required_skills && job.required_skills.length > 0 && (
        <div className="job-skills">
          <strong>Skills Required:</strong>
          <div className="skills-list">
            {job.required_skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="skill-tag">{skill}</span>
            ))}
            {job.required_skills.length > 3 && (
              <span className="skill-tag more">+{job.required_skills.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      <button
        className="apply-btn"
        onClick={() => onApplyClick(job)}
      >
        Apply Now →
      </button>
    </div>
  );
};

export default JobCard;
