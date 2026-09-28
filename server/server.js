import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 5000;

// Supabase initialization
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_KEY || 'your-anon-key'
);

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5000', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}
app.use(express.static(path.join(__dirname, '..')));

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'neo4j://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

import db, { initDatabase } from './db.js';
import employeeRouter from './routes/employee.js';
import authRouter from './routes/auth.js';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

const forwardToFastAPI = async (req, res, next) => {
  try {
    const targetPath = req.originalUrl.replace('/api/employee', '/api');
    const targetUrl = `${FASTAPI_URL}${targetPath}`;
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];

    const fetchOptions = {
      method: req.method,
      headers: headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    res.status(response.status);

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.json(data);
    } else {
      const text = await response.text();
      return res.send(text);
    }
  } catch (err) {
    // If FastAPI is not responding, fallback to internal route handler
    next();
  }
};

app.use('/api/face', forwardToFastAPI);
app.use('/api/attendance', forwardToFastAPI);
app.use('/api/employee/face', forwardToFastAPI);
app.use('/api/employee/attendance', forwardToFastAPI);

app.use('/api/auth', authRouter);
app.use('/api/employee', employeeRouter);

app.get('/api/health', async (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Mentneo backend is running', 
    database: 'SQLite persistent relational database active',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/research', async (req, res) => {
  const researchAreas = [
    { id: 'ai-systems', title: 'AI Systems', description: 'Researching intelligent architectures, reasoning systems, AI agents, and multi-model systems.' },
    { id: 'generative-ai', title: 'Generative AI', description: 'Researching language models, multimodal intelligence, image generation, video intelligence, and generative systems.' },
    { id: 'ai-agents', title: 'AI Agents', description: 'Building autonomous agents capable of planning, reasoning, executing actions, and working with external tools.' },
    { id: 'business-intelligence', title: 'Business Intelligence', description: 'Transforming business data into intelligent decisions, predictions, recommendations, and automated actions.' },
    { id: 'ai-automation', title: 'AI Automation', description: 'Researching systems that can understand business processes and autonomously execute repetitive workflows.' },
    { id: 'human-ai', title: 'Human × AI', description: 'Exploring better ways for humans and intelligent systems to collaborate.' }
  ];

  res.json({ researchAreas });
});

app.get('/api/products', async (req, res) => {
  const products = [
    { name: 'Saadhyam AI', category: 'Research', description: 'AI business intelligence and automation platform.', status: 'Beta' },
    { name: 'MindNeox', category: 'Prototype', description: 'AI operating system research project for autonomous workflows, memory, tools, and intelligent interaction.', status: 'In Development' },
    { name: 'AI Infrastructure', category: 'Research', description: 'Scalable systems for model orchestration, data pipelines, and intelligence deployment.', status: 'Research' }
  ];

  res.json({ products });
});

app.get('/api/metrics', (req, res) => {
  res.json({
    metrics: [
      { label: 'AI Research', value: '∞', suffix: '' },
      { label: 'AI Systems', value: '12', suffix: '+' },
      { label: 'Experiments', value: '96', suffix: '+' },
      { label: 'Products', value: '08', suffix: '+' },
      { label: 'Businesses Enabled', value: '24', suffix: '+' }
    ]
  });
});

app.get('/api', (req, res) => {
  res.json({ message: 'Mentneo API is live.' });
});

// ==================== CAREERS SYSTEM ENDPOINTS ====================

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Generate unique application ID
const generateApplicationId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `APP-${year}-${random}`;
};

// ==================== PUBLIC JOB ENDPOINTS ====================

// Get all published jobs
app.get('/api/careers/jobs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ jobs: data || [] });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch job listings' });
  }
});

// Get single job details
app.get('/api/careers/jobs/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', req.params.id)
      .eq('published', true)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Job not found' });
    
    res.json({ job: data });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// ==================== APPLICATION SUBMISSION ====================

