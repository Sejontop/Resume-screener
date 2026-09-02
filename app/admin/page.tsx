'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { Lock, FileText, ChevronRight, Users, ChevronDown, CheckCircle, AlertTriangle } from 'lucide-react';

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
  
  const [isCreating, setIsCreating] = useState(false);
  
  // Fetch Jobs
  useEffect(() => {
    if (isAuthenticated) {
      fetchJobs();
    }
  }, [isAuthenticated]);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin@123') {
      setIsAuthenticated(true);
      setPassError('');
    } else {
      setPassError('Incorrect passcode');
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-sm w-full space-y-6">
          <div className="text-center">
            <div className="mx-auto bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-slate-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Admin Access</h1>
            <p className="text-sm text-slate-500 mt-1">Enter passcode to view candidate evaluations.</p>
          </div>
          
          <div>
            <input 
              type="password" 
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode" 
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-slate-900"
            />
            {passError && <p className="text-red-500 text-sm mt-2">{passError}</p>}
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded-md hover:bg-slate-800 transition-colors">
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar - Jobs List & Creator */}
        <div className="md:w-1/3 flex flex-col gap-6">
          
          {/* Create Job Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-2" /> Post New JD
            </h2>
            <form onSubmit={handleCreateJob} className="space-y-3">
              <input required name="title" placeholder="Job Title" className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md text-slate-900" />
              <input required name="company" placeholder="Company Name" className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md text-slate-900" />
              <textarea required name="description" placeholder="Full Job Description..." rows={4} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md text-slate-900"></textarea>
              <button disabled={isCreating} type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {isCreating ? 'Posting...' : 'Post Job'}
              </button>
            </form>
          </div>

          {/* Jobs List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Active Jobs</h2>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{jobs.length}</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {jobs.map(job => (
                <button 
                  key={job.id}
                  onClick={() => loadApplications(job)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex justify-between items-center ${selectedJob?.id === job.id ? 'bg-blue-50/50' : ''}`}
                >
                  <div>
                    <p className="font-medium text-slate-900 truncate">{job.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{job.company}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content - Applications */}
        <div className="md:w-2/3">
          {selectedJob ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h1 className="text-2xl font-bold text-slate-900">{selectedJob.title}</h1>
                <p className="text-slate-600">{selectedJob.company}</p>
                
                <details className="mt-4 text-sm text-slate-600">
                  <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">View Full Job Description</summary>
                  <div className="mt-3 p-4 bg-slate-50 rounded-md whitespace-pre-wrap border border-slate-100">
                    {selectedJob.description}
                  </div>
                </details>
              </div>

              <div className="p-6 bg-slate-50/50 min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 flex items-center">
                    <Users className="w-4 h-4 mr-2" /> Candidates ({applications.length})
                  </h3>
                  <span className="text-xs text-slate-500">Ranked by LLM Score</span>
                </div>

                {applications.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed text-slate-500">
                    No applications received yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map(app => (
                      <div key={app.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        {/* Header Row */}
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                          onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                              app.llm_score >= 80 ? 'bg-green-100 text-green-700' :
                              app.llm_score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {app.llm_score || 0}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-lg">{app.full_name}</h4>
                              <p className="text-sm text-slate-500">{app.current_location} • {app.age} yrs</p>
                            </div>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedApp === app.id ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Expanded Content */}
                        {expandedApp === app.id && (
                          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><span className="font-medium text-slate-700">Email:</span> {app.email}</div>
                              <div><span className="font-medium text-slate-700">Phone:</span> {app.phone}</div>
                            </div>
                            
                            <div className="space-y-3 pt-2">
                              <div className="bg-white p-3 rounded-md border border-slate-200 shadow-sm">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
                                  <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> AI Fit Summary
                                </h5>
                                <p className="text-sm text-slate-800">{app.llm_summary || 'No summary generated.'}</p>
                              </div>
                              
                              <div className="bg-white p-3 rounded-md border border-slate-200 shadow-sm">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
                                  <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" /> Gaps & Interview Questions
                                </h5>
                                <p className="text-sm text-slate-800 whitespace-pre-wrap">{app.llm_gaps || 'No gaps analyzed.'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm text-slate-500">
              Select a job to view candidates.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
