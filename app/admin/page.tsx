'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import { 
  Lock, 
  FileText, 
  ChevronRight, 
  Users, 
  ChevronDown, 
  // CheckCircle, 
  AlertTriangle, 
  PlusCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Sparkles, 
  Calendar, 
  Search,
  // ExternalLink,
  Award
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

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleLogin = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (passcode === 'admin@123') {
      setIsAuthenticated(true);
      setPassError('');
    } else {
      setPassError('Invalid passcode. Access restricted.');
    }
  };

  const handleCreateJob = async (e: React.SubmitEvent<HTMLFormElement>) => {
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

  const filteredApps = useMemo(() => {
    return applications.filter(app => 
      app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.current_location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [applications, searchTerm]);

  const stats = useMemo(() => {
    const total = applications.length;
    const highFit = applications.filter(a => (a.llm_score || 0) >= 80).length;
    const midFit = applications.filter(a => (a.llm_score || 0) >= 50 && (a.llm_score || 0) < 80).length;
    const lowFit = applications.filter(a => (a.llm_score || 0) < 50).length;
    return { total, highFit, midFit, lowFit };
  }, [applications]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl space-y-6 text-white">
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Lock className="w-7 h-7 text-indigo-300" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Recruiter Command Center</h1>
            <p className="text-xs text-slate-300">Enter authenticated credentials to inspect LLM candidate rankings.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter Passcode"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white placeholder-slate-400 text-sm"
              />
              {passError && <p className="text-rose-400 text-xs mt-2">{passError}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
            >
              Authenticate Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Left Column: Jobs Management */}
        <div className="md:w-80 flex-shrink-0 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> Role Directory
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1 transition-colors border border-indigo-200"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Post Role
            </button>
          </div>

          {/* Job List Cards */}
          <div className="space-y-2.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {jobs.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              return (
                <button
                  key={job.id}
                  onClick={() => loadApplications(job)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative ${
                    isSelected
                      ? 'bg-white border-indigo-600 shadow-md ring-1 ring-indigo-600'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-4">
                      <p className={`font-semibold text-sm line-clamp-1 ${isSelected ? 'text-indigo-600' : 'text-slate-800'}`}>
                        {job.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{job.company}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform text-slate-400 group-hover:translate-x-0.5 ${isSelected ? 'text-indigo-600' : ''}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Applications & Insights */}
        <div className="flex-1 min-w-0">
          {selectedJob ? (
            <div className="space-y-6">
              {/* Job Header Info Banner */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Active Evaluation
                      </span>
                      <span className="text-xs text-slate-400">• {selectedJob.company}</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">{selectedJob.title}</h1>
                  </div>

                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs font-semibold px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors list-none flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> View JD Source
                    </summary>
                    <div className="absolute left-6 right-6 mt-3 p-5 bg-white rounded-xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto z-20 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {selectedJob.description}
                    </div>
                  </details>
                </div>

                {/* Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
                  <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Evaluated</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
                  </div>
                  <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Strong Fit (80+)</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.highFit}</p>
                  </div>
                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100">
                    <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Mid Fit (50-79)</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{stats.midFit}</p>
                  </div>
                  <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-100">
                    <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Mismatch (&lt;50)</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1">{stats.lowFit}</p>
                  </div>
                </div>
              </div>

              {/* Candidate Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search candidate, location, email..."
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm"
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Showing {filteredApps.length} of {applications.length} Applicants
                </p>
              </div>

              {/* Candidate Stack */}
              <div className="space-y-4">
                {filteredApps.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-semibold">No applications found.</p>
                    <p className="text-xs text-slate-400 mt-1">Check back later or adjust your search filter.</p>
                  </div>
                ) : (
                  filteredApps.map((app) => {
                    const score = app.llm_score || 0;
                    const isHigh = score >= 80;
                    const isMid = score >= 50 && score < 80;
                    const isExpanded = expandedApp === app.id;

                    const badgeColors = isHigh
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                      : isMid
                      ? 'bg-amber-500 text-white shadow-amber-500/20'
                      : 'bg-rose-500 text-white shadow-rose-500/20';

                    return (
                      <div
                        key={app.id}
                        className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                          isExpanded ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Header Row */}
                        <div
                          onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 select-none"
                        >
                          <div className="flex items-center gap-4">
                            {/* Score Display Card */}
                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-md ${badgeColors}`}>
                              <span className="text-lg leading-none">{score}</span>
                              <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80 mt-0.5">Score</span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">{app.full_name}</h3>
                                {isHigh && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    <Award className="w-3 h-3" /> Top Choice
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {app.current_location || 'Not Specified'}
                                </span>
                                <span>•</span>
                                <span>{app.age} yrs old</span>
                                {app.created_at && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-slate-400">
                                      <Calendar className="w-3.5 h-3.5" />
                                      {new Date(app.created_at).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="hidden sm:block text-xs font-semibold text-indigo-600 hover:underline">
                              {isExpanded ? 'Collapse' : 'Review Report'}
                            </span>
                            <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Breakdown */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/60 p-6 space-y-6">
                            {/* Contact Details Pill Strip */}
                            <div className="flex flex-wrap gap-2.5">
                              <a
                                href={`mailto:${app.email}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                              >
                                <Mail className="w-3.5 h-3.5 text-slate-400" /> {app.email}
                              </a>
                              <a
                                href={`tel:${app.phone}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {app.phone}
                              </a>
                            </div>

                            {/* Evaluation Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Executive Summary */}
                              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                                  <Sparkles className="w-4 h-4 text-indigo-500" /> Executive AI Fit Summary
                                </h4>
                                <p className="text-xs text-slate-700 leading-relaxed flex-1">
                                  {app.llm_summary || 'No summary synthesized.'}
                                </p>
                              </div>

                              {/* Gaps & Interview Probes */}
                              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Flags & Follow-up Probes
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
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-slate-400 shadow-sm p-6 text-center">
              <FileText className="w-12 h-12 mb-3 text-slate-300" />
              <p className="font-semibold text-sm text-slate-600">Select a Job Position</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose a posting from the left directory to inspect applicant rankings, fit scores, and interview guidelines.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Create Job Slide-over Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Post New Role</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Job Title</label>
                <input
                  required
                  name="title"
                  placeholder="e.g. Chief of Staff"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Company</label>
                <input
                  required
                  name="company"
                  placeholder="e.g. Satva Partners"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description & Requirements</label>
                <textarea
                  required
                  name="description"
                  placeholder="Provide core competencies, responsibilities, and qualifications for the AI screener..."
                  rows={5}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-1/2 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}