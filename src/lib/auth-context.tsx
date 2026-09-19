'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession } from './types';
import { clearSyncQueue } from './offline-sync';

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  setUser: (user: UserSession | null) => void;
  login: (userData: UserSession) => void;
  logout: () => void;
  switchActivePosyandu: (
    posyanduId: string,
    posyanduName: string,
    posyanduCode: string,
    locationMeta?: {
      padukuhan?: string | null;
      kalurahan?: string | null;
      kapanewon?: string | null;
      healthCenterName?: string | null;
    }
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'posyandu_auth_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sumber kebenaran sesi = server (/api/auth/me). localStorage dipakai sebagai
  // cache instan (optimistic render) agar aplikasi langsung interaktif saat dibuka
  // tanpa menunggu roundtrip jaringan, kemudian divalidasi di latar belakang.
  useEffect(() => {
    let cancelled = false;
    let hadCache = false;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && typeof cached === 'object' && cached.id) {
          setUser(cached);
          setIsLoading(false);
          hadCache = true;
        }
      }
    } catch {
      /* ignore corrupt cache */
    }

    async function revalidateSession() {
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
          // 401 / 403 / invalid session -> hapus cache dan logout.
          if (res.status === 401 || res.status === 403) {
            setUser(null);
            localStorage.removeItem(STORAGE_KEY);
            clearSyncQueue();
          }
        }
      } catch {
        // Gagal jaringan: tetap pakai cache tanpa mengganggu user.
      } finally {
        if (!cancelled && !hadCache) {
          setIsLoading(false);
        }
      }
    }

    revalidateSession();
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
    clearSyncQueue();
  };

  const switchActivePosyandu = (
    posyanduId: string,
    posyanduName: string,
    posyanduCode: string,
    locationMeta?: {
      padukuhan?: string | null;
      kalurahan?: string | null;
      kapanewon?: string | null;
      healthCenterName?: string | null;
    }
  ) => {
    if (!user) return;
    const updated: UserSession = {
      ...user,
      posyanduId,
      posyanduName,
      posyanduCode,
      padukuhan: locationMeta?.padukuhan !== undefined ? locationMeta.padukuhan : user.padukuhan,
      kalurahan: locationMeta?.kalurahan !== undefined ? locationMeta.kalurahan : user.kalurahan,
      kapanewon: locationMeta?.kapanewon !== undefined ? locationMeta.kapanewon : user.kapanewon,
      healthCenterName: locationMeta?.healthCenterName !== undefined ? locationMeta.healthCenterName : user.healthCenterName,
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
