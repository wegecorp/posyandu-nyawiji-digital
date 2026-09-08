'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession } from './types';

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  setUser: (user: UserSession | null) => void;
  login: (userData: UserSession) => void;
  logout: () => void;
  switchActivePosyandu: (posyanduId: string, posyanduName: string, posyanduCode: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'posyandu_auth_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sumber kebenaran sesi = server (/api/auth/me). localStorage hanya cache
  // agar tidak logout saat jaringan putus; tetap divalidasi tiap muat aplikasi.
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      let cached: UserSession | null = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) cached = JSON.parse(raw);
      } catch {
        /* ignore corrupt cache */
      }

      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!cancelled) {
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.user) {
              setUser(json.user);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(json.user));
              return;
            }
          }
          // 401 / invalid session -> hapus cache
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Gagal jaringan: pakai cache bila ada, tanpa validasi server.
        if (!cancelled) {
          setUser(cached || null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
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
    <AuthContext.Provider
      value={{ user, isLoading, setUser, login, logout, switchActivePosyandu }}
    >
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
