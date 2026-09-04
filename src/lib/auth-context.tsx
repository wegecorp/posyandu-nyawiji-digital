'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession } from './types';

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (userData: UserSession) => void;
  logout: () => void;
  switchActivePosyandu: (posyanduId: string, posyanduName: string, posyanduCode: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'posyandu_auth_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
      // No auto-login fallback — user must authenticate
    } catch (e) {
      console.error('Failed to load session:', e);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout API failed:', e);
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const switchActivePosyandu = (posyanduId: string, posyanduName: string, posyanduCode: string) => {
    if (!user) return;
    const updated = {
      ...user,
      posyanduId,
      posyanduName,
      posyanduCode,
    };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, switchActivePosyandu }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
