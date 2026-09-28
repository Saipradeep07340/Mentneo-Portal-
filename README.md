# Mentneo Portal — Full-Stack Platform & Biometric Attendance System

Production-ready enterprise platform for Mentneo featuring the corporate website, careers system, complete Employee Dashboard portal with all 15 core modules, and an AI-driven Face Recognition & Automatic Attendance pipeline powered by FastAPI, YuNet CNN, and ArcFace/SFace deep neural networks persisted directly to Neon PostgreSQL.

---

## 🚀 Key Modules & Capabilities

### 1. Employee Dashboard (15 Core Modules)
* **Attendance & Regularization**: Live clock-in/out, multi-break management, historical timesheets, and regularization requests.
* **Biometric Face Recognition**: Real-time camera capture, anti-spoofing/liveness verification, 128-d ArcFace feature extraction, and automated contactless punches.
* **My Tasks & Progress**: Kanban & list filtering, milestone updates (0–100%), blocker flags, threaded comments, and audit trails.
* **Daily Work Log & Standup Reports**: Task-linked hourly logs, standup forms with work-log auto-fill, and submission locks.
* **Leave Management**: Real-time quota ledger (CL, SL, EL), negative balance protection, date pickers, and cancellation flows.
* **Calendar Feed**: Unified view of company holidays, approved leaves, task deadlines, and scheduled meetings.
* **Notifications & Announcements**: Real-time activity alerts, unread badges, deep links, priority broadcast boards with read states.
* **Profile & Directory**: Personal information management, protected HR records, masked statutory data, and safe colleague directory.
* **Documents & Performance**: Authenticated document repository, formal letter requests, OKR/KPI goal progress, and appraisal history.
* **Helpdesk / Support**: Multi-category ticketing system with threaded replies and lifecycle tracking.

### 2. AI Face Recognition & Automatic Attendance System
* **FastAPI Python Backend**: High-performance asynchronous microservice running on port 8000.
* **Face Detection**: YuNet CNN detector (`cv2.FaceDetectorYN`) with 5-point facial landmark geometry.
* **Face Recognition**: SFace ArcFace model (`cv2.FaceRecognizerSF`) outputting 128-dimensional L2-normalized feature embeddings.
* **Anti-Spoofing & Liveness**: Laplacian variance blur checks, luminance thresholds, contrast analysis, and face boundary constraints.
* **Automated Calculations**:
  * Shift timeliness against configured `SHIFT_START` (09:00 AM) and grace periods (15m).
  * Multi-break accumulation.
  * Presence time, net working time, early departure, and overtime calculations.
  * Status resolution (`PRESENT`, `LATE`, `HALF_DAY`).
* **Persistent Neon PostgreSQL Database**: Real-time ACID persistence for attendance, breaks, biometric templates, and audit logs.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, Vite, React Router 6, CSS3 Glassmorphism UI
* **Primary Python Backend**: FastAPI, Uvicorn, Pydantic v2, PyJWT, bcrypt, psycopg 3
* **Computer Vision & Inference**: OpenCV 5.0 (DNN Engine), MediaPipe, NumPy
* **Node Server & Proxy**: Express 4, Node.js, CORS, Morgan
* **Database**: Neon Serverless PostgreSQL (PostgreSQL 18.6) + SQLite persistence fallback

---

## 📋 Quick Start

### 1. Prerequisites
* Node.js v20+
* Python 3.10+
* Git

### 2. Installation
```bash
# Install Node dependencies
npm install --prefix server
npm install --prefix client

# Install Python backend dependencies
pip install -r backend/requirements.txt
```

### 3. Environment Configuration
Create `backend/.env` from the provided template:
```bash
cp backend/.env.example backend/.env
```
Ensure your `DATABASE_URL` is set to your PostgreSQL database.

### 4. Database Migration
```bash
python backend/migrate_neon.py
```

### 5. Running the Application
```bash
# Terminal 1: Start FastAPI Face & Attendance Backend (port 8000)
npm run start:backend

# Terminal 2: Start Fullstack Node Server (port 5000)
npm start

# Terminal 3: Start Client Dev Server (port 5173)
npm --prefix client run dev
```

### 6. Automated Testing
Run the comprehensive integration test suite (verifying face registration, liveness, impostor rejection, check-in, breaks, check-out, and security):
```bash
npm test
```

---

## 🔐 Credentials for Verification

* **Portal URL**: `http://localhost:5173/employee/login` (or `http://localhost:5000/employee/login`)
* **Email**: `john.doe@mentneo.com`
* **Password**: `Password@123`
* **Role**: Senior AI Engineer (EMP-2024-001)

---

## 📄 License
Private corporate repository for Mentneo.
