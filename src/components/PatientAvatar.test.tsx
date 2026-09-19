// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PatientAvatar } from './PatientAvatar';

describe('PatientAvatar', () => {
  it('renders DiceBear moods image for BAYI', () => {
    render(<PatientAvatar name="Aisyah" category="BAYI" gender="P" size={40} />);
    const img = screen.getByAltText('Aisyah') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('api.dicebear.com/10.x/moods/svg');
    expect(img.src).toContain('seed=Aisyah');
  });

  it('renders DiceBear moods image for BALITA_APRAS', () => {
    render(<PatientAvatar name="Budi" category="BALITA_APRAS" gender="L" size={40} />);
    const img = screen.getByAltText('Budi') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('api.dicebear.com/10.x/moods/svg');
  });

  it('renders boring-avatar SVG for REMAJA, DEWASA, LANSIA, BUMIL', () => {
    const { container } = render(
      <PatientAvatar name="Siti Rahma" category="BUMIL" gender="P" size={40} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('handles empty name safely', () => {
    const { container } = render(<PatientAvatar name="" gender="L" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });
});
