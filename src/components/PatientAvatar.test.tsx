// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PatientAvatar } from './PatientAvatar';

describe('PatientAvatar', () => {
  afterEach(cleanup);

  it('renders offline SVG for BAYI', () => {
    const { container } = render(<PatientAvatar name="Aisyah" category="BAYI" gender="P" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(container.querySelector('img')).toBeNull(); // No external img requests
  });

  it('renders offline SVG for BALITA_APRAS', () => {
    const { container } = render(<PatientAvatar name="Budi" category="BALITA_APRAS" gender="L" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('renders offline SVG with female styling for BUMIL / P', () => {
    const { container } = render(<PatientAvatar name="Siti Rahma" category="BUMIL" gender="P" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(container.firstElementChild?.className).toContain('border-rose-200');
  });

  it('renders offline SVG with amber styling for LANSIA', () => {
    const { container } = render(<PatientAvatar name="Mbah Marto" category="LANSIA" gender="L" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(container.firstElementChild?.className).toContain('border-amber-200');
  });

  it('renders offline SVG for DEWASA / L', () => {
    const { container } = render(<PatientAvatar name="Eko" category="DEWASA" gender="L" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(container.firstElementChild?.className).toContain('border-sky-200');
  });

  it('handles empty name safely', () => {
    const { container } = render(<PatientAvatar name="" gender="L" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });
});
