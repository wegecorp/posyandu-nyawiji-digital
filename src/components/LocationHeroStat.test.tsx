// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocationHeroStat } from './LocationHeroStat';
import { AuthProvider } from '@/lib/auth-context';

describe('LocationHeroStat', () => {
  const mockCounts = {
    total: 30,
    none: 10,
    partial: 5,
    full: 15,
    measured: 20,
    percent: 67,
  };

  it('renders location name, stats, and DiceBear landscape image', () => {
    render(
      <AuthProvider>
        <LocationHeroStat statusCounts={mockCounts} />
      </AuthProvider>
    );

    expect(screen.getByText(/Terisi bulan ini:/i)).toBeDefined();
    expect(screen.getByText('20/30')).toBeDefined();
    expect(screen.getByText('67%')).toBeDefined();
  });
});
