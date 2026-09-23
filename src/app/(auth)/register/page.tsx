'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-context';
import { apiPost } from '@/lib/api/client';
import { IUserSafeProfile } from '@/core/domain/domain-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/ui/error-state';
import { User, Mail, Lock, Phone, Eye, EyeOff, Building2, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      await apiPost<IUserSafeProfile>('/api/auth/register', {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined
      });

      await refreshUser();
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please check your information.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="text-center space-y-2">
          <div className="inline-flex w-10 h-10 rounded-xl bg-blue-600 items-center justify-center text-white shadow-xs mb-1">
            <Building2 className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Join accredited BIM courses in Singapore & Malaysia
          </p>
        </div>

        {error && <ErrorState message={error} title="Registration Error" />}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="fullName" required>
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              leftIcon={<User className="w-4 h-4" />}
            />
          </div>

          <div>
            <Label htmlFor="email" required>
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </div>

          <div>
            <Label htmlFor="password" required>
              Password
            </Label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </div>

          <div>
            <Label htmlFor="phone">
              Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+65 9123 4567 / +60 12 345 6789"
              leftIcon={<Phone className="w-4 h-4" />}
            />
          </div>

          <Button
            type="submit"
            isLoading={loading}
            className="w-full mt-2"
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Account
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2 text-xs">
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>
          <p>
            <Link href="/courses" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
              ← Browse Course Catalog
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
