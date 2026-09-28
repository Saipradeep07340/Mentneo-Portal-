# Mentneo Careers & Job Application System - Setup Guide

## Overview
A professional, modern careers portal with job listings, candidate applications, resume uploads, and an admin dashboard for recruitment management. The system is fully functional and ready for deployment.

---

## Quick Start Checklist

- [ ] Set up Supabase project
- [ ] Configure database schema
- [ ] Set environment variables
- [ ] Install backend dependencies
- [ ] Install frontend dependencies
- [ ] Run the project
- [ ] Create sample admin account
- [ ] Test the full application flow

---

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: Mentneo Careers
   - **Database Password**: Create a strong password
   - **Region**: Select closest to your location
4. Wait for project creation (2-3 minutes)

### 1.2 Get Your Credentials
After project creation:
1. Go to Settings → API
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_KEY`
3. Store these securely - you'll need them for environment variables

### 1.3 Configure Storage Bucket
1. Go to Storage in Supabase dashboard
2. Click "Create a new bucket"
3. **Bucket name**: `applications`
4. **Privacy**: Make it private (to protect resumes)
5. Click Create

---

## Step 2: Database Schema Setup

### 2.1 Run SQL Schema
1. In Supabase dashboard, go to SQL Editor
2. Click "New Query"
3. Copy entire contents of `database_schema.sql` from the project root
4. Paste into the SQL Editor
5. Click "Run" button
6. Wait for successful execution ✓

This creates:
- `jobs` table
- `job_applications` table  
- `application_status_history` table
- `admin_users` table (optional)
- Indexes for performance
- Row Level Security policies
- Sample job listings

---

## Step 3: Environment Configuration

### 3.1 Server Environment (.env)
Create or update `server/.env`:

```env
# Server Configuration
PORT=5000
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
CLIENT_URL=http://localhost:5173

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# JWT Configuration (min 32 characters)
JWT_SECRET=your-jwt-secret-key-min-32-characters

