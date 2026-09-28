-- Mentneo Careers & Job Application System Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Create jobs table
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  employment_type TEXT,
  experience_required TEXT,
  description TEXT,
  required_skills TEXT[] DEFAULT '{}',
  responsibilities TEXT[] DEFAULT '{}',
  qualifications TEXT[] DEFAULT '{}',
  salary TEXT,
  published BOOLEAN DEFAULT false,
  application_deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create job_applications table
CREATE TABLE job_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id TEXT UNIQUE NOT NULL,
  position_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  location TEXT,
  qualification TEXT,
  experience TEXT,
  current_company TEXT,
  skills TEXT[] DEFAULT '{}',
  linkedin_profile TEXT,
  portfolio_url TEXT,
  resume_url TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected')),
  admin_notes TEXT,
  submission_date TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create application_status_history table
CREATE TABLE application_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_by TEXT,
  changed_at TIMESTAMP DEFAULT now()
);

-- Create admin_users table (optional - for admin management)
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_jobs_published ON jobs(published);
CREATE INDEX idx_jobs_department ON jobs(department);
CREATE INDEX idx_applications_status ON job_applications(status);
CREATE INDEX idx_applications_position ON job_applications(position_id);
CREATE INDEX idx_applications_email ON job_applications(email);
CREATE INDEX idx_status_history_application ON application_status_history(application_id);

-- Enable Row Level Security (RLS)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs (public read for published jobs)
CREATE POLICY "Public can read published jobs"
  ON jobs
  FOR SELECT
  TO public
  USING (published = true);

CREATE POLICY "Admin can read all jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for job_applications (public can insert, admin can read/update)
CREATE POLICY "Public can insert applications"
  ON job_applications
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admin can read all applications"
  ON job_applications
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update applications"
  ON job_applications
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create storage bucket for resumes
-- Run this separately in Storage section:
-- Bucket name: 'applications'
-- Public: false

