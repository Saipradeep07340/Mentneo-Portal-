import psycopg
import bcrypt
import json
import uuid
from datetime import datetime, date, timedelta

DB_URL = "postgresql://neondb_owner:npg_oCRnT0Oi7eqd@ep-long-night-b4ssl9e9-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'EMPLOYEE',
    status TEXT DEFAULT 'ACTIVE',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    employee_code TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    designation TEXT NOT NULL,
    manager_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    joining_date DATE NOT NULL,
    employment_status TEXT DEFAULT 'ACTIVE',
    work_location TEXT DEFAULT 'Hyderabad HQ',
    avatar_url TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    pan_number TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS face_enrollments (
    id TEXT PRIMARY KEY,
    employee_id TEXT UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    template_data TEXT NOT NULL,
    model_version TEXT DEFAULT 'SFace_ArcFace_128d',
    quality_score REAL DEFAULT 0.95,
    sample_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS face_verification_logs (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    verified BOOLEAN NOT NULL,
    confidence_score REAL,
    distance REAL,
    liveness_score REAL,
    ip_address TEXT,
    device_info TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'PRESENT',
    attendance_method TEXT DEFAULT 'FACE_RECOGNITION',
    total_presence_minutes INTEGER DEFAULT 0,
    total_break_minutes INTEGER DEFAULT 0,
    net_work_minutes INTEGER DEFAULT 0,
    late_minutes INTEGER DEFAULT 0,
    early_departure_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    is_late BOOLEAN DEFAULT FALSE,
    is_early BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_breaks (
    id TEXT PRIMARY KEY,
    attendance_id TEXT REFERENCES attendance(id) ON DELETE CASCADE,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    break_start TIMESTAMP WITH TIME ZONE NOT NULL,
    break_end TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 0,
    reason TEXT DEFAULT 'Regular Break',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_corrections (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    requested_check_in TEXT,
    requested_check_out TEXT,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approver_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    approver_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_holidays (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT DEFAULT 'PUBLIC',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    quota_days INTEGER NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS employee_leave_balances (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id TEXT REFERENCES leave_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    total_days REAL NOT NULL,
    used_days REAL DEFAULT 0,
    available_days REAL NOT NULL,
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id TEXT REFERENCES leave_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count REAL NOT NULL,
    is_half_day BOOLEAN DEFAULT FALSE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approver_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_att_breaks_att_id ON attendance_breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_face_logs_emp ON face_verification_logs(employee_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_emp ON audit_logs(employee_id, created_at);
"""

def migrate():
    print("Connecting to Neon PostgreSQL...")
    conn = psycopg.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Executing database schema DDL...")
    cur.execute(SCHEMA_SQL)
    print("DDL executed successfully.")
    
    # Check if John Doe exists
    cur.execute("SELECT id FROM users WHERE email = %s", ("john.doe@mentneo.com",))
    user_row = cur.fetchone()
    
    if not user_row:
        print("Seeding initial corporate data...")
        dept_id = "dept_eng"
        cur.execute("""
            INSERT INTO departments (id, name, code, description)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (dept_id, "Artificial Intelligence & Systems", "AI_SYS", "Core AI reasoning, models, and agents."))
        
        # Hash password: Password@123
        hashed = bcrypt.hashpw(b"Password@123", bcrypt.gensalt(10)).decode('utf-8')
        user_id = "usr_john_001"
        cur.execute("""
            INSERT INTO users (id, email, password_hash, full_name, role, status, avatar_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (email) DO NOTHING
        """, (user_id, "john.doe@mentneo.com", hashed, "John Doe", "EMPLOYEE", "ACTIVE", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"))
        
        emp_id = "emp_john_001"
        cur.execute("""
            INSERT INTO employees (
                id, user_id, employee_code, first_name, last_name, email, phone, address,
                department_id, designation, joining_date, employment_status, work_location, avatar_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (employee_code) DO NOTHING
        """, (
            emp_id, user_id, "EMP-2024-001", "John", "Doe", "john.doe@mentneo.com",
            "+91 98765 43210", "102 MindSpace Tech Park, HITEC City, Hyderabad",
            dept_id, "Senior AI Engineer", date(2023, 3, 1), "ACTIVE", "Hyderabad HQ",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        ))
        
        # Insert Leave Types
        cur.execute("""
            INSERT INTO leave_types (id, name, code, quota_days, description)
            VALUES 
                ('lt_cl', 'Casual Leave', 'CL', 12, 'Annual casual leave allowance'),
                ('lt_sl', 'Sick Leave', 'SL', 10, 'Medical leave quota'),
                ('lt_el', 'Earned Leave', 'EL', 18, 'Privilege earned annual leave')
            ON CONFLICT (code) DO NOTHING
        """)
        
        # Insert Leave Balances for John Doe
        cur.execute("""
            INSERT INTO employee_leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, available_days)
            VALUES 
                ('bal_cl', 'emp_john_001', 'lt_cl', 2026, 12, 2, 10),
                ('bal_sl', 'emp_john_001', 'lt_sl', 2026, 10, 1, 9),
                ('bal_el', 'emp_john_001', 'lt_el', 2026, 18, 0, 18)
            ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING
        """)
        
        # Insert Company Holidays
        cur.execute("""
            INSERT INTO company_holidays (id, name, date, type, description)
            VALUES 
                ('hol_1', 'Republic Day', '2026-01-26', 'NATIONAL', 'National holiday celebration'),
                ('hol_2', 'Independence Day', '2026-08-15', 'NATIONAL', 'Indian Independence Day'),
                ('hol_3', 'Gandhi Jayanti', '2026-10-02', 'NATIONAL', 'Celebration of Mahatma Gandhi'),
                ('hol_4', 'Diwali Deepavali', '2026-11-08', 'FESTIVAL', 'Festival of lights')
            ON CONFLICT (id) DO NOTHING
        """)
        
        # Insert past attendance records for September 2026
        past_dates = [
            (date(2026, 9, 21), "2026-09-21 09:04:00+05:30", "2026-09-21 18:05:00+05:30", 541, 45, 496, 0, 0, 16, "PRESENT"),
            (date(2026, 9, 22), "2026-09-22 09:08:00+05:30", "2026-09-22 18:12:00+05:30", 544, 40, 504, 0, 0, 24, "PRESENT"),
            (date(2026, 9, 23), "2026-09-23 09:22:00+05:30", "2026-09-23 18:15:00+05:30", 533, 45, 488, 7, 0, 8, "LATE"),
            (date(2026, 9, 24), "2026-09-24 08:58:00+05:30", "2026-09-24 18:00:00+05:30", 542, 50, 492, 0, 0, 12, "PRESENT"),
            (date(2026, 9, 25), "2026-09-25 09:02:00+05:30", "2026-09-25 18:20:00+05:30", 558, 45, 513, 0, 0, 33, "PRESENT")
        ]
        
        for d, ci, co, pres, brk, net, late, early, ot, st in past_dates:
            att_id = f"att_{d.strftime('%Y%m%d')}"
            cur.execute("""
                INSERT INTO attendance (
                    id, employee_id, date, check_in, check_out, total_presence_minutes,
                    total_break_minutes, net_work_minutes, late_minutes, early_departure_minutes,
                    overtime_minutes, is_late, is_early, status, attendance_method
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'FACE_RECOGNITION')
                ON CONFLICT (employee_id, date) DO NOTHING
            """, (
                att_id, emp_id, d, ci, co, pres, brk, net, late, early, ot, late > 0, early > 0, st
            ))
            
        print("Initial seed data inserted successfully.")
    else:
        print("Database already seeded.")
        
    conn.close()

if __name__ == "__main__":
    migrate()
