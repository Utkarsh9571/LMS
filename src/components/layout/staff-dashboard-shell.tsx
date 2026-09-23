'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  LayoutDashboard,
  Users,
  CreditCard,
  BookOpen,
  Calendar,
  ShoppingBag,
  BarChart3,
  Mail,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  User,
  Sparkles,
  Globe
} from 'lucide-react';
import { useAuth } from '@/providers/auth-context';
import { hasPermission } from '@/core/services/rbac.service';

export interface StaffDashboardShellProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    roles: string[];
    marketCode?: string;
  };
  children: React.ReactNode;
}

export function StaffDashboardShell({ user, children }: StaffDashboardShellProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRoles = (user.roles || []) as any[];
  const canManageCommerce = hasPermission(userRoles, 'commerce:write');
  const canManageBatches = hasPermission(userRoles, 'batches:write');
  const canReadContent = hasPermission(userRoles, 'content:read');

  const navGroups = [
    {
      title: 'OPERATIONS',
      items: [
        {
          label: 'Dashboard',
          href: '/staff',
          icon: <LayoutDashboard className="w-4 h-4" />,
          visible: true
        },
        {
          label: 'Customers & Students',
          href: '/staff/customers',
          icon: <Users className="w-4 h-4" />,
          visible: canManageCommerce
        },
        {
          label: 'Sales & Orders',
          href: '/staff/sales',
          icon: <CreditCard className="w-4 h-4" />,
          visible: canManageCommerce
        }
      ]
    },
    {
      title: 'LEARNING & DELIVERY',
      items: [
        {
          label: 'Workshops & Cohorts',
          href: '/staff/workshops',
          icon: <Calendar className="w-4 h-4" />,
          visible: canManageBatches
        },
        {
          label: 'Services & Programs',
          href: '/staff/services',
          icon: <ShoppingBag className="w-4 h-4" />,
          visible: canManageCommerce
        },
        {
          label: 'Course Catalog & Curriculum',
          href: '/staff/courses',
          icon: <BookOpen className="w-4 h-4" />,
          visible: canReadContent
        }
      ]
    },
    {
      title: 'INSIGHTS & MESSAGING',
      items: [
        {
          label: 'Operational Analytics',
          href: '/staff/analytics',
          icon: <BarChart3 className="w-4 h-4" />,
          visible: true
        },
        {
          label: 'Staff Messages',
          href: '/staff/messages',
          icon: <Mail className="w-4 h-4" />,
          visible: true
        }
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar for Desktop & Mobile Drawer */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <Link href="/staff" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                BIM
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-white block">
                  Staff Operations
                </span>
                <span className="text-[10px] text-blue-400 uppercase font-semibold tracking-wider">
                  AEC Enterprise Portal
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter((item) => item.visible);
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title} className="space-y-2">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                    {group.title}
                  </h2>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const isActive =
                        item.href === '/staff'
                          ? pathname === '/staff'
                          : pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Details & Switch View */}
          <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/60">
            <Link
              href="/dashboard"
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-blue-300 transition-colors"
            >
              <span>Switch to Student View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                  {user.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
                  <p className="text-[10px] text-slate-400 capitalize truncate">
                    {user.roles.join(', ')}
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full border-slate-800 text-slate-300 hover:bg-red-950/50 hover:text-red-400 hover:border-red-900 text-xs mt-2"
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>BIM & AEC Portal Operations</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1.5 uppercase font-bold">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              {user.marketCode || 'SG'} Market
            </Badge>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-900 dark:text-white">{user.fullName}</span>
              <Badge variant="default" className="capitalize text-[10px]">
                {user.roles[0] || 'Staff'}
              </Badge>
            </div>
          </div>
        </header>

        {/* Page Content Workstation */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
