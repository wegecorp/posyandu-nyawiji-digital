'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { DinkesAnalisis } from './DinkesAnalisis';
import { PuskesmasAnalisis } from './PuskesmasAnalisis';
import { PosyanduAnalisis } from './PosyanduAnalisis';

export function AnalisisPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-4">
      {user.role === 'DINKES' && <DinkesAnalisis />}
      {user.role === 'PUSKESMAS' && <PuskesmasAnalisis />}
      {user.role === 'POSYANDU' && <PosyanduAnalisis />}
    </div>
  );
}
