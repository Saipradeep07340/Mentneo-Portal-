import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getCalendarEvents();
      setEvents(res.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getEventBadgeClass = (type) => {
    if (type === 'HOLIDAY') return 'portal-badge-warning';
    if (type === 'LEAVE') return 'portal-badge-success';
    if (type === 'TASK') return 'portal-badge-primary';
    if (type === 'MEETING') return 'portal-badge-danger';
    return 'portal-badge-subtle';
  };

  // Build 35 days calendar grid for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  // Leading padding
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({ dayNumber: null, dateStr: null });
  }
  // Month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNumber: d, dateStr: dStr });
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const resetToday = () => setCurrentDate(new Date());

  return (
    <div>
      {/* CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-qa" onClick={prevMonth}>◀</button>
            <button className="btn-qa" onClick={resetToday}>Today</button>
            <button className="btn-qa" onClick={nextMonth}>▶</button>
          </div>
        </div>

        {/* View Mode & Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
            <span className="portal-badge portal-badge-warning">Holidays</span>
            <span className="portal-badge portal-badge-success">Leaves</span>
            <span className="portal-badge portal-badge-primary">Tasks</span>
            <span className="portal-badge portal-badge-danger">Meetings</span>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
            {['month', 'list'].map(vm => (
              <button
                key={vm}
                className={`btn-qa ${viewMode === vm ? 'btn-qa-primary' : ''}`}
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setViewMode(vm)}
              >
                {vm.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
      ) : viewMode === 'month' ? (
        <div style={{
          background: 'var(--portal-card-bg)',
          border: '1px solid var(--portal-card-border)',
          borderRadius: 12,
          overflow: 'hidden'
        }}>
          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--portal-card-border)', textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, color: 'var(--portal-text-subtle)' }}>
            <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
          </div>

          {/* Grid Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 480 }}>
            {calendarDays.map((cell, idx) => {
              if (!cell.dayNumber) {
                return (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.15)', borderRight: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }} />
                );
              }

              const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);
              const dayEvents = events.filter(e => {
                const s = (e.start_date || '').slice(0, 10);
                const end = (e.end_date || e.start_date || '').slice(0, 10);
                return cell.dateStr >= s && cell.dateStr <= end;
              });

              return (
                <div 
                  key={idx}
                  style={{
                    minHeight: 90,
                    padding: 8,
                    borderRight: '1px solid rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isToday ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    fontSize: 12,
                    fontWeight: isToday ? 800 : 600,
                    color: isToday ? 'var(--portal-primary)' : 'var(--portal-text-subtle)',
                    marginBottom: 4
                  }}>
                    {cell.dayNumber}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        style={{
                          fontSize: 11,
                          padding: '2px 5px',
                          borderRadius: 4,
                          background: ev.event_type === 'HOLIDAY' ? 'rgba(245, 158, 11, 0.2)' :
                                      ev.event_type === 'LEAVE' ? 'rgba(16, 185, 129, 0.2)' :
                                      ev.event_type === 'MEETING' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer'
                        }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: 10, color: 'var(--portal-text-subtle)', textAlign: 'center' }}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="portal-card">
          <div className="portal-table-container">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Title</th>
                  <th>Date & Time</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} onClick={() => setSelectedEvent(ev)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className={`portal-badge ${getEventBadgeClass(ev.event_type)}`}>
                        {ev.event_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--portal-text-main)' }}>
                      {ev.title}
                    </td>
                    <td>
                      {ev.start_date} {ev.start_time ? `at ${ev.start_time}` : '(All Day)'}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--portal-text-muted)' }}>
                      {ev.description || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 480 }}>
            <div className="portal-modal-header">
              <span className={`portal-badge ${getEventBadgeClass(selectedEvent.event_type)}`}>
                {selectedEvent.event_type}
              </span>
              <button className="portal-modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className="portal-modal-body">
              <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>{selectedEvent.title}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--portal-text-subtle)' }}>Dates: </span>
                  <b>{selectedEvent.start_date} {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date ? `to ${selectedEvent.end_date}` : ''}</b>
                </div>
                {selectedEvent.start_time && (
                  <div>
                    <span style={{ color: 'var(--portal-text-subtle)' }}>Time: </span>
                    <b>{selectedEvent.start_time} – {selectedEvent.end_time || ''}</b>
                  </div>
                )}
                {selectedEvent.location && (
                  <div>
                    <span style={{ color: 'var(--portal-text-subtle)' }}>Location: </span>
                    <b>{selectedEvent.location}</b>
                  </div>
                )}
                {selectedEvent.description && (
                  <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--portal-card-border)' }}>
                    <div style={{ color: 'var(--portal-text-subtle)', fontSize: 11.5, marginBottom: 4 }}>Details:</div>
                    <div style={{ color: 'var(--portal-text-main)', lineHeight: 1.5 }}>{selectedEvent.description}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
