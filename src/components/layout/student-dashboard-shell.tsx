'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Building2,
  LayoutDashboard,
  BookOpen,
  Users,
  CreditCard,
  Award,
  User,
  ArrowLeft,
  Menu,
  X,
  LogOut,
  Bell,
  Search,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/providers/auth-context';

export interface StudentDashboardShellProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    roles?: string[];
  };
  children: React.ReactNode;
}

export function StudentDashboardShell({ user, children }: StudentDashboardShellProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Courses', href: '/dashboard/courses', icon: BookOpen },
    { label: 'My Batches', href: '/dashboard/batches', icon: Users },
    { label: 'Orders & Billing', href: '/dashboard/orders', icon: CreditCard },
    { label: 'Certificates', href: '/dashboard/certificates', icon: Award },
    { label: 'Profile Settings', href: '/dashboard/profile', icon: User }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row transition-colors">
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-slate-900 dark:text-white">BIM Portal</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop & Mobile Drawer Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <Link href="/" className="flex items-center gap-2 font-black text-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-slate-900 dark:text-white font-extrabold text-sm">BIM ACADEMY</span>
                <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 tracking-wider">
                  STUDENT PORTAL
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1" aria-label="Student Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Back Link */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <Link
            href="/courses"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Catalog</span>
          </Link>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={user.fullName} size="sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[110px]">
                  {user.email}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={() => logout()}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Control Header */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xs sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Student Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={user.fullName} size="sm" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {user.fullName}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
