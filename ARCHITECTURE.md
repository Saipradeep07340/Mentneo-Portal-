# System Architecture Overview

## Application Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     MENTNEO CAREERS SYSTEM                  │
└─────────────────────────────────────────────────────────────┘

                          FRONTEND (React)
                    ┌──────────────────────────┐
                    │   http://localhost:5173  │
                    └────────┬─────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    ┌─────────┐         ┌──────────┐        ┌──────────┐
    │  Home   │         │ Careers  │        │  Admin   │
    │  Page   │         │   Page   │        │  Portal  │
    └────┬────┘         └────┬─────┘        └────┬─────┘
         │                   │                   │
         │            ┌──────▼─────────┐        │
         │            │  Job Listings  │        │
         │            │  (Filter/Search)       │
         │            └──────┬─────────┘        │
         │                   │                  │
         │            ┌──────▼──────────┐       │
         │            │ Job Application │       │
         │            │   Modal Form    │       │
         │            └──────┬──────────┘       │
         │                   │                  │
         │          ┌────────▼────────┐        ┌────────┐
         │          │  Form Validation │        │ Login  │
         │          │  & Resume Upload │        │ Page   │
         │          └────────┬────────┘        └───┬────┘
         │                   │                    │
         │          ┌────────▼─────────┐         │
         │          │ Submit Application           │
         │          └────────┬─────────┘         │
         │                   │                  │
         └───────────────────┼──────────────────┘
                             │
                    ┌────────▼──────────┐
                    │   HTTP Requests   │
                    │   (JSON/FormData) │
                    └────────┬──────────┘
                             │
                             ▼
                    BACKEND (Node.js/Express)
                    ┌──────────────────────────┐
                    │ http://localhost:5000    │
                    └────────┬─────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌──────────┐         ┌──────────┐        ┌──────────┐
   │ Research │         │ Careers  │        │  Admin   │
   │ Endpoints│         │ Endpoints│        │Endpoints │
   └──────────┘         └────┬─────┘        └────┬─────┘
                             │                   │
                ┌────────────┴───────────────────┼────────┐
                │                                │        │
                ▼                                ▼        ▼
          ┌──────────────┐             ┌────────────┐  ┌──────────┐
          │ File Upload  │             │ JWT Auth   │  │ Database │
          │ Handler      │             │ Middleware │  │ Queries  │
          │ (Multer)     │             └────────────┘  └────┬─────┘
          └──────┬───────┘                                   │
                 │                                           │
                 ▼                      ┌────────────────────┼────────────┐
          ┌─────────────┐               │                    │            │
          │ Supabase    │               ▼                    ▼            ▼
          │ Storage     │          ┌──────────┐      ┌────────────┐  ┌──────────┐
          │ (Resumes)   │          │   Jobs   │      │ Applications  │Jobs(Mgmt)│
          └─────────────┘          │ (Table)  │      │ (Table)       │ (Ops)    │
                                   └──────────┘      └────────────┘  └──────────┘
                                        │                    │
                                        └────────┬───────────┘
                                                 │
                                        ┌────────▼─────────┐
                                        │   PostgreSQL     │
                                        │   Database       │
                                        │  (Supabase)      │
                                        └──────────────────┘
```

## Data Flow - Application Submission

```
CANDIDATE SUBMITS APPLICATION
            │
            ▼
    Form Validation
    (Client-side)
            │
            ├─ Email format? ✓
            ├─ Phone valid? ✓
            ├─ Resume attached? ✓
            └─ File type OK? ✓
            │
            ▼
    POST /api/careers/apply
    ├─ Form Data
    ├─ Resume File
    └─ Job Position ID
            │
            ▼
        BACKEND
            │
            ├─ Validate again (server-side)
            ├─ Check file (size, type)
            ├─ Generate unique ID: APP-2026-00001
            └─ Upload resume to Supabase Storage
            │
            ▼
    Save to Database
    ├─ job_applications table
    │  ├─ Application ID
    │  ├─ Candidate info
    │  ├─ Resume URL
    │  ├─ Submission date
    │  └─ Status: "New"
    └─ Supabase Storage
       └─ Resume file (private)
            │
            ▼
    Return Success Response
    ├─ Application ID
    ├─ Success message
    └─ Next steps
            │
            ▼
        FRONTEND
            │
            ├─ Show Success Modal
            ├─ Display Application ID
            └─ Show next steps
            │
            ▼
    ADMIN NOTIFIED
    (Ready to configure)
