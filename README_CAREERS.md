# 🚀 Mentneo Professional Careers & Job Application System

A complete, production-ready careers portal with job listings, candidate applications, professional admin dashboard, and recruitment management system.

## ✨ What's Inside

### For Candidates
- **Professional Careers Portal**: Browse and apply for job opportunities
- **Advanced Job Search**: Filter by department and location
- **Application Form**: Comprehensive form with validation
- **Resume Upload**: Secure upload to Supabase Storage
- **Unique Application Tracking**: Get unique Application ID
- **Success Confirmation**: Professional success message

### For Administrators
- **Secure Login Portal**: Email and password authentication
- **Admin Dashboard**: View statistics and manage applications
- **Application Management**: Full application lifecycle management
- **Status Tracking**: Track applications from New → Selected/Rejected
- **Resume Downloads**: Download candidate resumes anytime
- **Job Management**: Add, edit, publish/unpublish jobs
- **Search & Filter**: Find applications quickly

## 🎯 Key Features

✅ **Modern, Professional UI**: Glassmorphism design with gradients
✅ **Fully Responsive**: Works on desktop, tablet, and mobile
✅ **Form Validation**: Client & server-side validation
✅ **Secure File Upload**: Private Supabase Storage
✅ **Status Tracking**: Complete application status history
✅ **Admin Dashboard**: Full recruitment management
✅ **Database**: PostgreSQL with Row Level Security
✅ **API**: RESTful API with JWT authentication
✅ **Production Ready**: Security best practices implemented

## 📁 Project Structure

```
mentneo/
├── 📄 QUICK_START.md                    # Start here! (5 min setup)
├── 📄 CAREERS_SETUP_GUIDE.md            # Detailed setup instructions
├── 📄 IMPLEMENTATION_SUMMARY.md         # What's been built
├── 📄 REQUIREMENTS_CHECKLIST.md         # Requirement fulfillment
├── 📄 database_schema.sql               # Database schema (run in Supabase)
│
├── server/                              # Backend (Node.js + Express)
│   ├── server.js                        # API endpoints
│   ├── package.json                     # Dependencies
│   ├── .env.example                     # Environment template
│   └── .env                             # Your Supabase credentials (create this)
│
└── client/                              # Frontend (React + Vite)
    ├── src/
    │   ├── pages/
    │   │   ├── CareersPage.jsx          # Careers listing page
    │   │   ├── AdminLogin.jsx           # Admin login page
    │   │   └── AdminDashboard.jsx       # Admin management dashboard
    │   ├── components/
    │   │   ├── JobCard.jsx              # Individual job card
    │   │   └── ApplicationModal.jsx     # Application form modal
    │   ├── styles/
    │   │   ├── CareersPage.css
    │   │   ├── JobCard.css
    │   │   ├── ApplicationModal.css
    │   │   ├── AdminLogin.css
    │   │   └── AdminDashboard.css
    │   └── main.jsx                     # App with routing
    ├── package.json
    └── vite.config.js
```

## 🚀 Quick Start (5 Minutes)

### 1. **Setup Supabase** (2 min)
```bash
# Go to https://supabase.com and create a new project
# Copy your Project URL and Anon Key from Settings → API
```

### 2. **Run Database Schema** (1 min)
```bash
# In Supabase SQL Editor:
# Paste contents of database_schema.sql and click Run
```

### 3. **Configure Environment** (1 min)
Create `server/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret-key-32-chars-minimum
```

### 4. **Run the Project** (1 min)
```powershell
# Terminal 1 - Backend
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
cd server
npm install
node server.js

# Terminal 2 - Frontend (new terminal)
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
cd client
npm install
npm run dev
```

### 5. **Access the System**
- 🌐 Careers Page: http://localhost:5173/careers
- 👨‍💼 Admin Portal: http://localhost:5173/admin

## 💻 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18.3 + Vite + React Router 6 |
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | Supabase Auth + JWT |
| **File Storage** | Supabase Storage |
| **Styling** | CSS3 (Gradients, Animations, Flexbox, Grid) |

## 📊 Features Breakdown

### Job Listings
- Display all published jobs
- Filter by department and location
- Show job details (skills, experience, salary)
- Modern job cards with hover effects
- Responsive grid layout

### Application Process
- Professional modal form
- Form validation (email, phone, files)
- Resume upload (PDF, DOC, DOCX)
- Generate unique Application ID
- Success confirmation screen
- All data saved to database

### Admin Portal
- Secure login system
- Dashboard with statistics
- Applications management table
- Search and filter capabilities
- View full application details
- Update application status
- Add internal notes
- Download resume files
- Manage job postings

### Security
- JWT-based authentication
- Secure password handling
- File type and size validation
- Private resume storage
- Row Level Security policies
- Input validation
- CORS protection

## 📈 Database Schema

### Tables
- **jobs**: Job postings (title, department, location, skills, etc.)
- **job_applications**: Candidate applications (personal info, resume, status)
- **application_status_history**: Track status changes over time
- **admin_users**: Admin accounts (optional)

