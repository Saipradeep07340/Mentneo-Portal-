import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './styles.css';
import CareersPage from './pages/CareersPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Employee Portal Imports
import { AuthProvider } from './context/AuthContext';
import EmployeeLayout from './layouts/EmployeeLayout';
import EmployeeLogin from './pages/employee/EmployeeLogin';
import EmployeeDashboardHome from './pages/employee/EmployeeDashboardHome';
import AttendancePage from './pages/employee/AttendancePage';
import FaceRecognitionPage from './pages/employee/FaceRecognitionPage';
import MyTasksPage from './pages/employee/MyTasksPage';
import TaskProgressPage from './pages/employee/TaskProgressPage';
import DailyWorkLogPage from './pages/employee/DailyWorkLogPage';
import DailyReportPage from './pages/employee/DailyReportPage';
import LeaveManagementPage from './pages/employee/LeaveManagementPage';
import CalendarPage from './pages/employee/CalendarPage';
import NotificationsPage from './pages/employee/NotificationsPage';
import AnnouncementsPage from './pages/employee/AnnouncementsPage';
import MyProfilePage from './pages/employee/MyProfilePage';
import DocumentsPage from './pages/employee/DocumentsPage';
import PerformancePage from './pages/employee/PerformancePage';
import CompanyDirectoryPage from './pages/employee/CompanyDirectoryPage';
import HelpSupportPage from './pages/employee/HelpSupportPage';
import { Navigate } from 'react-router-dom';

const navItems = ['Research', 'Technology', 'Solutions', 'Products', 'About', 'Contact', 'Careers', 'Employee Portal'];

const researchAreas = [
  { id: 'ai-systems', title: 'AI Systems', description: 'Researching intelligent architectures, reasoning systems, AI agents, and multi-model systems.' },
  { id: 'generative-ai', title: 'Generative AI', description: 'Researching language models, multimodal intelligence, image generation, video intelligence, and generative systems.' },
  { id: 'ai-agents', title: 'AI Agents', description: 'Building autonomous agents capable of planning, reasoning, executing actions, and working with external tools.' },
  { id: 'business-intelligence', title: 'Business Intelligence', description: 'Transforming business data into intelligent decisions, predictions, recommendations, and automated actions.' },
  { id: 'ai-automation', title: 'AI Automation', description: 'Researching systems that can understand business processes and autonomously execute repetitive workflows.' },
  { id: 'human-ai', title: 'Human × AI', description: 'Exploring better ways for humans and intelligent systems to collaborate.' }
];

const technologies = [
  'Large Language Models',
  'Machine Learning',
  'Deep Learning',
  'Generative AI',
  'Retrieval-Augmented Generation',
  'AI Agents',
  'Computer Vision',
  'Voice AI',
  'Multimodal AI',
  'Knowledge Systems',
  'Automation',
  'AI Infrastructure'
];

const stackLayers = [
  'Data',
  'Knowledge',
  'Models',
  'Reasoning',
  'Agents',
  'Automation',
  'Applications'
];

const products = [
  { name: 'Saadhyam AI', tag: 'Beta', description: 'AI business intelligence and automation platform.' },
  { name: 'MindNeox', tag: 'In Development', description: 'AI operating system research project exploring autonomous AI interaction, memory, tools, and intelligent workflows.' },
  { name: 'Research Lab', tag: 'Research', description: 'Experimental intelligence systems, models, and applied prototypes.' }
];

const businessUseCases = [
  'Sales Intelligence',
  'Customer Intelligence',
  'Business Automation',
  'AI Voice Systems',
  'Decision Intelligence',
  'Document Intelligence',
  'Marketing Intelligence',
  'Workflow Automation',
  'Predictive Analytics'
];

const metrics = [
  { label: 'AI Research', value: '∞' },
  { label: 'AI Systems', value: '12+' },
  { label: 'Experiments', value: '96+' },
  { label: 'Products', value: '08+' },
  { label: 'Businesses Enabled', value: '24+' }
];

