import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  LayoutDashboard,
  User,
  Search,
  Settings,
  BarChart2,
  History,
  Bell,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Trash2,
  Eye,
  FileText,
  Zap,
  Menu,
  Terminal,
  Play,
  Pause,
  Monitor,
  Cpu,
  Globe,
  FileEdit,
  Upload
} from "lucide-react";
import ResumePaper from './components/ResumePaper';
import OnboardingWizard from './components/OnboardingWizard';
import ProfileView from './components/ProfileView';
import { ResumeData } from './types';

// --- Types & Interfaces ---

type View = "dashboard" | "profile" | "job-search" | "ai-settings" | "analytics" | "history" | "live-agent" | "resume-tailor";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  logoColor: string;
  initial: string;
}

interface Application {
  id: number;
  date: string;
  company: string;
  role: string;
  status: "Interview" | "Rejected" | "Applied" | "Offer";
  logoColor: string;
  initial: string;
}

// --- Resume Types ---

// --- Constants ---
export const INITIAL_RESUME: ResumeData = {
  personalInfo: {
    name: "Alex Morgan",
    title: "Senior Full Stack Engineer",
    address: "San Francisco, CA",
    phone: "+1 555-0123",
    email: "alex.morgan@example.com"
  },
  summary: "Results-driven Senior Software Engineer with 6+ years of experience in building scalable web applications. Expert in React, Python, and Cloud Architecture. Proven track record of improving system performance and leading agile teams.",
  skills: [
    { category: "Languages", items: ["TypeScript", "Python", "Go", "SQL"] },
    { category: "Frontend", items: ["React", "Next.js", "TailwindCSS", "Redux"] },
    { category: "Backend", items: ["FastAPI", "Node.js", "PostgreSQL", "Docker"] }
  ],
  experience: [
    {
      company: "TechFlow Systems",
      location: "Remote",
      role: "Senior Software Engineer",
      dates: "2021 - Present",
      bullets: [
        "Led migration of legacy monolith to microservices, reducing deployment time by 40%.",
        "Mentored 3 junior developers and established code review standards."
      ]
    },
    {
      company: "WebScale Inc",
      location: "San Francisco, CA",
      role: "Software Engineer",
      dates: "2018 - 2021",
      bullets: [
        "Developed core payment processing module handling $1M+ daily transactions.",
        "Optimized database queries resulting in 30% faster load times."
      ]
    }
  ],
  education: [
    {
      degree: "BS Computer Science",
      institution: "University of California",
      location: "Berkeley, CA",
      dates: "2014 - 2018",
      details: ["GPA 3.8", "Dean's List"]
    }
  ]
};

// --- Services ---

const tailorResume = async (currentResume: ResumeData, jobDescription: string, apiKey: string): Promise<ResumeData> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    CURRENT RESUME (JSON):
    ${JSON.stringify(currentResume)}
    
    TARGET JOB DESCRIPTION:
    ${jobDescription}
    
    INSTRUCTION: Rewrite the resume to target the job description. Keep factual accuracy but reframe experience and summary to highlight relevant skills.
    Return strictly JSON.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  if (text) return JSON.parse(text) as ResumeData;
  throw new Error("Failed to generate resume");
};

// --- Mock Data ---

const JOBS: Job[] = [
  { id: 1, title: "Senior Software Engineer", company: "Google", location: "Mountain View, CA", type: "Full-time", logoColor: "bg-red-500", initial: "G" },
  { id: 2, title: "Marketing Manager", company: "Amazon", location: "Seattle, WA", type: "Full-time", logoColor: "bg-yellow-500", initial: "A" },
  { id: 3, title: "Data Scientist", company: "Stripe", location: "San Francisco, CA", type: "Remote", logoColor: "bg-indigo-500", initial: "S" },
  { id: 4, title: "Frontend Developer", company: "Netflix", location: "Los Gatos, CA", type: "Full-time", logoColor: "bg-red-600", initial: "N" },
];