### Features
- Automatic timestamps
- Unique constraints
- Foreign key relationships
- Performance indexes
- Row Level Security

## 🔐 Security Features

✅ JWT token-based admin authentication
✅ Password hashing via Supabase Auth
✅ Secure file upload and storage
✅ Form input validation
✅ Row Level Security on database
✅ Environment variables for secrets
✅ Error messages don't expose system details
✅ Rate limiting ready

## 🎨 Design Highlights

### Color Scheme
- **Primary Blue**: #2a6cff, #54baff
- **Accent Pink**: #ff5cde, #8d45ff
- **Dark Background**: Linear gradient (professional)
- **Text**: Light (#f5f7ff) for contrast

### UI Elements
- Glassmorphism cards (semi-transparent)
- Gradient overlays
- Smooth animations
- Status badges with colors
- Professional typography (Inter font)
- Responsive layout
- Mobile-optimized forms

## 📚 Documentation

1. **QUICK_START.md** - Get running in 5 minutes
2. **CAREERS_SETUP_GUIDE.md** - Detailed setup and configuration
3. **IMPLEMENTATION_SUMMARY.md** - What's been built
4. **REQUIREMENTS_CHECKLIST.md** - Requirements vs implementation
5. **database_schema.sql** - Database structure

## 🧪 Testing

### Test Application Flow
1. Go to http://localhost:5173/careers
2. Click "Apply Now" on a job
3. Fill the form with test data
4. Upload a PDF resume
5. Click Submit
6. You'll see success screen with Application ID

### Test Admin Flow
1. Create admin user in Supabase (Auth → Users → Add User)
2. Go to http://localhost:5173/admin
3. Login with the admin credentials
4. View your submitted application
5. Update its status
6. Add notes
7. Download resume

## 🔧 API Endpoints

### Public
- `GET /api/careers/jobs` - List published jobs
- `GET /api/careers/jobs/:id` - Get job details
- `POST /api/careers/apply` - Submit application

### Admin (require JWT token)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/applications` - List applications
- `GET /api/admin/applications/:id` - Get application details
- `PUT /api/admin/applications/:id/status` - Update status
- `DELETE /api/admin/applications/:id` - Delete application
- `GET /api/admin/dashboard` - Get statistics
- `GET /api/admin/jobs` - List all jobs
- `POST /api/admin/jobs` - Create job
- `PUT /api/admin/jobs/:id` - Update job
- `DELETE /api/admin/jobs/:id` - Delete job

## ⚙️ Configuration

### Environment Variables
```env
# Server configuration
PORT=5000
NEO4J_URI=...  # For existing features
CLIENT_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Security
JWT_SECRET=min-32-characters-secret

# Optional: Email notifications
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
ADMIN_EMAIL=admin@mentneo.com
```

## 📋 Next Steps

### Immediate (Testing)
1. Follow QUICK_START.md
2. Test the application flow
3. Create sample jobs
4. Submit test application
5. Verify in admin dashboard

### Short Term (Customization)
1. Add your company jobs
2. Customize colors to match brand
3. Add custom form fields
4. Setup email notifications
5. Create admin users

### Long Term (Production)
1. Deploy to production server
2. Configure custom domain
3. Setup analytics
4. Implement interview scheduling
5. Add additional features

## 🚨 Troubleshooting

**Backend won't start?**
```powershell
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
node server.js
```

**Can't connect to Supabase?**
- Verify SUPABASE_URL and SUPABASE_KEY in `.env`
- Check they're from the correct project
- Ensure .env file is in `server/` directory

**Admin login fails?**
- Create user in Supabase Dashboard → Authentication → Users
- Use those credentials to login

See **CAREERS_SETUP_GUIDE.md** for more troubleshooting.

## 📞 Support

For detailed information:
1. **QUICK_START.md** - Fast setup
2. **CAREERS_SETUP_GUIDE.md** - Complete guide
3. **IMPLEMENTATION_SUMMARY.md** - Feature details
4. **Code comments** - In components and API

## ✅ Requirements Met

All 15 major requirements have been implemented:
1. ✅ Careers section with job cards
2. ✅ Apply Now functionality
3. ✅ Candidate information form
4. ✅ Resume upload
5. ✅ Application submission
6. ✅ Admin notification system
7. ✅ Admin panel with login
8. ✅ Admin dashboard
9. ✅ Application status management
10. ✅ Job management
11. ✅ Tech stack (React, Node, Express, Supabase)
12. ✅ Security features
13. ✅ Professional UI/UX
14. ✅ Application tracking
15. ✅ Error handling

See **REQUIREMENTS_CHECKLIST.md** for detailed fulfillment details.

## 📄 License

This project is part of Mentneo. All rights reserved.

## 🎉 Ready to Go!

Your professional careers system is ready. Start with **QUICK_START.md** and you'll be up and running in minutes!

---

**Created**: 2026-08-24
**Version**: 1.0.0
**Status**: Production Ready ✅

Good luck! 🚀