```

## Data Flow - Admin Application Review

```
ADMIN ACCESSES DASHBOARD
            │
            ▼
    /admin route
            │
            ├─ Logged in? ─No─> Redirect to login
            └─ Yes
            │
            ▼
    POST /api/admin/login
    ├─ Email
    └─ Password
            │
            ▼
    Supabase Auth
    ├─ Validate credentials
    └─ Generate JWT token
            │
            ▼
    Return token to frontend
    ├─ Store in localStorage
    └─ Authenticated
            │
            ▼
    GET /api/admin/dashboard
    (with JWT token)
            │
            ├─ Authorization check
            ├─ Query job_applications table
            ├─ Count by status
            └─ Return statistics
            │
            ▼
    Display Dashboard
    ├─ Total applications
    ├─ Applications by status
    └─ Applications table
            │
            ▼
    Admin clicks on application
            │
            ▼
    GET /api/admin/applications/:id
    (with JWT token)
            │
            ├─ Authorization check
            ├─ Fetch from database
            ├─ Get resume URL
            └─ Return application details
            │
            ▼
    Show Application Detail Modal
    ├─ Candidate info
    ├─ Resume download link
    ├─ Current status
    └─ Notes field
            │
            ▼
    Admin updates status
    (e.g., New → Under Review)
            │
            ▼
    PUT /api/admin/applications/:id/status
    ├─ New status
    ├─ Admin notes
    └─ JWT token
            │
            ▼
    Backend Update
    ├─ Update job_applications table
    ├─ Insert into application_status_history
    │  ├─ Old status
    │  ├─ New status
    │  ├─ Changed by (email)
    │  └─ Timestamp
    └─ Save admin notes
            │
            ▼
    Return success response
            │
            ▼
    Refresh admin dashboard
    ├─ Show updated status
    └─ Show updated statistics
```

## Component Architecture

```
App
├── Router (React Router)
    ├── Route: "/"
    │   └── HomePage
    │       └── Home page (existing)
    │
    ├── Route: "/careers"
    │   └── CareersPage
    │       ├── State: jobs, filters, selectedJob
    │       ├── Effects: fetch jobs on mount
    │       ├── Render: Hero + Filters + JobGrid
    │       ├── JobCard
    │       │   ├── Display: title, dept, location, skills
    │       │   └── Action: "Apply Now" button
    │       └── ApplicationModal (conditional)
    │           ├── State: formData, resume, errors
    │           ├── Sections:
    │           │   ├─ Personal Info
    │           │   ├─ Professional Info
    │           │   ├─ Profile Links
    │           │   └─ Documents
    │           ├── Validation: real-time
    │           ├── File Upload: resume selection
    │           └── Submit: POST to /api/careers/apply
    │
    └── Route: "/admin"
        ├── If authenticated
        │   └── AdminDashboard
        │       ├── State: applications, jobs, stats, auth
        │       ├── Tabs: Applications | Jobs
        │       ├── Applications Tab
        │       │   ├── Stats: total, new, shortlisted, etc.
        │       │   ├── Filters: status, search
        │       │   ├── Table: applications list
        │       │   └── Actions: view, delete
        │       ├── Jobs Tab
        │       │   ├── List: all jobs
        │       │   └── Actions: add, edit, delete
        │       └── ApplicationDetail Modal
        │           ├── Display: full candidate info
        │           ├── Status update: dropdown
        │           ├── Notes: textarea
        │           ├── Resume: download button
        │           └── Save: update status
        │
        └── If not authenticated
            └── AdminLogin
                ├── State: email, password, loading, error
                ├── Form: email field, password field
                ├── Submit: POST to /api/admin/login
                └── Success: store token, redirect to dashboard