const HISTORY: Application[] = [
  { id: 1, date: "Oct 26, 2023", company: "Google", role: "Senior SWE", status: "Interview", logoColor: "bg-red-500", initial: "G" },
  { id: 2, date: "Oct 25, 2023", company: "Amazon", role: "Marketing Lead", status: "Rejected", logoColor: "bg-yellow-500", initial: "A" },
  { id: 3, date: "Oct 24, 2023", company: "Microsoft", role: "Data Scientist", status: "Applied", logoColor: "bg-blue-500", initial: "M" },
];

// --- Components ---

const SidebarItem = ({ icon: Icon, label, isActive, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 mb-1 text-sm font-medium transition-colors rounded-lg ${isActive ? "bg-[#1E232F] text-[#818cf8]" : "text-gray-400 hover:text-white hover:bg-[#151A23]"
      }`}
  >
    <Icon size={20} className="mr-3" />
    {label}
  </button>
);

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-[#151A23] rounded-xl border border-[#1E232F] p-6 ${className}`}>{children}</div>
);

const Badge = ({ status }: { status: Application["status"] }) => {
  const styles = {
    Interview: "bg-yellow-500/20 text-yellow-500",
    Rejected: "bg-red-500/20 text-red-500",
    Applied: "bg-blue-500/20 text-blue-500",
    Offer: "bg-green-500/20 text-green-500",
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
};

// --- Views ---

const ResumeTailorView = () => {
  const [resume, setResume] = useState<ResumeData>(INITIAL_RESUME);
  const [jobDesc, setJobDesc] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Try to load API Key from env if available (simulated)
  useEffect(() => {
    // Fetch profile from backend
    fetch('http://127.0.0.1:5000/profile')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setResume(data);
      })
      .catch(err => console.error("Failed to load profile:", err));
  }, []);

  const handleGenerate = async () => {
    if (!apiKey) {
      alert("Please enter a Gemini API Key to use the Resume Tailor.");
      return;
    }
    setIsGenerating(true);
    try {
      const newResume = await tailorResume(resume, jobDesc, apiKey);
      setResume(newResume);
    } catch (e) {
      alert("Error generating resume: " + e);
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:5000/upload_resume', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setResume(data);
      alert("Resume parsed successfully!");
    } catch (err) {
      alert("Upload failed: " + err);
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handlePrint = () => {
    // Check if we have data to print
    if (!resume) {
      alert('No resume data to print');
      return;
    }

    // Generate filename
    let fileName = 'Resume';
    try {
      const name = resume.personalInfo.name;
      if (name && name.trim()) {
        const parts = name.trim().split(/\s+/);
        const lastName = parts[parts.length - 1] || '';
        const firstNames = parts.slice(0, -1).join('') || '';
        fileName = `${lastName}${firstNames}_CV`.replace(/[^a-zA-Z0-9_]/g, '');
      }
    } catch (e) {
      console.error('Error generating filename', e);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the resume');
      return;
    }

    // Generate clean HTML for printing
    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    /* Page Setup */
    @page {
      size: A4 portrait;
      /* Using standard margins ensures every page (including 2, 3...) has proper white space at top/bottom.
         This fixes the "content touching edge" issue on subsequent pages. */
      margin: 12mm 15mm; 
    }
    
    html, body {
      width: 210mm;
      height: 100%;
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: white;
      font-size: 11pt;
      line-height: 1.4;
    }
    
    /* Main wrapper */
    .print-container {
      width: 100%;
      /* Removed padding here because @page handles the physical margins now. */
      padding: 0; 
      margin: 0 auto;
      box-sizing: border-box;
    }
    
    /* Reset margins */
    h1, h2, h3, h4, p, ul, li, div, span, table, tr, td, header, section {
      margin: 0;
      padding: 0;
    }
    
    ul {
      margin-left: 18px;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
    }
    
    /* ============================================
       Header Styling
    ============================================ */
    header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 10pt;
      margin-bottom: 12pt;
    }
    
    header h1 {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1pt;
      margin-bottom: 2pt;
    }
    
    header h2 {
      font-size: 12pt;
      font-weight: normal;
      color: #444;
      margin-bottom: 6pt;
    }
    
    header .contact {
      font-size: 9pt;
      color: #333;
    }

    /* ============================================
       Section & Layout Styling
    ============================================ */
    section {
      margin-bottom: 12pt;
      /* Allow breaking to fill pages */
      page-break-inside: auto; 
    }
    
    section h3 {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #999;
      padding-bottom: 2pt;
      margin-bottom: 6pt;
      letter-spacing: 0.5pt;
      
      page-break-after: avoid; 
    }
    
    /* ============================================
       Component Specifics
    ============================================ */
    
    /* Skills */
    .skills-table {
      width: 100%;
      font-size: 10pt;
    }
    .skills-table td {
      vertical-align: top;
      padding-bottom: 2pt;
    }
    
    /* Jobs */
    .job {
      margin-bottom: 10pt;
      /* Keep individual job entries together */
      page-break-inside: avoid; 
    }
    
    .job-header {
      font-weight: bold;
      font-size: 11pt;
    }
    .job-header .location {
      font-weight: normal;
      color: #555;
    }
    
    .job-title {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      margin-bottom: 3pt;
    }
    .job-title .role {
      font-weight: 600;
      text-decoration: underline;
    }
    .job-title .dates {
      font-style: italic;
      color: #555;
    }
    
    .job-desc {
      font-size: 10pt;
      font-style: italic;
      color: #444;
      margin-bottom: 3pt;
    }
    
    /* Education */
    .edu-item {
      margin-bottom: 8pt;
      page-break-inside: avoid;
    }
    .edu-degree {
      font-weight: bold;
      font-size: 10pt;
    }
    .edu-details {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      color: #444;
    }
    .edu-extra {
      font-size: 10pt;
      padding-left: 8pt;
      border-left: 2pt solid #ddd;
      margin-top: 2pt;
    }
    
    .summary-text {
      font-size: 10pt;
      text-align: justify;
    }

    /* Orphan/Widow control */
    p, li {
      orphans: 3;
      widows: 3;
    }
    
    /* Ensure content flows nicely */
    ul {
      page-break-inside: auto;
    }
    li {
      page-break-inside: avoid;
    }

  </style>
</head>
<body>
  <div class="print-container">
    <header>
      <h1>${resume.personalInfo.name}</h1>
      <h2>${resume.personalInfo.title}</h2>
      <div class="contact">
        ${resume.personalInfo.address} &nbsp;|&nbsp; ${resume.personalInfo.phone} &nbsp;|&nbsp; ${resume.personalInfo.email}
      </div>
    </header>
    
    <section>
      <h3>Summary</h3>
      <p class="summary-text">${resume.summary}</p>
    </section>
    
    <section>
      <h3>Key Skills</h3>
      <table class="skills-table">
        ${resume.skills.map(skill => `
          <tr>
            <td>${skill.category}:</td>
            <td>${skill.items.join(', ')}</td>
          </tr>
        `).join('')}
      </table>
    </section>
    
    <section>
      <h3>Professional Experience</h3>
      ${resume.experience.map(exp => `
        <div class="job">
          <div class="job-header">
            ${exp.company} <span class="location">| ${exp.location}</span>
          </div>
          <div class="job-title">
            <span class="role">${exp.role}</span>
            <span class="dates">${exp.dates}</span>
          </div>
          ${exp.description ? `<div class="job-desc">${exp.description}</div>` : ''}
          <ul>
            ${exp.bullets.map(bullet => {
      const colonIdx = bullet.indexOf(':');
      if (colonIdx > 0 && colonIdx < 35) {
        return `<li><strong>${bullet.substring(0, colonIdx)}:</strong>${bullet.substring(colonIdx + 1)}</li>`;
      }
      return `<li>${bullet}</li>`;
    }).join('')}
          </ul>
        </div>
      `).join('')}
    </section>
    
    <section>
      <h3>Education</h3>
      ${resume.education.map(edu => `
        <div class="edu-item">
          <div class="edu-degree">${edu.degree}</div>
          <div class="edu-details">
            <span>${edu.institution} | ${edu.location}</span>
            <span style="font-style: italic;">${edu.dates}</span>
          </div>
          ${edu.details.map(d => `<div class="edu-extra">${d}</div>`).join('')}
        </div>
      `).join('')}
    </section>
    
    ${(resume as any).technicalSetup && (resume as any).technicalSetup.length > 0 ? `
      <section>
        <h3>Technical Setup (Remote Work)</h3>
        <ul>
          ${(resume as any).technicalSetup.map((item: string) => `<li>${item}</li>`).join('')}
        </ul>
      </section>
    ` : ''}
    
    ${(resume as any).additionalInfo && (resume as any).additionalInfo.length > 0 ? `
      <section>
        <h3>Additional Information</h3>
        <ul>
          ${(resume as any).additionalInfo.map((item: string) => `<li>${item}</li>`).join('')}
        </ul>
      </section>
    ` : ''}
  </div>
  
  <script>
    window.onload = function() {
      // Small delay to ensure styles are applied
      setTimeout(function() {
        window.print();
        window.onafterprint = function() {
          window.close();
        };
      }, 100);
    };
  </script>
</body>
</html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Input Panel */}
      <div className="w-1/3 min-w-[350px] border-r border-[#1E232F] flex flex-col p-6 overflow-y-auto bg-[#0B0E14]">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileEdit className="text-[#818cf8]" /> SmartCV Tailor
        </h2>

        <div className="mb-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full bg-[#1E232F] hover:bg-[#2A303C] text-sm text-gray-300 py-3 rounded-lg border border-dashed border-gray-600 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
          >
            {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Upload size={16} />}
            {isUploading ? "Parsing CV..." : "Upload Existing Resume (PDF/Img)"}
          </button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Gemini API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-[#151A23] border border-[#1E232F] text-white p-2 rounded text-sm"
            placeholder="Enter API Key"
          />
        </div>

        <div className="mb-4 flex-1 flex flex-col">
          <label className="text-sm text-gray-300 mb-2">Target Job Description</label>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            className="flex-1 bg-[#151A23] border border-[#1E232F] text-white p-3 rounded-lg resize-none text-sm focus:border-[#818cf8] focus:outline-none"
            placeholder="Paste the job description here..."
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-[#818cf8] hover:bg-[#6366f1] disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
        >
          {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Zap size={16} />}
          {isGenerating ? "Tailoring..." : "Tailor Resume"}
        </button>
      </div>

      {/* Right Panel: Preview */}
      <div className="flex-1 bg-[#151A23] relative flex flex-col">
        {/* Toolbar */}
        <div className="absolute top-4 right-8 z-10 print:hidden">
          <button
            onClick={handlePrint}
            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg"
          >
            <Upload size={16} className="rotate-180" /> Save as PDF
          </button>
        </div>

        {/* Scrollable Area */}
        <div
          ref={previewContainerRef}
          className="flex-1 overflow-auto print:hidden"
          style={{
            backgroundColor: '#4a5568',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <ResumePaper data={resume} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LiveAgentView = () => {
  const [isLive, setIsLive] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Offline");
  const [logs, setLogs] = useState<string[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [jobQuery, setJobQuery] = useState("Software Engineer");
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/state');
        const data = await res.json();
        setIsLive(data.active);
        setAgentStatus(data.status);
        setLogs(data.logs || []);
        if (data.latest_screenshot) {
          setScreenshot(data.latest_screenshot);
        }
      } catch (e) {
        setAgentStatus("Backend Disconnected");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const toggleAgent = async () => {
    const command = isLive ? "stop" : "start";
    const task = isLive ? null : `Browse https://testdevjobs.com/ for '${jobQuery}' jobs and apply.`;

    try {
      await fetch('http://127.0.0.1:5000/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, task })
      });
      setIsLive(!isLive);
    } catch (e) {
      alert("Failed to connect to agent backend. Make sure orchestrator.py is running.");
    }
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal className="text-[#818cf8]" />
            Live Agent Control
          </h2>
          <p className="text-gray-400 text-sm">Monitor real-time browser automation and decision making.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#151A23] border border-[#1E232F] rounded-lg px-3 py-2">
            <Search size={14} className="text-gray-400 mr-2" />
            <input
              type="text"
              value={jobQuery}
              onChange={(e) => setJobQuery(e.target.value)}
              placeholder="Job Title (e.g. React Developer)"
              className="bg-transparent border-none text-sm text-white focus:outline-none w-64"
              disabled={isLive}
            />
          </div>
          <button
            onClick={toggleAgent}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isLive ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50'}`}
          >
            {isLive ? <Pause size={16} /> : <Play size={16} />}
            {isLive ? "Stop Agent" : "Start Agent"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <Card className="flex-1 p-0 overflow-hidden relative border-[#818cf8]/30 flex flex-col">
            <div className="bg-[#0B0E14] px-4 py-2 border-b border-[#1E232F] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Globe size={12} />
                <span>{agentStatus === "Surfing" ? "Agent is browsing..." : "System Idle"}</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
              </div>
            </div>
            <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
              {screenshot ? (
                <img src={`data:image/png;base64,${screenshot}`} alt="Live Agent View" className="w-full h-full object-contain" />
              ) : (
                <div className="text-gray-600 flex flex-col items-center gap-3">
                  {isLive ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#818cf8]"></div>
                      <span>Waiting for visual feed...</span>
                    </>
                  ) : (
                    <>
                      <Monitor size={48} />
                      <span>Agent Offline</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-[#0B0E14]">
            <div className="p-3 border-b border-[#1E232F] bg-[#151A23] flex items-center gap-2">
              <Cpu size={16} className="text-[#818cf8]" />
              <span className="text-sm font-medium text-white">Neural Engine Logs</span>
            </div>
            <div className="flex-1 p-4 font-mono text-xs space-y-3 overflow-y-auto text-gray-300">
              {logs.length === 0 && (
                <span className="text-gray-600 italic">No logs available. Connect to backend...</span>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[#818cf8]">{log}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </Card>
        </div>
      </div>
    </div >
  );
};

const DashboardView = () => (
  <div className="grid grid-cols-12 gap-6 p-6 h-full overflow-y-auto">
    <Card className="col-span-12 lg:col-span-8 h-80 relative flex flex-col justify-between">
      <h3 className="text-lg font-semibold text-white mb-4">Application Success Rate</h3>
      <div className="flex-1 w-full h-full relative flex items-end">
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
          <defs>
            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,50 L0,45 C20,40 40,35 50,25 C60,15 80,10 100,5 L100,50 Z" fill="url(#gradient)" />
          <path d="M0,45 C20,40 40,35 50,25 C60,15 80,10 100,5" fill="none" stroke="#10b981" strokeWidth="0.5" strokeLinecap="round" />
        </svg>
      </div>
    </Card>

    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Active Campaigns</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1 text-gray-300">
              <span>Tech Roles (Senior)</span>
              <span className="text-gray-500">90%</span>
            </div>
            <div className="w-full bg-[#0B0E14] rounded-full h-2">
              <div className="bg-[#10b981] h-2 rounded-full" style={{ width: "90%" }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1 text-gray-300">
              <span>Marketing Lead</span>
              <span className="text-gray-500">75%</span>
            </div>
            <div className="w-full bg-[#0B0E14] rounded-full h-2">
              <div className="bg-[#10b981] h-2 rounded-full" style={{ width: "75%" }}></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

// --- Main App ---

export default function XapplyApp() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [profileData, setProfileData] = useState<ResumeData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Check auth & onboarding status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('xapply_token');

      // If we have a token, validate it
      if (storedToken) {
        try {
          const authRes = await fetch('http://127.0.0.1:5000/auth/me', {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          if (authRes.ok) {
            setAuthToken(storedToken);
            // Load profile
            const profileRes = await fetch('http://127.0.0.1:5000/profile', {
              headers: { 'Authorization': `Bearer ${storedToken}` }
            });
            if (profileRes.ok) setProfileData(await profileRes.json());
            setHasOnboarded(true);
            return;
          }
        } catch (err) {
          console.error('Auth check failed', err);
        }
      }

      // No valid token - check basic onboarding status
      try {
        const res = await fetch('http://127.0.0.1:5000/onboarding');
        const data = await res.json();
        setHasOnboarded(data.hasOnboarded);
        if (data.hasOnboarded) {
          const profileRes = await fetch('http://127.0.0.1:5000/profile');
          setProfileData(await profileRes.json());
        }
      } catch (err) {
        console.error('Failed to check onboarding status', err);
        setHasOnboarded(false);
      }
    };
    checkAuth();
  }, []);

  const handleOnboardingComplete = (data: ResumeData, token: string) => {
    setProfileData(data);
    setAuthToken(token);
    setHasOnboarded(true);
  };

  // Show loading while checking
  if (hasOnboarded === null) {
    return (
      <div className="h-screen w-full bg-[#0B0E14] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#818cf8]"></div>
      </div>
    );
  }

  // Show onboarding wizard if not onboarded
  if (!hasOnboarded) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex h-screen w-full bg-[#0B0E14] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-[#1E232F] flex flex-col shrink-0 bg-[#0B0E14]">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#6366f1] to-[#10b981] rounded-lg flex items-center justify-center text-white font-bold">X</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Xapply</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" isActive={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} />
          <SidebarItem icon={User} label="My Profile" isActive={activeView === "profile"} onClick={() => setActiveView("profile")} />
          <SidebarItem icon={Terminal} label="Live Agent" isActive={activeView === "live-agent"} onClick={() => setActiveView("live-agent")} />
          <SidebarItem icon={FileEdit} label="SmartCV Tailor" isActive={activeView === "resume-tailor"} onClick={() => setActiveView("resume-tailor")} />
          <SidebarItem icon={Search} label="Job Search" isActive={activeView === "job-search"} onClick={() => setActiveView("job-search")} />
          <SidebarItem icon={History} label="History" isActive={activeView === "history"} onClick={() => setActiveView("history")} />
          <SidebarItem icon={Settings} label="Settings" isActive={activeView === "ai-settings"} onClick={() => setActiveView("ai-settings")} />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-[#1E232F] flex items-center justify-between px-6 bg-[#0B0E14] shrink-0">
          <h2 className="text-xl font-semibold capitalize">{activeView.replace("-", " ")}</h2>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {activeView === "dashboard" && <DashboardView />}
          {activeView === "profile" && <ProfileView initialData={profileData || undefined} onSave={setProfileData} />}
          {activeView === "live-agent" && <LiveAgentView />}
          {activeView === "resume-tailor" && <ResumeTailorView />}
          {activeView === "job-search" && <div className="p-6 text-gray-500">Job Search Placeholder</div>}
          {activeView === "ai-settings" && <div className="p-6 text-gray-500">Settings Placeholder</div>}
          {activeView === "history" && <div className="p-6 text-gray-500">History Placeholder</div>}
        </main>
      </div>
    </div>
  );
}