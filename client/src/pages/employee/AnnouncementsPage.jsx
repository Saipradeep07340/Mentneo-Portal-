import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getAnnouncements();
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAnnouncement = async (ann) => {
    setSelectedAnnouncement(ann);
    if (!ann.is_read) {
      try {
        await employeeApi.markAnnouncementRead(ann.id);
        setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, is_read: 1 } : a));
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div>
      <div className="portal-card" style={{ marginBottom: 24 }}>
        <div className="portal-card-header">
          <div>
            <h3 style={{ margin: 0 }}>Company Announcements & Bulletins</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--portal-text-subtle)' }}>
              Official corporate notices, policy rollouts, and engineering updates.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
        ) : announcements.length === 0 ? (
          <div className="portal-empty-state">
            <div className="portal-empty-icon">📢</div>
            <h4>No announcements available.</h4>
            <p>Check back later for company updates.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {announcements.map(ann => (
              <div 
                key={ann.id}
                className="portal-card"
                style={{
                  cursor: 'pointer',
                  background: ann.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(56, 189, 248, 0.04)',
                  borderColor: ann.is_read ? 'var(--portal-card-border)' : 'rgba(56, 189, 248, 0.3)'
                }}
                onClick={() => handleOpenAnnouncement(ann)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span className={`portal-badge ${
                    ann.priority === 'IMPORTANT' ? 'portal-badge-warning' :
                    ann.priority === 'URGENT' ? 'portal-badge-danger' : 'portal-badge-primary'
                  }`}>
                    {ann.priority}
                  </span>
                  {!ann.is_read && (
                    <span className="portal-badge portal-badge-primary" style={{ fontSize: 10 }}>NEW</span>
                  )}
                </div>

                <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: 'var(--portal-text-main)' }}>
                  {ann.title}
                </h3>

                <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--portal-text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {ann.content}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--portal-text-subtle)', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--portal-card-border)' }}>
                  <span>By <b>{ann.author_name}</b></span>
                  <span>{new Date(ann.published_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedAnnouncement && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 640 }}>
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`portal-badge ${
                  selectedAnnouncement.priority === 'IMPORTANT' ? 'portal-badge-warning' :
                  selectedAnnouncement.priority === 'URGENT' ? 'portal-badge-danger' : 'portal-badge-primary'
                }`}>
                  {selectedAnnouncement.priority}
                </span>
                <span style={{ fontSize: 12, color: 'var(--portal-text-subtle)' }}>
                  {new Date(selectedAnnouncement.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <button className="portal-modal-close" onClick={() => setSelectedAnnouncement(null)}>✕</button>
            </div>

            <div className="portal-modal-body">
              <h2 style={{ margin: '0 0 14px', fontSize: 20, color: 'var(--portal-text-main)' }}>
                {selectedAnnouncement.title}
              </h2>

              <div style={{ fontSize: 12.5, color: 'var(--portal-primary)', marginBottom: 18 }}>
                Published by: <b>{selectedAnnouncement.author_name}</b> {selectedAnnouncement.department_name ? `• (${selectedAnnouncement.department_name})` : ''}
              </div>

              <div style={{ fontSize: 14, color: 'var(--portal-text-main)', lineHeight: 1.7, background: 'rgba(255,255,255,0.02)', padding: 18, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
                {selectedAnnouncement.content}
              </div>

              {selectedAnnouncement.attachment_name && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--portal-primary)' }}>
                  <span>📎</span> Attachment: <b>{selectedAnnouncement.attachment_name}</b>
                </div>
              )}
            </div>

            <div className="portal-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedAnnouncement(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