-- Insert sample jobs (optional)
INSERT INTO jobs (title, department, location, employment_type, experience_required, description, required_skills, responsibilities, qualifications, salary, published)
VALUES
  (
    'Senior AI Engineer',
    'Research',
    'Remote',
    'Full-time',
    '5+ years',
    'We are looking for a Senior AI Engineer to lead our AI research initiatives. You will work on cutting-edge machine learning models, autonomous agents, and AI infrastructure.',
    ARRAY['Python', 'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'LLMs'],
    ARRAY['Design and implement AI models and algorithms', 'Lead AI research projects', 'Collaborate with cross-functional teams', 'Mentor junior engineers'],
    ARRAY['Bachelor''s degree in Computer Science or related field', 'Strong Python programming skills', 'Experience with ML frameworks', 'Published research or open-source contributions'],
    '₹40,00,000 - ₹60,00,000',
    true
  ),
  (
    'Full Stack Developer',
    'Engineering',
    'Remote',
    'Full-time',
    '3+ years',
    'Join our engineering team to build scalable web applications and AI-powered platforms. You''ll work with modern technologies and collaborate with talented engineers.',
    ARRAY['JavaScript', 'React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker'],
    ARRAY['Develop full-stack web applications', 'Design and implement APIs', 'Optimize application performance', 'Participate in code reviews'],
    ARRAY['Bachelor''s degree in Computer Science or equivalent', 'Experience with React and Node.js', 'Understanding of database design', 'Strong problem-solving skills'],
    '₹25,00,000 - ₹40,00,000',
    true
  ),
  (
    'Data Analyst',
    'Analytics',
    'Bangalore',
    'Full-time',
    '2+ years',
    'We are seeking a Data Analyst to help us derive insights from large datasets and support data-driven decision making.',
    ARRAY['SQL', 'Python', 'Data Visualization', 'Tableau', 'Excel', 'Statistics'],
    ARRAY['Analyze complex datasets', 'Create data visualizations and dashboards', 'Generate reports and insights', 'Support business analytics'],
    ARRAY['Bachelor''s degree in Statistics, Mathematics, or related field', 'Proficiency in SQL', 'Experience with Python or R', 'Strong analytical skills'],
    '₹15,00,000 - ₹25,00,000',
    true
  ),
  (
    'Marketing Executive',
    'Marketing',
    'Bangalore',
    'Full-time',
    '1+ years',
    'Help us promote our AI research and products. You''ll develop marketing strategies, manage social media, and create compelling content.',
    ARRAY['Content Writing', 'Social Media Marketing', 'Digital Marketing', 'SEO', 'Analytics', 'Communication'],
    ARRAY['Develop marketing campaigns', 'Create and manage social media content', 'Analyze marketing metrics', 'Collaborate with product teams'],
    ARRAY['Bachelor''s degree in Marketing or Communications', 'Experience with digital marketing', 'Strong writing and communication skills'],
    '₹12,00,000 - ₹18,00,000',
    true
  );

-- ==================== EMPLOYEE PORTAL SCHEMA ====================

CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'EMPLOYEE',
  status TEXT DEFAULT 'ACTIVE',
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  employee_code TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  designation TEXT NOT NULL,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  joining_date DATE NOT NULL,
  employment_status TEXT DEFAULT 'ACTIVE',
  work_location TEXT DEFAULT 'Hyderabad HQ',
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS face_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  template_data TEXT NOT NULL,
  algorithm TEXT DEFAULT 'MentneoFaceVector128',
  quality_score REAL DEFAULT 0.95,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT DEFAULT 'PRESENT',
  total_working_minutes INTEGER DEFAULT 0,
  total_break_minutes INTEGER DEFAULT 0,
  is_late BOOLEAN DEFAULT false,
  is_early BOOLEAN DEFAULT false,
  check_in_method TEXT DEFAULT 'STANDARD',
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_breaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes INTEGER DEFAULT 0,
  reason TEXT DEFAULT 'Break',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES attendance(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  existing_check_in TEXT,
  existing_check_out TEXT,
  requested_check_in TEXT NOT NULL,
  requested_check_out TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES employees(id) ON DELETE CASCADE,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'PENDING',
  start_date DATE,
  due_date DATE NOT NULL,
  progress INTEGER DEFAULT 0,
  estimated_hours REAL DEFAULT 0,
  actual_hours REAL DEFAULT 0,
  blocker_note TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  message TEXT NOT NULL,
  old_progress INTEGER,
  new_progress INTEGER,
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  hours_spent REAL NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  challenges TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  accomplishments TEXT NOT NULL,
  work_in_progress TEXT,
  blockers TEXT,
  tomorrow_plan TEXT,
  additional_notes TEXT,
  status TEXT DEFAULT 'DRAFT',
  submitted_at TIMESTAMP,
  reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  review_feedback TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS leave_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  default_days REAL NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_entitlement REAL NOT NULL,
  used_days REAL DEFAULT 0,
  pending_days REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count REAL NOT NULL,
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  description TEXT,
  location TEXT,
  is_all_day BOOLEAN DEFAULT true,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  link_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'GENERAL',
  attachment_name TEXT,
  attachment_url TEXT,
  published_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT 'application/pdf',
  uploaded_by TEXT DEFAULT 'HR Department',
  status TEXT DEFAULT 'VERIFIED',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value REAL DEFAULT 100,
  current_value REAL DEFAULT 0,
  unit TEXT DEFAULT '%',
  progress_percent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'IN_PROGRESS',
  start_date DATE,
  end_date DATE,
  manager_notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  review_period TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  overall_rating REAL NOT NULL,
  feedback TEXT NOT NULL,
  strengths TEXT,
  improvements TEXT,
  review_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_code TEXT UNIQUE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'OPEN',
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  sender_type TEXT DEFAULT 'EMPLOYEE',
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

