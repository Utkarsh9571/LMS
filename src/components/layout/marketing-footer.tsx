import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 py-8 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          &copy; {new Date().getFullYear()} LMS Platform. All rights reserved.
        </div>
        <div className="flex gap-6 text-sm text-slate-600 dark:text-slate-400">
          <Link href="/courses" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Courses
          </Link>
          <Link href="/about" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            About Platform
          </Link>
        </div>
      </div>
    </footer>
  );
}
