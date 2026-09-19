// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatientAvatar } from './PatientAvatar';

describe('PatientAvatar', () => {
  it('renders DiceBear moods with positive expressions for BAYI', () => {
    render(<PatientAvatar name="Aisyah" category="BAYI" gender="P" size={40} />);
    const img = screen.getByAltText('Aisyah') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('api.dicebear.com/10.x/moods/svg');
    expect(img.src).toContain('seed=Aisyah');
    expect(img.src).toContain('eyesVariant=happy,calm');
    expect(img.src).toContain('mouthVariant=bigSmile,smile');
  });

  it('renders DiceBear moods for BALITA_APRAS', () => {
    render(<PatientAvatar name="Budi" category="BALITA_APRAS" gender="L" size={40} />);
    const img = screen.getByAltText('Budi') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('api.dicebear.com/10.x/moods/svg');
  });

  it('renders DiceBear open-peeps with female styling for BUMIL / P', () => {
    render(<PatientAvatar name="Siti Rahma" category="BUMIL" gender="P" size={40} />);
    const img = screen.getByAltText('Siti Rahma') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('api.dicebear.com/10.x/open-peeps/svg');
    expect(img.src).toContain('headVariant=hijab');
    expect(img.src).toContain('backgroundColor=fce7f3');
  });

  it('renders DiceBear open-peeps with gray hair styling for LANSIA', () => {
    render(<PatientAvatar name="Mbah Marto" category="LANSIA" gender="L" size={40} />);
    const img = screen.getByAltText('Mbah Marto') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('api.dicebear.com/10.x/open-peeps/svg');
    expect(img.src).toContain('headVariant=grayBun');
  });

  it('falls back to boring-avatars beam when image errors', () => {
    const { container } = render(<PatientAvatar name="Eko" category="DEWASA" gender="L" size={40} />);
    const img = screen.getByAltText('Eko');
    fireEvent.error(img);

    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('handles empty name safely', () => {
    render(<PatientAvatar name="" gender="L" size={40} />);
    const img = screen.getByAltText('pasien') as HTMLImageElement;
    expect(img).toBeDefined();
  });
});
