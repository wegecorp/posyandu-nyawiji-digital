import { createAvatar, type Style } from '@dicebear/core';
import { shapes, rings, glass, identicon } from '@dicebear/collection';

export type UnitAvatarStyle =
  | 'landscape'
  | 'planets'
  | 'waves'
  | 'squircles'
  | 'shapes'
  | 'rings'
  | 'glass'
  | 'identicon';

const avatarCache = new Map<string, string>();

/**
 * Menghasilkan avatar SVG unit (Posyandu, Puskesmas, Kalurahan, Dinkes)
 * secara 100% lokal & offline via JavaScript, tanpa request ke internet.
 */
export function getUnitAvatarDataUri(style: UnitAvatarStyle, seed: string): string {
  const cleanSeed = (seed || 'unit').trim();
  const cacheKey = `${style}:${cleanSeed}`;

  const cached = avatarCache.get(cacheKey);
  if (cached) return cached;

  try {
    let avatarSvg = '';

    switch (style) {
      case 'planets':
      case 'rings': {
        const avatar = createAvatar(rings, { seed: cleanSeed });
        avatarSvg = avatar.toString();
        break;
      }
      case 'waves':
      case 'glass': {
        const avatar = createAvatar(glass, { seed: cleanSeed });
        avatarSvg = avatar.toString();
        break;
      }
      case 'squircles':
      case 'identicon': {
        const avatar = createAvatar(identicon, {
          seed: cleanSeed,
          backgroundColor: ['075e54', '128c7e', '25d366', '054c44', '0f766e'],
        });
        avatarSvg = avatar.toString();
        break;
      }
      case 'landscape':
      case 'shapes':
      default: {
        const avatar = createAvatar(shapes, {
          seed: cleanSeed,
          backgroundColor: ['075e54', '128c7e', '25d366', '054c44', '0f766e'],
        });
        avatarSvg = avatar.toString();
        break;
      }
    }

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`;
    avatarCache.set(cacheKey, dataUri);
    return dataUri;
  } catch (err) {
    console.error('Unit avatar generation error:', err);
    return '';
  }
}
