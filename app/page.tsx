'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
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
