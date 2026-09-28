import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function CompanyDirectoryPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    loadDirectory();
  }, [selectedDept]);

  const loadDirectory = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getDirectory({
        search,
        department: selectedDept
      });
      setEmployees(res.employees || []);
      setDepartments(res.departments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadDirectory();
  };

  return (
    <div>
      {/* SEARCH AND FILTER BAR */}
      <div className="portal-card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <input 
              type="text"
              className="portal-input"
              placeholder="Search colleagues by name, title, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select 
            className="portal-select"
            style={{ width: 220 }}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.code}>{d.name}</option>
            ))}
          </select>

          <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>
            🔍 Search
          </button>
        </form>
      </div>

      {/* DIRECTORY GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="portal-spinner" /></div>
      ) : employees.length === 0 ? (
        <div className="portal-empty-state">
          <div className="portal-empty-icon">👥</div>
          <h4>No employees found.</h4>
          <p>Try refining your name or department search criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {employees.map(emp => (
            <div 
              key={emp.id} 
              className="portal-card"
              style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: 22 }}
              onClick={() => setSelectedEmployee(emp)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                <div className="portal-user-avatar" style={{ width: 50, height: 50, fontSize: 20 }}>
                  {emp.full_name?.charAt(0) || 'M'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--portal-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.full_name}
                  </h4>
                  <div style={{ fontSize: 12.5, color: 'var(--portal-primary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.designation}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--portal-text-subtle)', marginTop: 2 }}>
                    {emp.department_name}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--portal-text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>✉️</span>
                  <span style={{ color: 'var(--portal-text-main)' }}>{emp.work_email}</span>
                </div>
                {emp.work_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📞</span>
                    <span>{emp.work_phone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📍</span>
                  <span>{emp.work_location || 'Hyderabad HQ'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedEmployee && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 480 }}>
            <div className="portal-modal-header">
              <h3>Colleague Profile</h3>
              <button className="portal-modal-close" onClick={() => setSelectedEmployee(null)}>✕</button>
            </div>
            <div className="portal-modal-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div className="portal-user-avatar" style={{ width: 72, height: 72, fontSize: 28, margin: '0 auto 12px' }}>
                  {selectedEmployee.full_name?.charAt(0)}
                </div>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--portal-text-main)' }}>
                  {selectedEmployee.full_name}
                </h3>
                <div style={{ color: 'var(--portal-primary)', fontWeight: 600, fontSize: 13, marginTop: 4 }}>
                  {selectedEmployee.designation}
                </div>
                <div style={{ color: 'var(--portal-text-subtle)', fontSize: 12 }}>
                  {selectedEmployee.department_name}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--portal-card-border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--portal-text-subtle)' }}>Corporate Work Email:</span>
                  <div style={{ fontWeight: 600, color: 'var(--portal-text-main)', marginTop: 2 }}>
                    <a href={`mailto:${selectedEmployee.work_email}`} style={{ color: 'var(--portal-primary)', textDecoration: 'none' }}>
                      {selectedEmployee.work_email}
                    </a>
                  </div>
                </div>

                {selectedEmployee.work_phone && (
                  <div>
                    <span style={{ color: 'var(--portal-text-subtle)' }}>Work Telephone:</span>
                    <div style={{ fontWeight: 600, color: 'var(--portal-text-main)', marginTop: 2 }}>
                      {selectedEmployee.work_phone}
                    </div>
                  </div>
                )}

                <div>
                  <span style={{ color: 'var(--portal-text-subtle)' }}>Office Campus:</span>
                  <div style={{ fontWeight: 600, color: 'var(--portal-text-main)', marginTop: 2 }}>
                    {selectedEmployee.work_location || 'Hyderabad HQ'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--portal-text-subtle)' }}>Team Lead / Manager:</span>
                  <div style={{ fontWeight: 600, color: 'var(--portal-text-main)', marginTop: 2 }}>
                    {selectedEmployee.manager_name || 'Executive Leadership'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--portal-text-subtle)', textAlign: 'center' }}>
                🔒 Privacy Protection Active: Personal salaries, residential addresses, and private HR records are shielded.
              </div>
            </div>

            <div className="portal-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedEmployee(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
