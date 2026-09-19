'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IUserSafeProfile } from '@/core/domain/domain-types';
import { apiGet, apiPost } from '@/lib/api/client';

interface AuthContextType {
  user: IUserSafeProfile | null;
  loading: boolean;
  refreshUser: () => Promise<IUserSafeProfile | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUserSafeProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = useCallback(async (): Promise<IUserSafeProfile | null> => {
    try {
      const userData = await apiGet<IUserSafeProfile>('/api/auth/me');
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiPost('/api/auth/logout', {});
    } catch {
      // Safe to ignore logout server errors
    } finally {
      setUser(null);
      router.push('/');
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