function HomePage() {
  return (
    <>
      <div className="page-shell">
        <div className="grid-overlay" />
        <header className="site-header">
          <nav className="topbar container">
            <Link to="/" className="brand">MENTNEO</Link>
            <div className="nav-links">
              {navItems.map((item) => {
                const path = item === 'Careers' ? '/careers' : item === 'Employee Portal' ? '/employee/dashboard' : '#';
                return (
                  <Link to={path} key={item} className={item === 'Careers' ? 'nav-careers' : item === 'Employee Portal' ? 'nav-careers' : ''}>
                    {item}
                  </Link>
                );
              })}
            </div>
            <Link to="/employee/dashboard" className="nav-cta" style={{ textDecoration: 'none' }}>
              Employee Portal →
            </Link>
          </nav>
        </header>

        <main>
          <section className="hero container">
            <div className="hero-copy">
              <p className="eyebrow">AI Research & Development</p>
              <h1>
                We Research.<br />
                We Build.<br />
                We Advance Intelligence.
              </h1>
              <p className="subheading">
                Mentneo is an AI Research & Development company building intelligent systems, autonomous AI agents, business AI infrastructure, and next-generation technologies.
              </p>
              <div className="cta-row">
                <button className="primary">Explore Our Research</button>
                <button className="secondary">Build With Mentneo</button>
              </div>
            </div>

            <div className="hero-visual" aria-label="AI neural network visualization">
              <div className="core-glow" />
              <div className="orb orb-1" />
              <div className="orb orb-2" />
              <div className="orb orb-3" />
              <div className="ring ring-1" />
              <div className="ring ring-2" />
              <div className="node node-1" />
              <div className="node node-2" />
              <div className="node node-3" />
              <div className="node node-4" />
              <div className="node node-5" />
              <div className="node node-6" />
              <div className="node node-7" />
              <div className="node node-8" />
              <div className="data-stream data-stream-1" />
              <div className="data-stream data-stream-2" />
              <div className="data-stream data-stream-3" />
            </div>
          </section>

          <section className="editorial container section-space">
            <div className="section-kicker">Intelligence Beyond Today</div>
            <h2>
              Artificial Intelligence is moving from tools to systems.
            </h2>
            <div className="editorial-layout">
              <p>
                Mentneo researches and develops intelligent systems capable of understanding information, reasoning across complex problems, interacting with humans, automating workflows, and continuously improving.
              </p>
              <div className="network-panel">
                <div className="network-grid" />
              </div>
            </div>
          </section>

          <section className="container section-space">
            <div className="section-header-inline">
              <div className="section-kicker">What We Research</div>
            </div>
            <div className="research-grid">
              {researchAreas.map((item) => (
                <article className="glass-card research-card" key={item.id}>
                  <div className="mini-visual">
                    <span className="mini-dot" />
                    <span className="mini-dot" />
                    <span className="mini-dot" />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="container section-space technology-section">
            <div className="section-kicker">Our Technology</div>
            <div className="technology-rail">
              {technologies.map((item, index) => (
                <div className="tech-pill" key={item} style={{ '--index': index }}>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="container section-space stack-section">
            <div className="stack-heading">
              <div>
                <div className="section-kicker">Mentneo Intelligence Stack</div>
                <h2>From Data to Intelligence.</h2>
              </div>
              <p>
                Mentneo researches the complete AI stack rather than building isolated AI features.
              </p>
            </div>

            <div className="stack-layers">
              {stackLayers.map((layer, index) => (
                <div className="stack-layer" key={layer} style={{ '--index': index }}>
                  <span>Layer 0{index + 1}</span>
                  <strong>{layer}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="container section-space products-section">
            <div className="section-kicker">Products & Experiments</div>
            <div className="product-grid">
              {products.map((product) => (
                <article className="glass-card product-card" key={product.name}>
                  <div className="product-head">
                    <span className="pill">{product.tag}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="container section-space business-section">
            <div className="section-kicker">AI for Business</div>
            <h2>We don’t just build AI. We make businesses intelligent.</h2>
            <div className="business-layout">
              <div className="usecase-list">
                {businessUseCases.map((item) => (
                  <div className="usecase-item" key={item}>{item}</div>
                ))}
              </div>
              <div className="before-after">
                <div className="comparison-block">
                  <h4>Traditional Business</h4>
                  <ul>
                    <li>Manual Processes</li>
                    <li>Scattered Data</li>
                    <li>Slow Decisions</li>
                  </ul>
                </div>
                <div className="comparison-arrow">→</div>
                <div className="comparison-block ai-block">
                  <h4>AI-Native Business</h4>
                  <ul>
                    <li>Intelligent Systems</li>
                    <li>Connected Data</li>
                    <li>Automated Decisions</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="container section-space process-section">
            <div className="section-kicker">Research → Prototype → Product</div>
            <div className="process-steps">
              <div className="process-step">
                <span>01</span>
                <h3>Research</h3>
                <p>Identify the problem and investigate possible AI approaches.</p>
              </div>
              <div className="process-step">
                <span>02</span>
                <h3>Experiment</h3>
                <p>Build models, prototypes, agents, and experiments.</p>
              </div>
              <div className="process-step">
                <span>03</span>
                <h3>Validate</h3>
                <p>Test performance, reliability, scalability, and real-world impact.</p>
              </div>
              <div className="process-step">
                <span>04</span>
                <h3>Deploy</h3>
                <p>Transform validated research into production-ready AI systems.</p>
              </div>
            </div>
          </section>

          <section className="container section-space metrics-section">
            <div className="section-kicker">Research Metrics</div>
            <div className="metrics-grid">
              {metrics.map((metric) => (
                <div className="metric-card" key={metric.label}>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="container section-space philosophy-section">
            <div className="section-kicker">Research Philosophy</div>
            <h2>
              The future won’t be powered by AI tools alone.<br />
              It will be powered by intelligent systems.
            </h2>
            <p>
              Mentneo explores how artificial intelligence can move beyond simple assistance toward reasoning, autonomy, adaptation, and meaningful collaboration with people.
            </p>
          </section>

          <section className="container section-space about-section">
            <div className="section-kicker">About Mentneo</div>
            <h2>Building the intelligence layer for tomorrow.</h2>
            <p>
              Mentneo is an independent AI Research & Development company focused on creating practical AI technologies that solve complex problems.
            </p>
            <div className="pill-row">
              <span>Research-driven.</span>
              <span>Engineering-focused.</span>
              <span>Experiment-oriented.</span>
              <span>Future-facing.</span>
            </div>
          </section>

          <section className="container section-space collaboration-section">
            <div className="collab-card">
              <div>
                <div className="section-kicker">Collaboration</div>
                <h2>Have a problem worth researching?</h2>
                <p>Work with Mentneo to research, prototype, and develop intelligent solutions for your organization.</p>
              </div>
              <div className="collab-actions">
                <button className="primary">Start a Conversation</button>
                <button className="secondary">Explore Research</button>
              </div>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <div className="container footer-inner">
            <div>
              <div className="brand footer-brand">MENTNEO</div>
              <p>AI Research & Development</p>
            </div>
            <div className="footer-links">
              {['Research', 'Technology', 'Products', 'Solutions', 'About', 'Contact'].map((item) => (
                <a href="#" key={item}>{item}</a>
              ))}
            </div>
            <p className="footer-statement">Researching intelligence. Building what comes next.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

function App() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    setAdminToken(null);
  };

  return (
    <Router>
      <Routes>
        {/* Public & Website Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route 
          path="/admin" 
          element={adminToken ? <AdminDashboard token={adminToken} onLogout={handleAdminLogout} /> : <AdminLogin onLoginSuccess={setAdminToken} />} 
        />

        {/* Employee Authentication Route */}
        <Route path="/employee/login" element={<EmployeeLogin />} />

        {/* Protected Employee Portal Routes */}
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route index element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboardHome />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="attendance/today" element={<AttendancePage />} />
          <Route path="attendance/history" element={<AttendancePage />} />
          <Route path="face-recognition" element={<FaceRecognitionPage />} />
          <Route path="tasks" element={<MyTasksPage />} />
          <Route path="task-progress" element={<TaskProgressPage />} />
          <Route path="work-log" element={<DailyWorkLogPage />} />
          <Route path="daily-report" element={<DailyReportPage />} />
          <Route path="leave" element={<LeaveManagementPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="profile" element={<MyProfilePage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="directory" element={<CompanyDirectoryPage />} />
          <Route path="support" element={<HelpSupportPage />} />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
