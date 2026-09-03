'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  Briefcase, 
  Building2, 
  UploadCloud, 
  CheckCircle2, 
  ChevronRight, 
  FileCheck, 
  Sparkles, 
  X, 
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
};

export default function CandidatePortal() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        if (data.jobs) {
          setJobs(data.jobs);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleApply = async (e: React.SubmitEvent<HTMLFormElement>) => {
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
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmitSuccess(true);
      setIsApplying(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Application Transmitted</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Your profile and credentials for <span className="text-white font-medium">{selectedJob?.title}</span> have been delivered directly to the hiring team.
              </p>
            </div>
            <button
              onClick={() => {
                setSubmitSuccess(false);
                setSelectedJob(null);
                setSelectedFile(null);
              }}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
            >
              Back to Open Positions
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Hero */}
        <div className="max-w-3xl mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" /> High-Growth Openings
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Explore Open Opportunities
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Select an opening to review the role specifications, expectations, and criteria before submitting your application.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Job Directory */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Available Positions ({jobs.length})
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                No active openings currently available.
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => {
                        setSelectedJob(job);
                        setIsApplying(false);
                      }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                          : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className={`font-semibold text-base transition-colors ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                            {job.title}
                          </h3>
                          <div className="flex items-center text-xs text-slate-400 gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{job.company}</span>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 ${isSelected ? 'text-indigo-400' : ''}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Scrollable JD Viewer with Fixed Apply Action */}
          <div className="lg:col-span-7">
            {selectedJob ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[650px] relative">
                {/* Sticky Top Info Bar */}
                <div className="p-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between z-10">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                      Role Overview
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">{selectedJob.title}</h2>
                    <p className="text-xs text-slate-400">{selectedJob.company}</p>
                  </div>
                  <button
                    onClick={() => setIsApplying(true)}
                    className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                  >
                    Apply Now <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scrollable JD Content Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-300 leading-relaxed text-sm">
                  <div className="flex items-center gap-4 text-xs text-slate-400 pb-4 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Full-time Position
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Opening
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Job Description & Responsibilities</h4>
                    <div className="whitespace-pre-wrap font-normal text-xs leading-relaxed text-slate-300">
                      {selectedJob.description}
                    </div>
                  </div>
                </div>

                {/* Sticky Bottom Bar with Apply Button */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md flex items-center justify-between z-10">
                  <div className="text-xs text-slate-400 hidden sm:block">
                    Ready to be part of the team?
                  </div>
                  <button
                    onClick={() => setIsApplying(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
                  >
                    Apply for this Position <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[500px] flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-500 text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-center mb-3">
                  <Briefcase className="w-7 h-7 text-slate-600" />
                </div>
                <p className="text-base font-semibold text-slate-300">No Job Selected</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Click on any open role from the directory to review the complete JD and unlock the application form.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Slide-over Application Modal */}
      {isApplying && selectedJob && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden relative my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Candidate Application</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedJob.title}</h3>
                <p className="text-xs text-slate-400">{selectedJob.company}</p>
              </div>
              <button
                onClick={() => setIsApplying(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Application Form */}
            <form onSubmit={handleApply} className="p-6 sm:p-8 space-y-5 max-h-[75vh] overflow-y-auto">
              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Full Name</label>
                  <input
                    required
                    name="fullName"
                    placeholder="e.g. Maya Chen"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Email Address</label>
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="e.g. maya@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Phone Number</label>
                  <input
                    required
                    name="phone"
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Age</label>
                  <input
                    required
                    type="number"
                    min="16"
                    max="100"
                    name="age"
                    placeholder="26"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Residential Address</label>
                  <input
                    required
                    name="address"
                    placeholder="Street Address, Apt"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Current Location</label>
                  <input
                    required
                    name="currentLocation"
                    placeholder="City, Country"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Resume Upload Box */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-300">Resume (.docx format)</label>
                <div className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-2xl p-6 text-center transition-colors relative">
                  <input
                    id="resume"
                    name="resume"
                    type="file"
                    accept=".docx"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center pointer-events-none">
                    {selectedFile ? (
                      <>
                        <FileCheck className="w-8 h-8 text-emerald-400 mb-2" />
                        <span className="text-xs font-semibold text-white">{selectedFile.name}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click to swap file
                        </span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
                        <span className="text-xs font-medium text-slate-300">
                          Drop your resume file or <span className="text-indigo-400 underline">browse</span>
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1">Word Document (.docx) up to 5MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsApplying(false)}
                  className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Evaluating & Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}