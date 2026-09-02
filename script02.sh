#!/bin/bash
# Part 2: APIs, Pages, Components

mkdir -p app/api/admin/jobs/\[id\]/applications
cat << 'EOF' > app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, company, description } = body;

    if (!title || !company || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert([{ title, company, description }])
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, job: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
EOF

cat << 'EOF' > app/api/apply/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTextFromDocx } from '@/lib/parseDocx';
import { evaluateResume } from '@/lib/groq';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const jobId = formData.get('jobId') as string;
    const fullName = formData.get('fullName') as string;
    const address = formData.get('address') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const age = parseInt(formData.get('age') as string, 10);
    const currentLocation = formData.get('currentLocation') as string;
    const resumeFile = formData.get('resume') as File;

    if (!jobId || !fullName || !address || !phone || !email || !age || !currentLocation || !resumeFile) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (!resumeFile.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Only .docx files are allowed.' }, { status: 400 });
    }

    // Parse the docx
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let resumeText = '';
    try {
      resumeText = await extractTextFromDocx(buffer);
    } catch (e) {
      return NextResponse.json({ error: 'Could not read DOCX file. It might be corrupted.' }, { status: 400 });
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json({ error: 'The uploaded resume is empty.' }, { status: 400 });
    }

    // Get the job description to evaluate against
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('description')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    // Evaluate using Groq LLM (This is completely server-side, keeping results private)
    let evaluation = { summary: null, score: null, gaps: null };
    try {
      evaluation = await evaluateResume(resumeText, job.description);
    } catch (e) {
      console.error("Evaluation failed, but continuing with application insertion.", e);
    }

    // Insert the application into Supabase
    const { error: insertError } = await supabase
      .from('applications')
      .insert([{
        job_id: jobId,
        full_name: fullName,
        address,
        phone,
        email,
        age,
        current_location: currentLocation,
        resume_text: resumeText,
        llm_summary: evaluation.summary,
        llm_score: evaluation.score,
        llm_gaps: evaluation.gaps
      }]);

    if (insertError) {
      throw insertError;
    }

    // Do NOT send the score back to the client.
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Apply error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
EOF

cat << 'EOF' > app/api/admin/jobs/[id]/applications/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('job_id', id)
    .order('llm_score', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data });
}
EOF

cat << 'EOF' > components/Navbar.tsx
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-slate-800">Resume Screener</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">
              Candidate Portal
            </Link>
            <Link href="/admin" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">
              Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
EOF

cat << 'EOF' > app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Briefcase, Building, UploadCloud, CheckCircle2 } from 'lucide-react';

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
};

export default function CandidatePortal() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        if (data.jobs) setJobs(data.jobs);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedJob) return;
    
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.append('jobId', selectedJob.id);

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-semibold text-slate-900">Application Received</h2>
            <p className="text-slate-600">Thanks, we've received your application. We'll reach out soon.</p>
            <button 
              onClick={() => { setSubmitSuccess(false); setSelectedJob(null); }}
              className="mt-6 w-full py-2 px-4 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              Back to Job Board
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Open Positions</h1>
          <p className="mt-2 text-slate-600">Select a job to apply.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Job List */}
          <div className="md:col-span-5 space-y-4">
            {isLoading ? (
              <p className="text-slate-500">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <p className="text-slate-500">No open positions right now.</p>
            ) : (
              jobs.map(job => (
                <div 
                  key={job.id} 
                  onClick={() => setSelectedJob(job)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedJob?.id === job.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <h3 className="font-semibold text-lg text-slate-900">{job.title}</h3>
                  <div className="flex items-center text-slate-500 mt-2 space-x-2 text-sm">
                    <Building className="w-4 h-4" />
                    <span>{job.company}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Application Form */}
          <div className="md:col-span-7">
            {selectedJob ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-xl font-semibold text-slate-900">Apply for {selectedJob.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">at {selectedJob.company}</p>
                </div>
                
                <form onSubmit={handleApply} className="p-6 space-y-5">
                  {error && (
                    <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-100">
                      {error}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Full Name</label>
                      <input required name="fullName" type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Email Address</label>
                      <input required name="email" type="email" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Phone Number</label>
                      <input required name="phone" type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Age</label>
                      <input required name="age" type="number" min="16" max="100" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Address</label>
                    <input required name="address" type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Current Location (City, Country)</label>
                    <input required name="currentLocation" type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900" />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-sm font-medium text-slate-700">Resume Upload (.docx ONLY)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition-colors">
                      <div className="space-y-1 text-center">
                        <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600 justify-center">
                          <label htmlFor="resume-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-1">
                            <span>Upload a file</span>
                            <input id="resume-upload" name="resume" type="file" accept=".docx" required className="sr-only" />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500">DOCX up to 5MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 border-dashed text-slate-500">
                <Briefcase className="w-12 h-12 mb-4 text-slate-300" />
                <p>Select a job from the list to view details and apply.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
EOF

cat << 'EOF' > app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
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
EOF