// Submit job application with resume upload
app.post('/api/careers/apply', upload.single('resume'), async (req, res) => {
  try {
    const { fullName, email, mobile, location, positionId, qualification, experience, company, skills, linkedIn, portfolio, message } = req.body;

    // Validation
    if (!fullName || !email || !mobile || !positionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile.replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'Invalid mobile number' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Resume is required' });
    }

    // Generate application ID
    const applicationId = generateApplicationId();
    
    // Upload resume to Supabase Storage
    const fileName = `resumes/${applicationId}-${Date.now()}-${req.file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('applications')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL for resume
    const { data: { publicUrl } } = supabase.storage
      .from('applications')
      .getPublicUrl(fileName);

    // Save application to database
    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        application_id: applicationId,
        position_id: positionId,
        full_name: fullName,
        email,
        mobile,
        location,
        qualification,
        experience,
        current_company: company,
        skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
        linkedin_profile: linkedIn,
        portfolio_url: portfolio,
        resume_url: uploadData.path,
        message,
        status: 'New',
        submission_date: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    // Send confirmation email to candidate
    // Note: Email functionality requires configured email service
    console.log(`Application ${applicationId} submitted by ${fullName}`);

    res.json({
      success: true,
      message: 'Application submitted successfully',
      applicationId,
      nextSteps: 'Our recruitment team will review your application and contact you soon.'
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application. Please try again later.' });
  }
});

// ==================== ADMIN AUTHENTICATION ====================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // For demo purposes, using Supabase auth
    // In production, implement proper authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const token = jwt.sign(
      { id: data.user.id, email: data.user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { email: data.user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Get all applications (admin)
app.get('/api/admin/applications', verifyAdminToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*, jobs(title)')
      .order('submission_date', { ascending: false });

    if (error) throw error;
    res.json({ applications: data || [] });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get application details (admin)
app.get('/api/admin/applications/:id', verifyAdminToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*, jobs(title, description)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Application not found' });

    res.json({ application: data });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Update application status (admin)
app.put('/api/admin/applications/:id/status', verifyAdminToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['New', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update application status
    const { data, error } = await supabase
      .from('job_applications')
      .update({ status, admin_notes: notes })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    // Record status history
    await supabase
      .from('application_status_history')
      .insert({
        application_id: req.params.id,
        old_status: 'Previous',
        new_status: status,
        changed_by: req.admin.email,
        changed_at: new Date().toISOString()
      });

    res.json({ success: true, application: data[0] });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Delete application (admin)
app.delete('/api/admin/applications/:id', verifyAdminToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// Get admin dashboard stats
app.get('/api/admin/dashboard', verifyAdminToken, async (req, res) => {
  try {
    // Get total applications
    const { count: totalCount } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true });

    // Get applications by status
    const { data: statusData } = await supabase
      .from('job_applications')
      .select('status')
      .order('status');

    const statusCounts = {};
    statusData?.forEach(app => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    });

    res.json({
      totalApplications: totalCount || 0,
      statusBreakdown: statusCounts
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ==================== JOB MANAGEMENT (Admin) ====================

// Get all jobs (admin - including unpublished)
app.get('/api/admin/jobs', verifyAdminToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ jobs: data || [] });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Create new job (admin)
app.post('/api/admin/jobs', verifyAdminToken, async (req, res) => {
  try {
    const { title, department, location, employmentType, experience, description, skills, responsibilities, qualifications, salary, published } = req.body;

    if (!title || !department || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        title,
        department,
        location,
        employment_type: employmentType,
        experience_required: experience,
        description,
        required_skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
        responsibilities: Array.isArray(responsibilities) ? responsibilities : (responsibilities ? responsibilities.split('\n').map(r => r.trim()) : []),
        qualifications: Array.isArray(qualifications) ? qualifications : (qualifications ? qualifications.split('\n').map(q => q.trim()) : []),
        salary,
        published: published || false,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    res.json({ success: true, job: data[0] });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job (admin)
app.put('/api/admin/jobs/:id', verifyAdminToken, async (req, res) => {
  try {
    const { title, department, location, employmentType, experience, description, skills, responsibilities, qualifications, salary, published } = req.body;

    const { data, error } = await supabase
      .from('jobs')
      .update({
        title,
        department,
        location,
        employment_type: employmentType,
        experience_required: experience,
        description,
        required_skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
        responsibilities: Array.isArray(responsibilities) ? responsibilities : (responsibilities ? responsibilities.split('\n').map(r => r.trim()) : []),
        qualifications: Array.isArray(qualifications) ? qualifications : (qualifications ? qualifications.split('\n').map(q => q.trim()) : []),
        salary,
        published
      })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json({ success: true, job: data[0] });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job (admin)
app.delete('/api/admin/jobs/:id', verifyAdminToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

app.get('*', (req, res) => {
  const distIndex = path.join(__dirname, '..', 'client', 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(port, () => {
  console.log(`Mentneo server running on http://localhost:${port}`);
});
