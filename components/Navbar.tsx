import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              BestFit<span className="text-indigo-400">.ai</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
              Careers Portal
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}