# Email Configuration (Optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
ADMIN_EMAIL=admin@mentneo.com
```

**Important**: 
- Replace with your actual Supabase credentials
- Keep `JWT_SECRET` private and strong
- Email settings are optional for initial testing

### 3.2 Client Environment
Create `client/.env` (if needed):

```env
VITE_API_URL=http://localhost:5000
```

---

## Step 4: Install Dependencies

### Backend Dependencies
```powershell
cd server
# Using the local Node.js:
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
npm install
```

### Frontend Dependencies
```powershell
cd client
# Using the local Node.js:
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
npm install
```

---

## Step 5: Run the Project

### Terminal 1 - Backend Server
```powershell
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
cd c:\Users\DELL\Mentneo\server
node server.js
# Expected output: "Mentneo server running on http://localhost:5000"
```

### Terminal 2 - Frontend Dev Server
```powershell
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
cd c:\Users\DELL\Mentneo\client
npm run dev
# Expected output: "Local: http://localhost:5173"
```

### Access the Application
- **Main Website**: http://localhost:5173
- **Careers Page**: http://localhost:5173/careers
- **Admin Portal**: http://localhost:5173/admin

---

## Step 6: Create Admin Account

### Option 1: Via Supabase Auth (Recommended)
1. Go to Supabase Dashboard
2. Go to Authentication → Users
3. Click "Add user" (or invite)
4. Enter email and password
5. User is now created and can login at `/admin`

### Option 2: Via Database
Insert admin user directly:
```sql
INSERT INTO admin_users (email, password_hash, full_name, role)
VALUES ('admin@mentneo.com', crypt('password123', gen_salt('bf')), 'Admin', 'admin');
```

---

## Step 7: System Features

### Public Features
- **Careers Page** (`/careers`):
  - View all published jobs
  - Filter by department and location
  - View detailed job information
  - Apply for jobs with validated form

- **Application Form**:
  - Personal information (name, email, mobile)
  - Professional details (experience, qualification)
  - Profile links (LinkedIn, GitHub)
  - Resume upload (PDF, DOC, DOCX - max 10MB)
  - Cover letter
  - Form validation
  - Success screen with Application ID

### Admin Features
- **Admin Portal** (`/admin`):
  - Secure email/password login
  - Dashboard with statistics
  - Applications management
  - Job management
  - Status tracking and updates
  - Resume downloads
  - Internal notes
  - Bulk actions

- **Application Tracking**:
  - Unique Application IDs (e.g., APP-2026-00001)
  - Status workflow: New → Under Review → Shortlisted → Interview Scheduled → Selected/Rejected
  - Status history tracking
  - Admin notes for each application
  - Search and filter capabilities

---

## Step 8: Test the Full Flow

### Test Scenario 1: Submit Application
1. Go to http://localhost:5173/careers
2. Click on any job card "Apply Now"
3. Fill in the form with test data:
   - Name: John Doe
   - Email: john@example.com
   - Mobile: 9876543210
   - Qualification: Bachelor's Degree
   - Experience: 2-5 years
   - Upload a PDF resume
4. Click "Submit Application"
5. Should see success screen with Application ID
6. **Verify in Database**:
   - Go to Supabase → Tables → job_applications
   - Check application is saved
   - Resume file exists in Storage → applications bucket

### Test Scenario 2: Admin Dashboard
1. Go to http://localhost:5173/admin
2. Login with your admin credentials
3. Should see dashboard with stats
4. Click on "Applications" tab
5. View the application you just created
6. Click "View" to see full details
7. Update status to "Under Review"
8. Add admin notes
9. Click "Update Status & Notes"
10. **Verify**: Application status changed in database

### Test Scenario 3: Job Management
1. In Admin Dashboard, click "Jobs" tab
2. See all jobs (published and draft)
3. Try to add a new job (if button is enabled)
4. Edit existing job
5. Toggle publish/unpublish status

---

## API Endpoints Reference

### Public Endpoints
- `GET /api/careers/jobs` - List all published jobs
- `GET /api/careers/jobs/:id` - Get single job details
- `POST /api/careers/apply` - Submit application with resume

### Admin Endpoints (require authentication token)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/applications` - List all applications
- `GET /api/admin/applications/:id` - Get application details
- `PUT /api/admin/applications/:id/status` - Update application status
- `DELETE /api/admin/applications/:id` - Delete application
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/jobs` - List all jobs (including unpublished)
- `POST /api/admin/jobs` - Create new job
- `PUT /api/admin/jobs/:id` - Update job
- `DELETE /api/admin/jobs/:id` - Delete job

---

## File Structure

```
mentneo/
├── server/
│   ├── server.js (Backend API endpoints)
│   ├── package.json
│   ├── .env (Your Supabase credentials)
│   └── .env.example
│
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CareersPage.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── components/
│   │   │   ├── JobCard.jsx
│   │   │   └── ApplicationModal.jsx
│   │   ├── styles/
│   │   │   ├── CareersPage.css
│   │   │   ├── JobCard.css
│   │   │   ├── ApplicationModal.css
│   │   │   ├── AdminLogin.css
│   │   │   └── AdminDashboard.css
│   │   ├── main.jsx (App with routing)
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.js
│
└── database_schema.sql (Database setup)
```

---

## Customization

### Add/Edit Jobs
1. Go to Admin Dashboard
2. Click "Jobs" tab
3. Edit existing or add new job
4. Set all details (title, department, skills, etc.)
5. Toggle "Publish" to make visible on careers page

### Customize Form Fields
Edit `client/src/components/ApplicationModal.jsx`:
- Add/remove form fields
- Update validation rules
- Modify field labels

### Change Styling
Edit CSS files in `client/src/styles/`:
- Update colors in gradient definitions
- Modify spacing and sizes
- Change responsive breakpoints

### Configure Email Notifications
Set environment variables in `server/.env`:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

---

## Troubleshooting

### Issue: "Cannot find module @supabase/supabase-js"
**Solution**: Run `npm install` in the server directory

### Issue: "SUPABASE_URL not found"
**Solution**: Check that `.env` file exists in `server/` directory with correct credentials

### Issue: "Failed to upload resume"
**Solution**: 
- Check that storage bucket "applications" exists in Supabase
- Verify bucket is private
- Check file size is under 10MB
- Check file format is PDF, DOC, or DOCX

### Issue: Admin login fails
**Solution**:
- Verify user exists in Supabase → Authentication → Users
- Check email and password are correct
- Ensure JWT_SECRET is set in .env

### Issue: Careers page not loading
**Solution**:
- Check backend is running on port 5000
- Verify SUPABASE_URL and SUPABASE_KEY are correct
- Check browser console for errors

---

## Security Checklist

- ✓ Never commit `.env` files with credentials
- ✓ Use strong JWT_SECRET (min 32 characters)
- ✓ Keep storage bucket private
- ✓ Enable Row Level Security (enabled by default)
- ✓ Validate all form inputs (done)
- ✓ Use HTTPS in production
- ✓ Implement rate limiting for APIs
- ✓ Regular security audits

---

## Next Steps

1. **Production Deployment**:
   - Deploy backend to Heroku, Railway, or AWS
   - Deploy frontend to Vercel, Netlify, or GitHub Pages
   - Update CORS and environment variables for production URLs

2. **Email Notifications**:
   - Configure email service (Gmail, SendGrid, etc.)
   - Send confirmation emails to candidates
   - Send notifications to admin team

3. **Advanced Features**:
   - Add interview scheduling
   - Implement candidate communication system
   - Add offer management
   - Create analytics dashboard

4. **Testing**:
   - Unit tests for components
   - Integration tests for API
   - E2E tests with Cypress or Playwright

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Check server logs for backend errors
5. Contact support team

---

**Created**: 2026-08-24
**Version**: 1.0.0
**Status**: Production Ready
