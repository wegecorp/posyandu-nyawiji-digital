export type UnitAvatarStyle =
  | 'landscape'
  | 'planets'
  | 'waves'
  | 'squircles'
  | 'shapes'
  | 'rings'
  | 'glass'
  | 'identicon';

interface Palette {
  from: string;
  to: string;
  accent: string;
}

const PALETTES: Record<string, Palette[]> = {
  landscape: [
    { from: '#075e54', to: '#128c7e', accent: '#25d366' },
    { from: '#0f766e', to: '#14b8a6', accent: '#5eead4' },
    { from: '#065f46', to: '#059669', accent: '#34d399' },
    { from: '#166534', to: '#22c55e', accent: '#86efac' },
  ],
  planets: [
    { from: '#0369a1', to: '#0284c7', accent: '#38bdf8' },
    { from: '#1d4ed8', to: '#3b82f6', accent: '#93c5fd' },
    { from: '#0f766e', to: '#0284c7', accent: '#67e8f9' },
    { from: '#4338ca', to: '#6366f1', accent: '#a5b4fc' },
  ],
  waves: [
    { from: '#0e7490', to: '#06b6d4', accent: '#67e8f9' },
    { from: '#047857', to: '#10b981', accent: '#a7f3d0' },
    { from: '#0369a1', to: '#38bdf8', accent: '#bae6fd' },
    { from: '#0f766e', to: '#14b8a6', accent: '#99f6e4' },
  ],
  squircles: [
    { from: '#075e54', to: '#0f766e', accent: '#25d366' },
    { from: '#047857', to: '#065f46', accent: '#34d399' },
    { from: '#1e3a8a', to: '#1d4ed8', accent: '#60a5fa' },
    { from: '#312e81', to: '#4338ca', accent: '#818cf8' },
  ],
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(text: string): string {
  const clean = text.trim();
  if (!clean) return 'PS';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  // Ambil huruf pertama kata ke-1 dan kata terakhir (atau angka jika ada seperti Melati 1 -> M1)
  const first = words[0][0];
  const last = words[words.length - 1];
  const second = /^\d+$/.test(last) ? last : last[0];
  return (first + second).toUpperCase();
}

const avatarCache = new Map<string, string>();

/**
 * Menghasilkan avatar SVG unit (Posyandu, Puskesmas, Kalurahan, Dinkes)
 * 100% mandiri tanpa dependensi eksternal, 0 KB runtime overhead, 0ms render.
 */
export function getUnitAvatarDataUri(style: UnitAvatarStyle, seed: string): string {
  const cleanSeed = (seed || 'unit').trim();
  const cacheKey = `${style}:${cleanSeed}`;

  const cached = avatarCache.get(cacheKey);
  if (cached) return cached;

  const list = PALETTES[style] || PALETTES.landscape;
  const hash = hashString(cleanSeed);
  const palette = list[hash % list.length];
  const initials = getInitials(cleanSeed);

  // SVG modern dengan gradien halus dan inisial tajam
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <defs>
    <linearGradient id="g_${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.from}" />
      <stop offset="100%" stop-color="${palette.to}" />
    </linearGradient>
  </defs>
  <rect width="80" height="80" rx="22" fill="url(#g_${hash})" />
  <circle cx="70" cy="10" r="28" fill="${palette.accent}" fill-opacity="0.18" />
  <circle cx="12" cy="70" r="22" fill="#ffffff" fill-opacity="0.12" />
  <text x="40" y="47" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.5">${initials}</text>
</svg>`;

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  avatarCache.set(cacheKey, dataUri);
  return dataUri;
}
