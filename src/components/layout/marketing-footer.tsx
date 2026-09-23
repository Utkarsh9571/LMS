import React from 'react';
import Link from 'next/link';
import { Building2, Globe, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-300 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Column 1: Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2 font-bold text-white text-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <span>BIM ACADEMY</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Professional Building Information Modeling (BIM) & AEC engineering training platform for Singapore and Malaysia practitioners.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 pt-1">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Singapore (SG) & Malaysia (MY)</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-white transition-colors">
                  Course Catalog
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About the Academy
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Student Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Accreditation & Focus */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Specializations
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Revit Architectural & Structural BIM</li>
              <li>MEP Services Coordination</li>
              <li>ISO 19650 Information Management</li>
              <li>Clash Detection & Navisworks Workflow</li>
            </ul>
          </div>

          {/* Column 4: Contact & Verification */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Verification & Trust
            </h4>
            <p className="text-xs text-slate-400">
              Digital certificate validation available for employers and industry partners.
            </p>
            <div className="pt-1">
              <Link
                href="/verify/validate"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verify Certificate</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} BIM Academy LMS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/courses" className="hover:text-slate-400 transition-colors">
              Courses
            </Link>
            <Link href="/login" className="hover:text-slate-400 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
