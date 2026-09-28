import React, { useState } from 'react';
import '../styles/ApplicationModal.css';

const ApplicationModal = ({ job, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    location: '',
    qualification: '',
    experience: '',
    company: '',
    skills: '',
    linkedIn: '',
    portfolio: '',
    message: ''
  });
  const [resume, setResume] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState(null);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required';
    else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Mobile number must be 10 digits';
    }

    if (!formData.qualification.trim()) newErrors.qualification = 'Qualification is required';
    if (!formData.experience.trim()) newErrors.experience = 'Experience is required';
    if (!resume) newErrors.resume = 'Resume is required';
    else if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(resume.type)) {
      newErrors.resume = 'Only PDF, DOC, and DOCX files are allowed';
    }

    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResume(file);
      if (errors.resume) {
        setErrors(prev => ({
          ...prev,
          resume: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);

      const submissionData = new FormData();
      submissionData.append('fullName', formData.fullName);
      submissionData.append('email', formData.email);
      submissionData.append('mobile', formData.mobile);
      submissionData.append('location', formData.location);
      submissionData.append('positionId', job.id);
      submissionData.append('qualification', formData.qualification);
      submissionData.append('experience', formData.experience);
      submissionData.append('company', formData.company);
      submissionData.append('skills', formData.skills);
      submissionData.append('linkedIn', formData.linkedIn);
      submissionData.append('portfolio', formData.portfolio);
      submissionData.append('message', formData.message);
      submissionData.append('resume', resume);

      const response = await fetch('http://localhost:5000/api/careers/apply', {
        method: 'POST',
        body: submissionData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setApplicationId(data.applicationId);
      setSubmitSuccess(true);
      setTimeout(() => {
        onSuccess(data.applicationId);
      }, 3000);
    } catch (error) {
      setErrors({ submit: error.message });
      console.error('Error submitting application:', error);
    } finally {
      setLoading(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content success-modal" onClick={e => e.stopPropagation()}>
          <div className="success-icon">✓</div>
          <h2>Application Submitted Successfully!</h2>
          <p>Thank you for applying to <strong>{job.title}</strong> position.</p>
          <p>Your application has been successfully received.</p>
          <div className="application-id-box">
            <p className="id-label">Your Application ID:</p>
            <p className="id-value">{applicationId}</p>
            <p className="id-copy-hint">(Please save this for future reference)</p>
          </div>
          <p className="next-steps">
            Our recruitment team will review your application and contact you if your profile matches our requirements.
          </p>
          <button onClick={onClose} className="close-btn">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content application-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Apply for {job.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="application-form">
          {errors.submit && (
            <div className="error-message">{errors.submit}</div>
          )}

          <div className="form-section">
            <h3>Personal Information</h3>

            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className={errors.fullName ? 'error' : ''}
              />
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="mobile">Mobile Number *</label>
                <input
                  id="mobile"
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  className={errors.mobile ? 'error' : ''}
                />
                {errors.mobile && <span className="field-error">{errors.mobile}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location">Current Location</label>
              <input
                id="location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, Country"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Professional Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="qualification">Highest Qualification *</label>
                <select
                  id="qualification"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  className={errors.qualification ? 'error' : ''}
                >
                  <option value="">Select qualification</option>
                  <option value="High School">High School</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="PhD">PhD</option>
                  <option value="Diploma">Diploma</option>
                </select>
                {errors.qualification && <span className="field-error">{errors.qualification}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="experience">Years of Experience *</label>
                <select
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className={errors.experience ? 'error' : ''}
                >
                  <option value="">Select experience</option>
                  <option value="Fresher">Fresher</option>
                  <option value="0-1 years">0-1 years</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="2-5 years">2-5 years</option>
                  <option value="5+ years">5+ years</option>
                </select>
                {errors.experience && <span className="field-error">{errors.experience}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="company">Current/Previous Company</label>
              <input
                id="company"
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="Company name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="skills">Skills (comma-separated)</label>
              <textarea
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                placeholder="e.g., Python, Machine Learning, JavaScript"
                rows="2"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Profile Links</h3>

            <div className="form-group">
              <label htmlFor="linkedIn">LinkedIn Profile URL</label>
              <input
                id="linkedIn"
                type="url"
                name="linkedIn"
                value={formData.linkedIn}
                onChange={handleInputChange}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>

            <div className="form-group">
              <label htmlFor="portfolio">Portfolio / GitHub URL</label>
              <input
                id="portfolio"
                type="url"
                name="portfolio"
                value={formData.portfolio}
                onChange={handleInputChange}
                placeholder="https://github.com/yourprofile"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Application Documents</h3>

            <div className="form-group">
              <label htmlFor="resume">Resume / CV *</label>
              <div className="file-input-wrapper">
                <input
                  id="resume"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  className={errors.resume ? 'error' : ''}
                />
                <span className="file-input-label">
                  {resume ? `✓ ${resume.name}` : 'Choose PDF, DOC, or DOCX file (Max 10MB)'}
                </span>
              </div>
              {errors.resume && <span className="field-error">{errors.resume}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="message">Cover Letter / Additional Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Tell us why you're interested in this position..."
                rows="4"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationModal;
