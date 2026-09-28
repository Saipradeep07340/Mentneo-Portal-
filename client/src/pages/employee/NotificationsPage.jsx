import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, linkUrl = null) => {
    try {
      await employeeApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (linkUrl) {
        navigate(linkUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await employeeApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filter === 'unread' ? notifications.filter(n => n.is_read === 0) : notifications;

  const getTypeBadge = (type) => {
    if (type === 'TASK') return { label: 'TASK', class: 'portal-badge-primary', icon: '📋' };
    if (type === 'DEADLINE') return { label: 'DEADLINE', class: 'portal-badge-danger', icon: '⏰' };
    if (type === 'LEAVE') return { label: 'LEAVE', class: 'portal-badge-success', icon: '🏖️' };
    if (type === 'FEEDBACK') return { label: 'FEEDBACK', class: 'portal-badge-warning', icon: '⭐' };
    return { label: 'SYSTEM', class: 'portal-badge-subtle', icon: '🔔' };
  };

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <div>
          <h3 style={{ margin: 0 }}>Notification Center</h3>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--portal-text-subtle)' }}>
            System alerts, operational requests, and performance updates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
            <button 
              className={`btn-qa ${filter === 'all' ? 'btn-qa-primary' : ''}`}
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button 
              className={`btn-qa ${filter === 'unread' ? 'btn-qa-primary' : ''}`}
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button className="btn-secondary" style={{ fontSize: 12.5, padding: '6px 14px' }} onClick={handleMarkAllRead}>
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="portal-empty-state">
          <div className="portal-empty-icon">🔔</div>
          <h4>No notifications to display.</h4>
          <p>You have caught up with all current alerts.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(notif => {
            const badge = getTypeBadge(notif.type);
            return (
              <div 
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id, notif.link_url)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 10,
                  background: notif.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(56, 189, 248, 0.08)',
                  border: `1px solid ${notif.is_read ? 'var(--portal-card-border)' : 'rgba(56, 189, 248, 0.25)'}`,
                  cursor: notif.link_url ? 'pointer' : 'default',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 24 }}>{badge.icon}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span className={`portal-badge ${badge.class}`} style={{ fontSize: 10.5 }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: notif.is_read ? 600 : 700, color: 'var(--portal-text-main)' }}>
                        {notif.title}
                      </span>
                      {!notif.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--portal-primary)' }} />}
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--portal-text-muted)' }}>
                      {notif.message}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--portal-text-subtle)' }}>
                    {new Date(notif.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {notif.link_url && (
                    <span style={{ color: 'var(--portal-primary)', fontSize: 12 }}>Open →</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
