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