```

## Database Schema Relationships

```
jobs
├── id (PK)
├── title
├── department
├── location
├── employment_type
├── experience_required
├── description
├── required_skills (array)
├── responsibilities (array)
├── qualifications (array)
├── salary
├── published (boolean)
├── application_deadline
├── created_at
├── updated_at
└─┬─ Has many ──────────────────┐
  │                              │
  │                       ┌──────▼──────────┐
  │                       │ job_applications │
  │                       ├──────────────────┤
  │                       │ id (PK)          │
  │                       │ application_id   │
  │                       │ position_id (FK) │◄─── Foreign Key
  │                       │ full_name        │
  │                       │ email            │
  │                       │ mobile           │
  │                       │ location         │
  │                       │ qualification    │
  │                       │ experience       │
  │                       │ current_company  │
  │                       │ skills (array)   │
  │                       │ linkedin_profile │
  │                       │ portfolio_url    │
  │                       │ resume_url       │
  │                       │ message          │
  │                       │ status           │
  │                       │ admin_notes      │
  │                       │ submission_date  │
  │                       │ created_at       │
  │                       │ updated_at       │
  │                       └──────┬───────────┘
  │                              │
  │                              ├─┬─ Has many ──────────────────┐
  │                              │ │                             │
  └──────────────────────────────┘ │      ┌──────────────────────▼────────┐
                                    │      │application_status_history    │
                                    │      ├─────────────────────────────┤
                                    │      │ id (PK)                     │
                                    │      │ application_id (FK)         │
                                    │      │ old_status                  │
                                    │      │ new_status                  │
                                    │      │ changed_by (email)          │
                                    │      │ changed_at (timestamp)      │
                                    │      └─────────────────────────────┘
                                    │
                                    └─┬─────────────────────────────────┐
                                      │                                 │
                                      └─ Files stored in Supabase Storage
                                         └─ Bucket: "applications"
                                            └─ Path: "resumes/[appid]-[timestamp]-[filename]"
```

## Authentication Flow

```
┌──────────────────────────────────┐
│   ADMIN LOGIN PAGE               │
│  (http://localhost:5173/admin)   │
└───────────┬──────────────────────┘
            │
            ├─ Input: email & password
            └─ Click: "Login"
                    │
                    ▼
        ┌─────────────────────────────┐
        │   POST /api/admin/login     │
        │   Body: { email, password } │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  Supabase Auth Service   │
        ├──────────────────────────┤
        │ 1. Lookup user by email  │
        │ 2. Verify password       │
        │ 3. Generate JWT token    │
        └──────────┬───────────────┘
                   │
                   ├─ Success
                   │   └─> JWT token + user info
                   │
                   └─ Failure
                       └─> Error message
                   │
                   ▼
        ┌──────────────────────────┐
        │  FRONTEND                │
        ├──────────────────────────┤
        │ 1. Receive JWT token     │
        │ 2. Store in localStorage │
        │ 3. Redirect to dashboard │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │   ADMIN DASHBOARD        │
        │   (with JWT token)       │
        ├──────────────────────────┤
        │ All future API calls     │
        │ include JWT in header:   │
        │ Authorization: Bearer... │
        └──────────────────────────┘
                   │
                   ├─ Session valid? ─Yes─> Show dashboard
                   └─ Session expired? ─> Redirect to login
```

## Security Architecture

```
REQUEST FROM CLIENT
        │
        ▼
    BACKEND (Express)
        │
        ├─ CORS Check ─────────────────> Verify origin
        │
        ├─ Route Analysis ──────────────> Public or Admin?
        │
        ├─ For Admin Routes:
        │   │
        │   ├─ Extract JWT from header
        │   │
        │   ├─ Validate JWT ──────────────┐
        │   │   ├─ Signature valid?       │
        │   │   ├─ Not expired?           │ JWT Middleware
        │   │   └─ User exists?           │
        │   │                             │
        │   └─ Invalid ──> Return 401    │
        │       Valid ──> Continue ──────┘
        │
        ├─ Input Validation
        │   ├─ Email format
        │   ├─ Required fields
        │   ├─ File type & size
        │   └─ SQL injection prevention
        │
        ├─ Database Query
        │   ├─ Parameterized queries
        │   ├─ Row Level Security
        │   └─ Audit trail
        │
        └─ Response
            ├─ Validate data
            ├─ Never expose secrets
            └─ Return to client
```

## Deployment Architecture (Future)

```
                    ┌─────────────────┐
                    │  Custom Domain  │
                    │  (mentneo.com)  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    ┌──────────┐      ┌─────────────┐      ┌──────────┐
    │  CDN     │      │  API Server │      │ Database │
    │ (Static) │      │  (Node.js)  │      │(Supabase)│
    ├──────────┤      ├─────────────┤      ├──────────┤
    │ Vercel / │      │  Railway /  │      │ Managed  │
    │ Netlify  │      │  Heroku     │      │Postgres  │
    └──────────┘      └─────────────┘      └──────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  Supabase        │
                    │  - Database      │
                    │  - Auth          │
                    │  - Storage       │
                    └──────────────────┘
```

---

This architecture ensures:
- ✅ Scalability
- ✅ Security
- ✅ Performance
- ✅ Maintainability
- ✅ User experience

**Ready to deploy!**
