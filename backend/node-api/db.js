import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcryptjs from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mentneo.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    -- Existing Careers and Admin Tables
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      employment_type TEXT,
      experience_required TEXT,
      description TEXT,
      required_skills TEXT DEFAULT '[]',
      responsibilities TEXT DEFAULT '[]',
      qualifications TEXT DEFAULT '[]',
      salary TEXT,
      published INTEGER DEFAULT 0,
      application_deadline TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_applications (
      id TEXT PRIMARY KEY,
      application_id TEXT UNIQUE NOT NULL,
      position_id TEXT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL,
      location TEXT,
      qualification TEXT,
      experience TEXT,
      current_company TEXT,
      skills TEXT DEFAULT '[]',
      linkedin_profile TEXT,
      portfolio_url TEXT,
      resume_url TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'New',
      admin_notes TEXT,
      submission_date TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (position_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS application_status_history (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT,
      changed_by TEXT,
      changed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Departments
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Users for portal auth (Employees, HR, Admins)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'EMPLOYEE',
      status TEXT DEFAULT 'ACTIVE',
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Employees Details
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      employee_code TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      department_id TEXT,
      designation TEXT NOT NULL,
      manager_id TEXT,
      joining_date TEXT NOT NULL,
      employment_status TEXT DEFAULT 'ACTIVE',
      work_location TEXT DEFAULT 'Hyderabad HQ',
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    -- Biometric Face Enrollment (Protected vector template data)
    CREATE TABLE IF NOT EXISTS face_enrollments (
      id TEXT PRIMARY KEY,
      employee_id TEXT UNIQUE NOT NULL,
      template_data TEXT NOT NULL,
      algorithm TEXT DEFAULT 'MentneoFaceVector128',
      quality_score REAL DEFAULT 0.95,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Attendance
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      status TEXT DEFAULT 'PRESENT',
      total_working_minutes INTEGER DEFAULT 0,
      total_break_minutes INTEGER DEFAULT 0,
      is_late INTEGER DEFAULT 0,
      is_early INTEGER DEFAULT 0,
      check_in_method TEXT DEFAULT 'STANDARD',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Attendance Breaks
    CREATE TABLE IF NOT EXISTS attendance_breaks (
      id TEXT PRIMARY KEY,
      attendance_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_minutes INTEGER DEFAULT 0,
      reason TEXT DEFAULT 'Break',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Attendance Correction Requests
    CREATE TABLE IF NOT EXISTS attendance_corrections (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      attendance_id TEXT,
      date TEXT NOT NULL,
      existing_check_in TEXT,
      existing_check_out TEXT,
      requested_check_in TEXT NOT NULL,
      requested_check_out TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE SET NULL
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      task_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT NOT NULL,
      created_by TEXT NOT NULL,
      priority TEXT DEFAULT 'MEDIUM',
      status TEXT DEFAULT 'PENDING',
      start_date TEXT,
      due_date TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      estimated_hours REAL DEFAULT 0,
      actual_hours REAL DEFAULT 0,
      blocker_note TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Task Activities / Timeline
    CREATE TABLE IF NOT EXISTS task_activities (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      message TEXT NOT NULL,
      old_progress INTEGER,
      new_progress INTEGER,
      old_status TEXT,
      new_status TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Task Comments & Attachments
    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      comment TEXT NOT NULL,
      attachment_url TEXT,
      attachment_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Daily Work Logs
    CREATE TABLE IF NOT EXISTS work_logs (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      task_id TEXT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      hours_spent REAL NOT NULL,
      status TEXT DEFAULT 'COMPLETED',
      challenges TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    -- Daily Reports
    CREATE TABLE IF NOT EXISTS daily_reports (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      accomplishments TEXT NOT NULL,
      work_in_progress TEXT,
      blockers TEXT,
      tomorrow_plan TEXT,
      additional_notes TEXT,
      status TEXT DEFAULT 'DRAFT',
      submitted_at TEXT,
      reviewed_by TEXT,
      review_feedback TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Leave Types
    CREATE TABLE IF NOT EXISTS leave_types (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      default_days REAL NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Leave Balances
    CREATE TABLE IF NOT EXISTS leave_balances (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      leave_type_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      total_entitlement REAL NOT NULL,
      used_days REAL DEFAULT 0,
      pending_days REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, leave_type_id, year),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
    );

    -- Leave Requests
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      leave_type_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count REAL NOT NULL,
      reason TEXT NOT NULL,
      attachment_url TEXT,
      status TEXT DEFAULT 'PENDING',
      reviewed_by TEXT,
      review_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
    );

    -- Calendar Events (Holidays, Meetings, Company Events)
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      event_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      description TEXT,
      location TEXT,
      is_all_day INTEGER DEFAULT 1,
      employee_id TEXT,
      department_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      related_entity_type TEXT,
      related_entity_id TEXT,
      is_read INTEGER DEFAULT 0,
      read_at TEXT,
      link_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Announcements
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      department_id TEXT,
      priority TEXT DEFAULT 'GENERAL',
      attachment_name TEXT,
      attachment_url TEXT,
      published_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS announcement_reads (
      id TEXT PRIMARY KEY,
      announcement_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      read_at TEXT DEFAULT (datetime('now')),
      UNIQUE(announcement_id, employee_id),
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Employee Documents
    CREATE TABLE IF NOT EXISTS employee_documents (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      document_name TEXT NOT NULL,
      document_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT 'application/pdf',
      uploaded_by TEXT DEFAULT 'HR Department',
      status TEXT DEFAULT 'VERIFIED',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Employee Performance Goals
    CREATE TABLE IF NOT EXISTS employee_goals (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_value REAL DEFAULT 100,
      current_value REAL DEFAULT 0,
      unit TEXT DEFAULT '%',
      progress_percent INTEGER DEFAULT 0,
      status TEXT DEFAULT 'IN_PROGRESS',
      start_date TEXT,
      end_date TEXT,
      manager_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Performance Reviews
    CREATE TABLE IF NOT EXISTS performance_reviews (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      review_period TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      overall_rating REAL NOT NULL,
      feedback TEXT NOT NULL,
      strengths TEXT,
      improvements TEXT,
      review_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Support Tickets
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      ticket_code TEXT UNIQUE NOT NULL,
      employee_id TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'MEDIUM',
      status TEXT DEFAULT 'OPEN',
      attachment_url TEXT,
      attachment_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Support Ticket Messages
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_type TEXT DEFAULT 'EMPLOYEE',
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      attachment_url TEXT,
      attachment_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      employee_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- User Sessions
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      employee_id TEXT,
      token TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      last_active_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to, status);
    CREATE INDEX IF NOT EXISTS idx_work_logs_employee ON work_logs(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_daily_reports_employee ON daily_reports(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id, status);
    CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_employee ON support_tickets(employee_id, status);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_employee ON audit_logs(employee_id, created_at);
  `);

  seedInitialData();
}

function seedInitialData() {
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get().count;
  if (deptCount > 0) return;

  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();
  const todayStr = now.slice(0, 10);

  // 1. Departments
  const insertDept = db.prepare('INSERT INTO departments (id, name, code, description) VALUES (?, ?, ?, ?)');
  insertDept.run('dept_ai', 'AI Research & Engineering', 'AI_ENG', 'Core AI, LLM, autonomous agents, and model architectures');
  insertDept.run('dept_prod', 'Product & Platforms', 'PROD', 'Enterprise products, platform scaling, and cloud solutions');
  insertDept.run('dept_hr', 'Human Resources & People', 'HR', 'Talent acquisition, employee welfare, and operations');
  insertDept.run('dept_ops', 'Operations & IT Infrastructure', 'OPS', 'Cloud ops, system architecture, security, and IT support');

  // 2. Admin User
  const adminPass = bcryptjs.hashSync('admin123', 10);
  db.prepare('INSERT INTO admin_users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)')
    .run('admin_1', 'admin@mentneo.com', adminPass, 'Mentneo Administrator', 'admin');

  // 3. Manager User & Employee
  const mgrPass = bcryptjs.hashSync('Password@123', 10);
  db.prepare('INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run('usr_mgr', 'vikram.rao@mentneo.com', mgrPass, 'Dr. Vikram Rao', 'MANAGER', 'ACTIVE');

  db.prepare(`
    INSERT INTO employees (
      id, user_id, employee_code, first_name, last_name, email, phone, address,
      department_id, designation, manager_id, joining_date, employment_status, work_location
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'emp_mgr', 'usr_mgr', 'MNT-001', 'Vikram', 'Rao', 'vikram.rao@mentneo.com', '+91 98765 43210',
    'Financial District, Gachibowli, Hyderabad, Telangana 500032',
    'dept_ai', 'VP of AI Research', null, '2025-01-15', 'ACTIVE', 'Hyderabad HQ'
  );

  // 4. Primary Employee (John Doe - the test/production employee)
  const empPass = bcryptjs.hashSync('Password@123', 10);
  db.prepare('INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run('usr_emp1', 'john.doe@mentneo.com', empPass, 'John Doe', 'EMPLOYEE', 'ACTIVE');

  db.prepare(`
    INSERT INTO employees (
      id, user_id, employee_code, first_name, last_name, email, phone, address,
      department_id, designation, manager_id, joining_date, employment_status, work_location
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'emp_john', 'usr_emp1', 'MNT-104', 'John', 'Doe', 'john.doe@mentneo.com', '+91 91234 56789',
    'Hitec City, Madhapur, Hyderabad, Telangana 500081',
    'dept_ai', 'Senior AI Engineer', 'emp_mgr', '2025-03-01', 'ACTIVE', 'Hyderabad HQ'
  );

  // 5. Additional Colleagues for Directory
  const colleagues = [
    { id: 'emp_priya', uid: 'usr_priya', code: 'MNT-102', first: 'Priya', last: 'Sharma', email: 'priya.sharma@mentneo.com', phone: '+91 98450 11223', dept: 'dept_prod', desig: 'Staff Product Manager', mgr: 'emp_mgr', date: '2025-02-01' },
    { id: 'emp_rajesh', uid: 'usr_rajesh', code: 'MNT-103', first: 'Rajesh', last: 'Kumar', email: 'rajesh.kumar@mentneo.com', phone: '+91 98110 33445', dept: 'dept_ai', desig: 'Lead Full Stack Engineer', mgr: 'emp_mgr', date: '2025-02-15' },
    { id: 'emp_sneha', uid: 'usr_sneha', code: 'MNT-105', first: 'Sneha', last: 'Patel', email: 'sneha.patel@mentneo.com', phone: '+91 98220 55667', dept: 'dept_hr', desig: 'Senior HR Business Partner', mgr: null, date: '2025-01-20' },
    { id: 'emp_amit', uid: 'usr_amit', code: 'MNT-106', first: 'Amit', last: 'Verma', email: 'amit.verma@mentneo.com', phone: '+91 98330 77889', dept: 'dept_ops', desig: 'Principal Cloud Architect', mgr: 'emp_mgr', date: '2025-02-10' }
  ];

  for (const c of colleagues) {
    db.prepare('INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(c.uid, c.email, empPass, `${c.first} ${c.last}`, 'EMPLOYEE', 'ACTIVE');
    db.prepare(`
      INSERT INTO employees (id, user_id, employee_code, first_name, last_name, email, phone, department_id, designation, manager_id, joining_date, employment_status, work_location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'Hyderabad HQ')
    `).run(c.id, c.uid, c.code, c.first, c.last, c.email, c.phone, c.dept, c.desig, c.mgr, c.date);
  }

  // 6. Leave Types & Balances
  const leaveTypes = [
    { id: 'lt_cl', name: 'Casual Leave (CL)', code: 'CL', days: 12, desc: 'Casual leaves for personal requirements' },
    { id: 'lt_sl', name: 'Sick Leave (SL)', code: 'SL', days: 12, desc: 'Medical leaves with doctor certification' },
    { id: 'lt_pl', name: 'Privilege Leave / PTO (PL)', code: 'PL', days: 15, desc: 'Annual earned paid leave for vacation' },
    { id: 'lt_ml', name: 'Parental / Maternity Leave', code: 'ML', days: 90, desc: 'Statutory parental care leave' }
  ];

  for (const lt of leaveTypes) {
    db.prepare('INSERT INTO leave_types (id, name, code, default_days, description) VALUES (?, ?, ?, ?, ?)')
      .run(lt.id, lt.name, lt.code, lt.days, lt.desc);

    // Assign balances to John Doe
    const used = lt.code === 'CL' ? 2 : (lt.code === 'SL' ? 1 : 0);
    const pending = lt.code === 'CL' ? 1 : 0;
    db.prepare(`
      INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_entitlement, used_days, pending_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`lb_${lt.id}_john`, 'emp_john', lt.id, currentYear, lt.days, used, pending);
  }

  // Sample approved leave record for history
  db.prepare(`
    INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, reviewed_by, review_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', 'emp_mgr', 'Approved. Enjoy your time off.', ?)
  `).run(
    'lr_hist_1', 'emp_john', 'lt_cl',
    '2026-08-10', '2026-08-11', 2, 'Personal family commitment',
    '2026-08-05T09:00:00Z'
  );

  // 7. Initial Tasks assigned to John Doe
  const tasks = [
    {
      id: 'task_101', code: 'TSK-2026-001', title: 'Implement Face Recognition Embedding Extraction Pipeline',
      desc: 'Build client-side 128-d vector embedding normalization and server validation for biometric attendance.',
      priority: 'HIGH', status: 'IN_PROGRESS', start: '2026-09-20', due: '2026-10-05', progress: 65, est: 40, act: 26
    },
    {
      id: 'task_102', code: 'TSK-2026-002', title: 'Optimize RAG Latency for Mentneo Customer AI Core',
      desc: 'Profile retrieval stages, add query decomposition caching and vector cosine indexing optimizations.',
      priority: 'URGENT', status: 'PENDING', start: '2026-09-25', due: '2026-10-02', progress: 20, est: 25, act: 5
    },
    {
      id: 'task_103', code: 'TSK-2026-003', title: 'Document Model Inference Benchmarks for Saadhyam AI',
      desc: 'Benchmark throughput, memory footprints, and token latency across quantized models on GPU clusters.',
      priority: 'MEDIUM', status: 'COMPLETED', start: '2026-09-10', due: '2026-09-22', progress: 100, est: 30, act: 28
    },
    {
      id: 'task_104', code: 'TSK-2026-004', title: 'Security Audit & RBAC Policy Hardening for Portal APIs',
      desc: 'Verify tenant scoping, IDOR prevention, token revocation headers, and audit trails.',
      priority: 'HIGH', status: 'IN_PROGRESS', start: '2026-09-22', due: '2026-10-10', progress: 50, est: 20, act: 10
    }
  ];

  for (const t of tasks) {
    db.prepare(`
      INSERT INTO tasks (
        id, task_code, title, description, assigned_to, created_by, priority, status,
        start_date, due_date, progress, estimated_hours, actual_hours, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(t.id, t.code, t.title, t.desc, 'emp_john', 'emp_mgr', t.priority, t.status, t.start, t.due, t.progress, t.est, t.act, t.start);

    // Initial activity logs for task
    db.prepare(`
      INSERT INTO task_activities (id, task_id, employee_id, activity_type, message, old_progress, new_progress, old_status, new_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`act_${t.id}_1`, t.id, 'emp_john', 'STATUS_CHANGE', 'Task initiated by engineer', 0, t.progress, 'PENDING', t.status, t.start);
  }

  // Comments for task_101
  db.prepare(`
    INSERT INTO task_comments (id, task_id, employee_id, comment, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('tcom_1', 'task_101', 'emp_mgr', 'Please ensure facial feature vectors are Euclidean normalized before Euclidean distance matching.', '2026-09-21T10:00:00Z');

  // 8. Performance Goals for John Doe
  const goals = [
    {
      id: 'goal_1', title: 'Lead Enterprise AI Feature Vector Architecture',
      desc: 'Deliver production face recognition and biometric verification with zero false rejects above 85% confidence.',
      target: 100, current: 80, unit: '%', progress: 80, status: 'IN_PROGRESS', start: '2026-07-01', end: '2026-12-31'
    },
    {
      id: 'goal_2', title: 'Publish 2 AI Research Whitepapers on Agentic Automation',
      desc: 'Draft and co-author technical whitepapers on multi-agent execution systems for Mentneo Research Lab.',
      target: 2, current: 1, unit: 'Papers', progress: 50, status: 'IN_PROGRESS', start: '2026-08-01', end: '2026-11-30'
    },
    {
      id: 'goal_3', title: 'Maintain 99.9% API Stability across Enterprise AI Services',
      desc: 'Ensure system latency remains below 120ms with automated health monitoring and stress tests.',
      target: 99.9, current: 99.95, unit: '%', progress: 100, status: 'COMPLETED', start: '2026-06-01', end: '2026-09-25'
    }
  ];

  for (const g of goals) {
    db.prepare(`
      INSERT INTO employee_goals (id, employee_id, title, description, target_value, current_value, unit, progress_percent, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(g.id, 'emp_john', g.title, g.desc, g.target, g.current, g.unit, g.progress, g.status, g.start, g.end);
  }

  // Performance Review Record
  db.prepare(`
    INSERT INTO performance_reviews (id, employee_id, review_period, reviewer_name, overall_rating, feedback, strengths, improvements, review_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pr_1', 'emp_john', 'H1 2026 Performance Review', 'Dr. Vikram Rao', 4.8,
    'Exceptional contribution to the autonomous agent engine. Demonstrated deep architectural rigor, clear ownership, and mentorship of junior developers.',
    'Fast prototyping, deep understanding of neural embeddings, high code quality and reliability.',
    'Continue driving architectural documentation and cross-team design syncs.',
    '2026-07-15'
  );

  // 9. Calendar Events (Company Holidays + Meetings)
  const holidays = [
    { title: 'New Year Day', date: `${currentYear}-01-01` },
    { title: 'Republic Day', date: `${currentYear}-01-26` },
    { title: 'Holi Festival', date: `${currentYear}-03-25` },
    { title: 'Eid-ul-Fitr', date: `${currentYear}-04-11` },
    { title: 'Independence Day', date: `${currentYear}-08-15` },
    { title: 'Gandhi Jayanti', date: `${currentYear}-10-02` },
    { title: 'Diwali Festival of Lights', date: `${currentYear}-11-01` },
    { title: 'Christmas Day', date: `${currentYear}-12-25` }
  ];

  for (const h of holidays) {
    db.prepare(`
      INSERT INTO calendar_events (id, title, event_type, start_date, end_date, is_all_day, description)
      VALUES (?, ?, 'HOLIDAY', ?, ?, 1, 'National / Corporate Holiday')
    `).run(`hol_${h.date}`, h.title, h.date, h.date);
  }

  // Sample team sprint meetings
  db.prepare(`
    INSERT INTO calendar_events (id, title, event_type, start_date, end_date, start_time, end_time, is_all_day, description, employee_id)
    VALUES (?, ?, 'MEETING', ?, ?, ?, ?, 0, ?, ?)
  `).run('meet_1', 'AI Engineering Architecture Sync', todayStr, todayStr, '11:00', '12:00', 'Weekly sync on multi-model pipelines and benchmarks', 'emp_john');

  // 10. Company Announcements
  const announcements = [
    {
      id: 'ann_1',
      title: 'Mentneo AI Lab Expands Compute Cluster Capacity',
      content: 'We are thrilled to announce the successful installation of our dedicated GPU cluster infrastructure in Hyderabad. Teams can now request high-memory compute nodes for large-scale training and agent evaluations.',
      author: 'Dr. Vikram Rao (Head of R&D)',
      dept: 'dept_ai',
      priority: 'IMPORTANT',
      published: '2026-09-20T09:00:00Z'
    },
    {
      id: 'ann_2',
      title: 'Annual Health & Wellness Checkup Camp - Next Week',
      content: 'The People & HR Operations team has organized comprehensive annual health and wellness checkups at our Hyderabad campus on October 5th. All full-time employees can book their complimentary slots.',
      author: 'Sneha Patel (HR Manager)',
      dept: 'dept_hr',
      priority: 'GENERAL',
      published: '2026-09-24T14:30:00Z'
    }
  ];

  for (const a of announcements) {
    db.prepare(`
      INSERT INTO announcements (id, title, content, author_name, department_id, priority, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(a.id, a.title, a.content, a.author, a.dept, a.priority, a.published);
  }

  // 11. Initial Notifications for John Doe
  const notifications = [
    {
      id: 'notif_1', title: 'New Task Assigned',
      message: 'Dr. Vikram Rao assigned you task TSK-2026-002: "Optimize RAG Latency for Mentneo Customer AI Core"',
      type: 'TASK', rel_type: 'task', rel_id: 'task_102', url: '/tasks'
    },
    {
      id: 'notif_2', title: 'Upcoming Task Deadline',
      message: 'Task TSK-2026-001 progress milestone deadline is approaching in 5 days.',
      type: 'DEADLINE', rel_type: 'task', rel_id: 'task_101', url: '/tasks'
    },
    {
      id: 'notif_3', title: 'Welcome to Mentneo Employee Portal',
      message: 'Explore your daily work log, attendance tracking, biometric face check-in, and leave management.',
      type: 'SYSTEM', rel_type: 'system', rel_id: 'portal', url: '/dashboard'
    }
  ];

  for (const n of notifications) {
    db.prepare(`
      INSERT INTO notifications (id, employee_id, title, message, type, related_entity_type, related_entity_id, is_read, link_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(n.id, 'emp_john', n.title, n.message, n.type, n.rel_type, n.rel_id, n.url);
  }

  // 12. Employee Documents for John Doe
  const docs = [
    { id: 'doc_1', name: 'Offer & Appointment Letter - Senior AI Engineer', type: 'APPOINTMENT_LETTER', path: '/documents/appointment_letter_john_doe.pdf', size: 245000 },
    { id: 'doc_2', name: 'Mentneo Corporate Code of Conduct & Ethics', type: 'COMPANY_POLICY', path: '/documents/mentneo_code_of_conduct.pdf', size: 520000 },
    { id: 'doc_3', name: 'Information Security & Data Protection Guidelines', type: 'SECURITY_POLICY', path: '/documents/infosec_policy_2026.pdf', size: 310000 },
    { id: 'doc_4', name: 'Employee Health & Medical Insurance Coverage', type: 'BENEFITS', path: '/documents/medical_insurance_policy.pdf', size: 180000 },
    { id: 'doc_5', name: 'Payslip - August 2026', type: 'PAYSLIP', path: '/documents/payslip_august_2026.pdf', size: 95000 }
  ];

  for (const d of docs) {
    db.prepare(`
      INSERT INTO employee_documents (id, employee_id, document_name, document_type, file_path, file_size, uploaded_by, status)
      VALUES (?, ?, ?, ?, ?, ?, 'HR Operations', 'VERIFIED')
    `).run(d.id, 'emp_john', d.name, d.type, d.path, d.size);
  }

  // 13. Sample Past Attendance for John Doe (Last 5 business days for rich history)
  const pastDates = [
    { date: '2026-09-22', inTime: '09:12 AM', outTime: '06:15 PM', workMin: 483, breakMin: 60, status: 'PRESENT', late: 0, early: 0 },
    { date: '2026-09-23', inTime: '09:05 AM', outTime: '06:05 PM', workMin: 480, breakMin: 60, status: 'PRESENT', late: 0, early: 0 },
    { date: '2026-09-24', inTime: '09:45 AM', outTime: '06:30 PM', workMin: 465, breakMin: 60, status: 'LATE', late: 1, early: 0 },
    { date: '2026-09-25', inTime: '09:00 AM', outTime: '05:45 PM', workMin: 465, breakMin: 60, status: 'PRESENT', late: 0, early: 1 },
    { date: '2026-09-26', inTime: null, outTime: null, workMin: 0, breakMin: 0, status: 'WEEK_OFF', late: 0, early: 0 },
    { date: '2026-09-27', inTime: null, outTime: null, workMin: 0, breakMin: 0, status: 'WEEK_OFF', late: 0, early: 0 }
  ];

  for (const p of pastDates) {
    db.prepare(`
      INSERT INTO attendance (id, employee_id, date, check_in, check_out, status, total_working_minutes, total_break_minutes, is_late, is_early, check_in_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'STANDARD')
    `).run(`att_${p.date}_john`, 'emp_john', p.date, p.inTime, p.outTime, p.status, p.workMin, p.breakMin, p.late, p.early);
  }

  // 14. Support Ticket
  db.prepare(`
    INSERT INTO support_tickets (id, ticket_code, employee_id, category, subject, description, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'tick_1', 'SUP-2026-042', 'emp_john', 'IT',
    'Request for additional GPU cluster memory quota',
    'Need 32GB VRAM allocation on the shared cluster node for evaluating quantized transformer models.',
    'MEDIUM', 'IN_PROGRESS'
  );

  db.prepare(`
    INSERT INTO support_ticket_messages (id, ticket_id, sender_id, sender_type, sender_name, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('tmsg_1', 'tick_1', 'emp_john', 'EMPLOYEE', 'John Doe', 'Initial ticket submitted with job specifications.');

  db.prepare(`
    INSERT INTO support_ticket_messages (id, ticket_id, sender_id, sender_type, sender_name, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('tmsg_2', 'tick_1', 'emp_amit', 'SUPPORT', 'Amit Verma (IT Admin)', 'Checking cluster node availability. Will allocate node-gpu-04 by end of day today.');

  console.log('Mentneo Database Initialized and Seeded successfully with real relational entities.');
}

export default db;
