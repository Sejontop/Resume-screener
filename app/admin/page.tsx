'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import AdminNavbar from './AdminNavbar';
import { 
  Lock, 
  FileText, 
  ChevronRight, 
  Users, 
  ChevronDown, 
  AlertTriangle, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  Sparkles, 
  Calendar, 
  Search, 
  Award, 
  Filter, 
  Copy, 
  Check 
} from 'lucide-react';

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  _count?: { applications: number };
};

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  current_location: string;
  llm_summary: string;
  llm_score: number;
  llm_gaps: string;
  created_at: string;
};

const SESSION_KEY = 'admin_authenticated';
const TIMESTAMP_KEY = 'admin_auth_timestamp';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 hours

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
    setIsAuthenticated(false);
    setSelectedJob(null);
    setApplications([]);
  }, []);

  const updateActivityTimestamp = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
    }
  }, []);

  // Check existing session on load & handle 2-hour timeout
  useEffect(() => {
    const isAuth = localStorage.getItem(SESSION_KEY);
    const lastActivity = localStorage.getItem(TIMESTAMP_KEY);

    if (isAuth === 'true' && lastActivity) {
      const timePassed = Date.now() - parseInt(lastActivity, 10);
      if (timePassed < TWO_HOURS_MS) {
        setIsAuthenticated(true);
        updateActivityTimestamp();
      } else {
        handleLogout();
      }
    }
  }, [handleLogout, updateActivityTimestamp]);

  // Keep session active on user events
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleInteraction = () => {
      updateActivityTimestamp();
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('scroll', handleInteraction);

    const interval = setInterval(() => {
      const lastActivity = localStorage.getItem(TIMESTAMP_KEY);
      if (lastActivity && Date.now() - parseInt(lastActivity, 10) >= TWO_HOURS_MS) {
        handleLogout();
      }
    }, 60000);

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      clearInterval(interval);
    };
  }, [isAuthenticated, handleLogout, updateActivityTimestamp]);

  // Fetch jobs once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchJobs();
    }
  }, [isAuthenticated]);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
        if (!selectedJob && data.jobs.length > 0) {
          loadApplications(data.jobs[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passcode === 'admin@123') {
      localStorage.setItem(SESSION_KEY, 'true');
      localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
      setIsAuthenticated(true);
      setPassError('');
      setPasscode('');
    } else {
      setPassError('Invalid passcode. Recruiter verification failed.');
    }
  };

  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const company = formData.get('company') as string;
    const description = formData.get('description') as string;

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, company, description })
      });
      if (res.ok) {
        (e.target as HTMLFormElement).reset();
        setShowCreateModal(false);
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const loadApplications = async (job: Job) => {
    setSelectedJob(job);
    setExpandedApp(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/applications`);
      const data = await res.json();
      if (data.applications) {
        setApplications(data.applications);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = 
        app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.current_location?.toLowerCase().includes(searchTerm.toLowerCase());

      const score = app.llm_score || 0;
      if (!matchesSearch) return false;

      if (scoreFilter === 'high') return score >= 80;
      if (scoreFilter === 'mid') return score >= 50 && score < 80;
      if (scoreFilter === 'low') return score < 50;
      return true;
    });
  }, [applications, searchTerm, scoreFilter]);

  const stats = useMemo(() => {
    const total = applications.length;
    const highFit = applications.filter(a => (a.llm_score || 0) >= 80).length;
    const midFit = applications.filter(a => (a.llm_score || 0) >= 50 && (a.llm_score || 0) < 80).length;
    const lowFit = applications.filter(a => (a.llm_score || 0) < 50).length;
    return { total, highFit, midFit, lowFit };
  }, [applications]);

  // Auth gate lockscreen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Recruiter Console</h1>
            <p className="text-xs text-slate-500">Enter authenticated credentials to inspect AI evaluations.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter Passcode"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder-slate-400 text-sm transition-all"
              />
              {passError && <p className="text-rose-500 text-xs mt-2 font-medium">{passError}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold text-white text-xs transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98]"
            >
              Sign In to Command Center
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900 antialiased">
      {/* Dedicated Admin Navbar with global Logout */}
      <AdminNavbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* Left Column: Job Directory */}
        <div className="lg:w-80 flex-shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Positions
              </h2>
              <p className="text-[11px] text-slate-400">Manage open roles and JD sources</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1 transition-all shadow-sm shadow-indigo-600/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Post Job
            </button>
          </div>

          {/* Job List Cards */}
          <div className="space-y-2 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
            {jobs.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              return (
                <div
                  key={job.id}
                  onClick={() => loadApplications(job)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-white border-indigo-600 shadow-md shadow-indigo-600/5 ring-1 ring-indigo-600'
                      : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-xs truncate ${isSelected ? 'text-indigo-600' : 'text-slate-800'}`}>
                        {job.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{job.company}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Applications & Candidate Metrics */}
        <div className="flex-1 min-w-0">
          {selectedJob ? (
            <div className="space-y-6">
              {/* Job Info Banner */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm shadow-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                        Active Ingestion
                      </span>
                      <span className="text-xs font-medium text-slate-400">• {selectedJob.company}</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">{selectedJob.title}</h1>
                  </div>

                  <details className="text-xs group relative">
                    <summary className="cursor-pointer font-semibold px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-all list-none flex items-center gap-1.5 shadow-sm">
                      <FileText className="w-3.5 h-3.5 text-slate-500" /> View JD
                    </summary>
                    <div className="absolute right-0 mt-2 p-5 bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 sm:w-96 max-h-96 overflow-y-auto z-20 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                      <div className="font-bold text-slate-900 mb-2 border-b pb-1">Evaluated Job Description</div>
                      {selectedJob.description}
                    </div>
                  </details>
                </div>

                {/* Stat Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
                  <div 
                    onClick={() => setScoreFilter('all')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      scoreFilter === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-800'
                    }`}
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${scoreFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Total Candidates</p>
                    <p className="text-xl font-extrabold mt-0.5">{stats.total}</p>
                  </div>

                  <div 
                    onClick={() => setScoreFilter(scoreFilter === 'high' ? 'all' : 'high')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      scoreFilter === 'high' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-emerald-50/70 hover:bg-emerald-50 border-emerald-100/80 text-emerald-900'
                    }`}
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${scoreFilter === 'high' ? 'text-emerald-100' : 'text-emerald-700'}`}>Strong Fit (80+)</p>
                    <p className="text-xl font-extrabold mt-0.5">{stats.highFit}</p>
                  </div>

                  <div 
                    onClick={() => setScoreFilter(scoreFilter === 'mid' ? 'all' : 'mid')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      scoreFilter === 'mid' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-amber-50/70 hover:bg-amber-50 border-amber-100/80 text-amber-900'
                    }`}
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${scoreFilter === 'mid' ? 'text-amber-100' : 'text-amber-700'}`}>Review (50-79)</p>
                    <p className="text-xl font-extrabold mt-0.5">{stats.midFit}</p>
                  </div>

                  <div 
                    onClick={() => setScoreFilter(scoreFilter === 'low' ? 'all' : 'low')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      scoreFilter === 'low' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-rose-50/70 hover:bg-rose-50 border-rose-100/80 text-rose-900'
                    }`}
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${scoreFilter === 'low' ? 'text-rose-100' : 'text-rose-700'}`}>Mismatch (&lt;50)</p>
                    <p className="text-xl font-extrabold mt-0.5">{stats.lowFit}</p>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search candidate, location, email..."
                    className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium self-end sm:self-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Showing {filteredApps.length} of {applications.length} candidates</span>
                </div>
              </div>

              {/* Candidate Stack */}
              <div className="space-y-3">
                {filteredApps.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500 shadow-sm">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-700">No matching applications</p>
                    <p className="text-xs text-slate-400 mt-1">Adjust your search term or click another filter card.</p>
                  </div>
                ) : (
                  filteredApps.map((app) => {
                    const score = app.llm_score || 0;
                    const isHigh = score >= 80;
                    const isMid = score >= 50 && score < 80;
                    const isExpanded = expandedApp === app.id;

                    const scoreStyle = isHigh
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-2 ring-emerald-500/20'
                      : isMid
                      ? 'bg-amber-50 text-amber-700 border-amber-200/80 ring-2 ring-amber-500/20'
                      : 'bg-rose-50 text-rose-700 border-rose-200/80 ring-2 ring-rose-500/20';

                    return (
                      <div
                        key={app.id}
                        className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                          isExpanded ? 'border-indigo-500 ring-1 ring-indigo-500/30 shadow-md' : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        {/* Summary Header Row */}
                        <div
                          onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 select-none transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Score Pill */}
                            <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center font-black ${scoreStyle}`}>
                              <span className="text-base leading-none">{score}</span>
                              <span className="text-[8px] uppercase tracking-wider font-bold opacity-75 mt-0.5">Score</span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">{app.full_name}</h3>
                                {isHigh && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Award className="w-3 h-3" /> Shortlisted
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" /> {app.current_location || 'Remote'}
                                </span>
                                <span>•</span>
                                <span>{app.age} yrs</span>
                                {app.created_at && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-slate-400">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(app.created_at).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="hidden sm:block text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                              {isExpanded ? 'Hide Analysis' : 'Full Evaluation'}
                            </span>
                            <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Detail Panel */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-[#FAFBFD] p-5 sm:p-6 space-y-5">
                            {/* Contact Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => handleCopyEmail(app.email)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                              >
                                {copiedEmail === app.email ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-600 font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{app.email}</span>
                                    <Copy className="w-3 h-3 text-slate-400 ml-1 opacity-70" />
                                  </>
                                )}
                              </button>

                              <a
                                href={`tel:${app.phone}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{app.phone}</span>
                              </a>
                            </div>

                            {/* Evaluation Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col">
                                <h4 className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI Executive Summary
                                </h4>
                                <p className="text-xs text-slate-700 leading-relaxed flex-1">
                                  {app.llm_summary || 'No summary synthesized.'}
                                </p>
                              </div>

                              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col">
                                <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Flags & Recommended Interview Questions
                                </h4>
                                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap flex-1">
                                  {app.llm_gaps || 'No structural gaps detected.'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 text-slate-400 shadow-sm p-6 text-center">
              <FileText className="w-10 h-10 mb-3 text-slate-300" />
              <p className="font-bold text-sm text-slate-700">No Job Selected</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Select an open position on the left to inspect applicant rankings, fit scores, and AI recommendations.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Create Job Slide-Over Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Post New Role</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wide">Job Title</label>
                <input
                  required
                  name="title"
                  placeholder="e.g. Chief of Staff"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wide">Company</label>
                <input
                  required
                  name="company"
                  placeholder="e.g. Satva Partners"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wide">Job Description & Qualifications</label>
                <textarea
                  required
                  name="description"
                  placeholder="Paste responsibilities, background prerequisites, and requirements..."
                  rows={5}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isCreating}
                  type="submit"
                  className="w-1/2 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isCreating ? 'Publishing...' : 'Publish Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}