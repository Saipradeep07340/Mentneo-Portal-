import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function HelpSupportPage() {
  const [searchParams] = useSearchParams();
  const shouldOpenNew = searchParams.get('action') === 'new';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(shouldOpenNew);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [newTicketForm, setNewTicketForm] = useState({
    category: 'IT',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    attachmentUrl: '',
    attachmentName: ''
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getSupportTickets();
      setTickets(res.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    try {
      setDetailLoading(true);
      const res = await employeeApi.getSupportTicket(ticket.id);
      setTicketMessages(res.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await employeeApi.createSupportTicket(newTicketForm);
      setAlert({ type: 'success', text: res.message });
      setShowCreateModal(false);
      setNewTicketForm({
        category: 'IT',
        subject: '',
        description: '',
        priority: 'MEDIUM',
        attachmentUrl: '',
        attachmentName: ''
      });
      await loadTickets();
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    try {
      setActionLoading(true);
      await employeeApi.replySupportTicket(selectedTicket.id, replyText);
      setReplyText('');
      const res = await employeeApi.getSupportTicket(selectedTicket.id);
      setTicketMessages(res.messages || []);
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (!window.confirm('Are you sure you want to mark this ticket as resolved and closed?')) return;
    try {
      setActionLoading(true);
      await employeeApi.closeSupportTicket(selectedTicket.id);
      setAlert({ type: 'success', text: 'Support ticket closed.' });
      setSelectedTicket({ ...selectedTicket, status: 'CLOSED' });
      await loadTickets();
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {alert && (
        <div style={{
          background: alert.type === 'success' ? 'var(--portal-success-bg)' : 'var(--portal-danger-bg)',
          border: `1px solid ${alert.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: alert.type === 'success' ? 'var(--portal-success)' : 'var(--portal-danger)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20
        }}>
          {alert.text}
        </div>
      )}

      {/* HEADER & NEW BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Support Requests & Internal Help Desk</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--portal-text-subtle)' }}>
            Raise IT infrastructure, HR inquiry, attendance, or payroll assistance tickets.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Raise New Ticket
        </button>
      </div>

      {/* TICKETS TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
      ) : tickets.length === 0 ? (
        <div className="portal-empty-state">
          <div className="portal-empty-icon">💬</div>
          <h4>No support tickets raised.</h4>
          <p>If you encounter hardware, software, payroll, or access issues, click "Raise New Ticket".</p>
        </div>
      ) : (
        <div className="portal-table-container">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Ticket Code</th>
                <th>Category</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Messages</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id} onClick={() => handleOpenTicket(ticket)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>{ticket.ticket_code}</span>
                  </td>
                  <td>
                    <span className="portal-badge portal-badge-subtle">{ticket.category}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--portal-text-main)', maxWidth: 280 }}>
                    {ticket.subject}
                  </td>
                  <td>
                    <span className={`portal-badge ${
                      ticket.priority === 'URGENT' ? 'portal-badge-danger' :
                      ticket.priority === 'HIGH' ? 'portal-badge-warning' : 'portal-badge-primary'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`portal-badge ${
                      ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'portal-badge-success' :
                      ticket.status === 'IN_PROGRESS' ? 'portal-badge-primary' : 'portal-badge-warning'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{ticket.message_count || 1} msg</td>
                  <td style={{ fontSize: 12, color: 'var(--portal-text-subtle)' }}>
                    {new Date(ticket.updated_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="btn-qa" style={{ fontSize: 11, padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); handleOpenTicket(ticket); }}>
                      View Thread →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TICKET CONVERSATION DRAWER / MODAL */}
      {selectedTicket && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 680 }}>
            <div className="portal-modal-header">
              <div>
                <span style={{ fontSize: 12, color: 'var(--portal-primary)', fontWeight: 700 }}>{selectedTicket.ticket_code}</span>
                <h3 style={{ margin: '2px 0 0' }}>{selectedTicket.subject}</h3>
              </div>
              <button className="portal-modal-close" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="portal-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <span className="portal-badge portal-badge-subtle">Category: {selectedTicket.category}</span>
                <span className="portal-badge portal-badge-warning">Priority: {selectedTicket.priority}</span>
                <span className="portal-badge portal-badge-primary">Status: {selectedTicket.status}</span>
              </div>

              {/* Message Thread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {detailLoading ? (
                  <div className="portal-spinner" />
                ) : (
                  ticketMessages.map(msg => {
                    const isStaff = msg.sender_type === 'SUPPORT' || msg.sender_type === 'ADMIN';
                    return (
                      <div 
                        key={msg.id}
                        style={{
                          background: isStaff ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isStaff ? 'rgba(56, 189, 248, 0.25)' : 'var(--portal-card-border)'}`,
                          borderRadius: 8,
                          padding: 14
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: isStaff ? 'var(--portal-primary)' : 'var(--portal-text-main)' }}>
                            {msg.sender_name} {isStaff ? '(Support Team)' : ''}
                          </span>
                          <span style={{ color: 'var(--portal-text-subtle)', fontSize: 11 }}>
                            {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--portal-text-main)', lineHeight: 1.5 }}>
                          {msg.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Form */}
              {selectedTicket.status !== 'CLOSED' ? (
                <form onSubmit={handleSendReply}>
                  <div className="portal-form-group">
                    <label>Add Reply / Status Update</label>
                    <textarea 
                      className="portal-textarea"
                      placeholder="Type your response to support staff..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" className="btn-secondary" style={{ color: 'var(--portal-danger)' }} onClick={handleCloseTicket}>
                      Close Ticket
                    </button>
                    <button type="submit" className="btn-primary" disabled={actionLoading || !replyText.trim()}>
                      Send Reply
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 6, fontSize: 12.5, color: 'var(--portal-text-subtle)', textAlign: 'center' }}>
                  This ticket has been closed.
                </div>
              )}
            </div>

            <div className="portal-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedTicket(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h3>Raise Support Request</h3>
              <button className="portal-modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="portal-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="portal-form-group">
                    <label>Category *</label>
                    <select 
                      className="portal-select"
                      value={newTicketForm.category}
                      onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                      required
                    >
                      <option value="IT">IT Infrastructure / Hardware</option>
                      <option value="HR">Human Resources</option>
                      <option value="Payroll">Payroll & Compensation</option>
                      <option value="Attendance">Attendance & Biometrics</option>
                      <option value="Leave">Leave Management</option>
                      <option value="Access/Login">Access & Authentication</option>
                      <option value="Other">Other Query</option>
                    </select>
                  </div>

                  <div className="portal-form-group">
                    <label>Priority *</label>
                    <select 
                      className="portal-select"
                      value={newTicketForm.priority}
                      onChange={(e) => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                      required
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent (System Down)</option>
                    </select>
                  </div>
                </div>

                <div className="portal-form-group">
                  <label>Subject / Brief Summary *</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="e.g. Request GPU quota increase for Saadhyam model..."
                    value={newTicketForm.subject}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Detailed Description *</label>
                  <textarea 
                    className="portal-textarea"
                    placeholder="Explain the problem or requirement with reproduction steps or urgency..."
                    value={newTicketForm.description}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Attachment URL / Reference (Optional)</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="URL to logs, screenshots, or receipts..."
                    value={newTicketForm.attachmentUrl}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, attachmentUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
