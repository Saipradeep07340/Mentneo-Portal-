import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (docId) => {
    employeeApi.downloadDocument(docId);
  };

  const filtered = filterType === 'all' ? documents : documents.filter(d => d.document_type === filterType);

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getDocTypeIcon = (type) => {
    if (type.includes('POLICY')) return '📜';
    if (type.includes('LETTER')) return '✉️';
    if (type.includes('PAYSLIP')) return '💰';
    if (type.includes('BENEFITS')) return '🏥';
    return '📄';
  };

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <div>
          <h3 style={{ margin: 0 }}>Employee Documents & Corporate Files</h3>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--portal-text-subtle)' }}>
            Authorized employment records, appointment letters, corporate policies, and payroll statements.
          </p>
        </div>

        <select 
          className="portal-select" 
          style={{ width: 220 }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Document Types</option>
          <option value="APPOINTMENT_LETTER">Appointment Letters</option>
          <option value="COMPANY_POLICY">Company Policies</option>
          <option value="SECURITY_POLICY">Security Guidelines</option>
          <option value="BENEFITS">Medical & Benefits</option>
          <option value="PAYSLIP">Salary & Payslips</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="portal-empty-state">
          <div className="portal-empty-icon">📁</div>
          <h4>No documents found.</h4>
          <p>You currently have no documents matching this category.</p>
        </div>
      ) : (
        <div className="portal-table-container">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Document Title</th>
                <th>Type</th>
                <th>Uploaded By</th>
                <th>File Size</th>
                <th>Date Issued</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{getDocTypeIcon(doc.document_type)}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--portal-text-main)', fontSize: 13.5 }}>
                          {doc.document_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)' }}>
                          PDF Document • ID: {doc.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="portal-badge portal-badge-primary" style={{ fontSize: 11 }}>
                      {doc.document_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{doc.uploaded_by}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--portal-text-subtle)' }}>
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td style={{ fontSize: 12.5 }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <span className="portal-badge portal-badge-success">
                      {doc.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-qa"
                      style={{ fontSize: 12, padding: '6px 12px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--portal-primary)' }}
                      onClick={() => handleDownload(doc.id)}
                    >
                      ⬇️ Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
