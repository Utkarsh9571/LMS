'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  Menu,
  X,
  BookOpen,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Globe,
  Building2
} from 'lucide-react';

export function MarketingHeader() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Brand Logo & AEC Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-black text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-slate-900 dark:text-white font-extrabold">BIM ACADEMY</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 tracking-wider">
                AEC EDUCATION
              </span>
            </div>
          </Link>
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700/60">
            <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>SG & MY Markets</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
          <Link
            href="/"
            className={`px-3 py-2 rounded-lg transition-colors ${
              isActive('/')
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            Home
          </Link>
          <Link
            href="/courses"
            className={`px-3 py-2 rounded-lg transition-colors ${
              isActive('/courses')
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            Courses
          </Link>
          <Link
            href="/about"
            className={`px-3 py-2 rounded-lg transition-colors ${
              isActive('/about')
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            About
          </Link>
        </nav>

        {/* Desktop Right Action Area */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <Avatar name={user.fullName} size="sm" />
                <button
                  onClick={() => logout()}
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-3 pb-6 space-y-4 shadow-xl">
          <nav className="flex flex-col space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Home
            </Link>
            <Link
              href="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Courses
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              About
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Avatar name={user.fullName} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {user.fullName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </span>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full"
                >
                  <Button variant="primary" className="w-full" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
                    Go to Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
