'use client';

import Link from 'next/link';
import { ShieldCheck, LogOut, ExternalLink } from 'lucide-react';

type AdminNavbarProps = {
  onLogout?: () => void;
  isAuthenticated?: boolean;
};

export default function AdminNavbar({ onLogout, isAuthenticated = false }: AdminNavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Admin Badge */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900">
                BestFit<span className="text-indigo-600">.ai</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                Recruiter Console
              </span>
            </div>
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            <span>Live Portal</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          {isAuthenticated && onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}