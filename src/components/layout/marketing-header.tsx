import Link from 'next/link';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backneed-blur-md dark:border-slate-800 dark:bg-slate-950/80 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-blue-600 dark:text-blue-400">LMS</span>
          <span className="text-slate-900 dark:text-white">Platform</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Link href="/courses" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Courses
          </Link>
          <Link href="/about" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            About
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-700 outline-none hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
