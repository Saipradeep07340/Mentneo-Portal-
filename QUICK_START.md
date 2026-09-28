# Quick Start Guide - Mentneo Careers System

## ⚡ 5-Minute Setup

### Prerequisites
- Node.js v24.19.0 (already in your project)
- Supabase account (free tier works great)
- Browser for testing

### Step 1: Create Supabase Project (2 min)
1. Go to https://supabase.com
2. Sign up or login
3. Create new project
4. Copy **Project URL** and **Anon Key** from Settings → API

### Step 2: Setup Database (1 min)
1. In Supabase, go to SQL Editor
2. Create new query
3. Copy contents of `database_schema.sql`
4. Paste and click Run

### Step 3: Configure Environment (1 min)
Edit `server/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret-key-32-chars-min
```

### Step 4: Install & Run (1 min)
```powershell
# Terminal 1 - Backend
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
cd c:\Users\DELL\Mentneo\server
npm install
node server.js

# Terminal 2 - Frontend (new terminal)
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
cd c:\Users\DELL\Mentneo\client
npm install
npm run dev
```

### Access the System
- **Careers Page**: http://localhost:5173/careers
- **Admin Login**: http://localhost:5173/admin

---

## 🧪 Test It Now

### Test 1: Apply for Job (30 seconds)
1. Go to http://localhost:5173/careers
2. Click "Apply Now" on any job
3. Fill form:
   - Name: Test User
   - Email: test@example.com
   - Mobile: 9876543210
   - Download a PDF sample and upload as resume
4. Click Submit
5. ✅ See success screen with Application ID

### Test 2: Admin Dashboard (30 seconds)
Need to create admin user first:
1. Go to Supabase dashboard
2. Authentication → Users → Add User
3. Email: admin@test.com
4. Password: admin123
5. Go to http://localhost:5173/admin
6. Login with these credentials
7. ✅ See your application in dashboard

---

## 🎯 What You Have

### Public-Facing Features
- ✅ Professional careers page
- ✅ Job search with filters
- ✅ Modern job cards
- ✅ Full application form
- ✅ Resume upload
- ✅ Validation
- ✅ Unique Application IDs

### Admin Features
- ✅ Secure login
- ✅ Dashboard with stats
- ✅ Application management
- ✅ Status tracking
- ✅ Resume downloads
- ✅ Search/filter
- ✅ Add jobs

---

## 📚 Documentation

- **Setup Guide**: `CAREERS_SETUP_GUIDE.md` (detailed instructions)
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md` (what's built)
- **Database Schema**: `database_schema.sql` (database structure)

---

## ❓ Common Issues

**Backend won't start:**
```powershell
# Make sure you have PATH set:
$env:Path = "c:\Users\DELL\Mentneo\node-v24.19.0-win-x64;$env:Path"
node server.js
```

**Frontend won't start:**
```powershell
# Install dependencies first:
cd client
npm install
npm run dev
```

**Can't connect to Supabase:**
- Check SUPABASE_URL and SUPABASE_KEY in server/.env
- Make sure they're from the right project

**Can't login to admin:**
- Create user in Supabase Dashboard → Authentication → Users
- Use that email/password to login

---

## 🚀 Next: Customize!

Once it's running, you can:

1. **Add more jobs**: Admin dashboard → Jobs tab
2. **Change colors**: Edit CSS in `client/src/styles/`
3. **Add form fields**: Edit `ApplicationModal.jsx`
4. **Setup email**: Add email config to `.env`
5. **Deploy**: See deployment section in full guide

---

## 📞 Need More Help?

See `CAREERS_SETUP_GUIDE.md` for:
- Detailed troubleshooting
- API reference
- Security setup
- Production deployment
- Email configuration

---

**Ready?** Start with Step 1 above! 🎉
