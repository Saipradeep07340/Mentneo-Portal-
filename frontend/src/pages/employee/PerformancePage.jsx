import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function PerformancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getPerformance();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
    );
  }

  const { goals = [], reviews = [], taskMetrics = {} } = data || {};

  return (
    <div>
      {/* PERFORMANCE METRICS SUMMARY */}
      <div className="portal-metrics-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="portal-metric-box">
          <div className="portal-metric-value" style={{ color: 'var(--portal-primary)' }}>
            {goals.length}
          </div>
          <div className="portal-metric-label">Active Goals</div>
        </div>

        <div className="portal-metric-box">
          <div className="portal-metric-value" style={{ color: 'var(--portal-success)' }}>
            {taskMetrics.completed_tasks || 0} / {taskMetrics.total_tasks || 0}
          </div>
          <div className="portal-metric-label">Tasks Completed</div>
        </div>

        <div className="portal-metric-box">
          <div className="portal-metric-value" style={{ color: 'var(--portal-warning)' }}>
            {Math.round(taskMetrics.avg_progress || 0)}%
          </div>
          <div className="portal-metric-label">Avg Execution Rate</div>
        </div>

        <div className="portal-metric-box">
          <div className="portal-metric-value" style={{ color: '#facc15' }}>
            {reviews[0]?.overall_rating ? `${reviews[0].overall_rating} ⭐` : '4.8 ⭐'}
          </div>
          <div className="portal-metric-label">Latest Rating</div>
        </div>
      </div>

      {/* GOALS GRID */}
      <div className="portal-card" style={{ marginBottom: 24 }}>
        <div className="portal-card-header">
          <h3><span>🎯</span> Strategic Performance Goals & OKRs</h3>
          <span style={{ fontSize: 12, color: 'var(--portal-text-subtle)' }}>Quarterly Evaluation Targets</span>
        </div>

        {goals.length === 0 ? (
          <div className="portal-empty-state">
            <div className="portal-empty-icon">🎯</div>
            <h4>No goals assigned yet.</h4>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {goals.map(g => (
              <div key={g.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--portal-card-border)', borderRadius: 10, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--portal-text-main)' }}>
                    {g.title}
                  </h4>
                  <span className={`portal-badge ${g.status === 'COMPLETED' ? 'portal-badge-success' : 'portal-badge-primary'}`}>
                    {g.status}
                  </span>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--portal-text-muted)', lineHeight: 1.4 }}>
                  {g.description}
                </p>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--portal-text-subtle)' }}>Progress</span>
                    <span style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>{g.progress_percent}%</span>
                  </div>
                  <div className="portal-progress-track">
                    <div className="portal-progress-fill" style={{ width: `${g.progress_percent}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--portal-text-subtle)', marginTop: 4 }}>
                    <span>Target: {g.target_value} {g.unit}</span>
                    <span>Achieved: {g.current_value} {g.unit}</span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                  Target Horizon: {g.start_date} → {g.end_date}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MANAGER FEEDBACK & REVIEWS */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h3><span>📝</span> Manager Performance Appraisals & Feedback</h3>
        </div>

        {reviews.length === 0 ? (
          <div className="portal-empty-state">
            <div className="portal-empty-icon">📝</div>
            <h4>No performance reviews recorded yet.</h4>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviews.map(r => (
              <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--portal-card-border)', borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--portal-text-main)' }}>
                      {r.review_period}
                    </h4>
                    <div style={{ fontSize: 12, color: 'var(--portal-text-subtle)', marginTop: 2 }}>
                      Evaluated by <b>{r.reviewer_name}</b> on {r.review_date}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(250, 204, 21, 0.15)', border: '1px solid rgba(250, 204, 21, 0.3)', color: '#facc15', padding: '6px 14px', borderRadius: 20, fontWeight: 800, fontSize: 14 }}>
                    ⭐ {r.overall_rating} / 5.0
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: 'var(--portal-text-main)', marginBottom: 14 }}>
                  <b>Executive Assessment:</b><br />
                  "{r.feedback}"
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 12.5 }}>
                  {r.strengths && (
                    <div style={{ background: 'rgba(16,185,129,0.05)', padding: 12, borderRadius: 6, border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--portal-success)', marginBottom: 4 }}>Key Strengths:</div>
                      <div style={{ color: 'var(--portal-text-muted)' }}>{r.strengths}</div>
                    </div>
                  )}

                  {r.improvements && (
                    <div style={{ background: 'rgba(56,189,248,0.05)', padding: 12, borderRadius: 6, border: '1px solid rgba(56,189,248,0.2)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--portal-primary)', marginBottom: 4 }}>Growth Opportunities:</div>
                      <div style={{ color: 'var(--portal-text-muted)' }}>{r.improvements}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
