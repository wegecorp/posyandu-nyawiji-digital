'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-[#e9edef] text-center space-y-3 shadow-xs">
      <div className="w-14 h-14 bg-[#f0f2f5] text-[#8696a0] rounded-full flex items-center justify-center mx-auto">
        <BarChart3 className="w-7 h-7" />
      </div>
      <div>
        <h3 className="font-extrabold text-[#111b21] text-sm">{title}</h3>
        <p className="text-xs text-[#54656f] mt-1 font-medium">{description}</p>
      </div>
    </div>
  );
}
