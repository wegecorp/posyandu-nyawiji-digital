import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveCredential } from '@/lib/credential-store';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveCredential', () => {
  it('mengembalikan false bila Credential API tak tersedia', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {});
    expect(await saveCredential({ id: 'a', password: 'rahasia123' })).toBe(false);
  });

  it('menyimpan credential dan mengembalikan true bila didukung', async () => {
    const store = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('window', { PasswordCredential: class {} });
    vi.stubGlobal('navigator', { credentials: { store } });

    const result = await saveCredential({ id: 'posyandu-x', password: 'rahasia123', name: 'Posyandu X' });

    expect(result).toBe(true);
    expect(store).toHaveBeenCalledTimes(1);
  });

  it('mengembalikan false bila store menolak (tak melempar)', async () => {
    const store = vi.fn().mockRejectedValue(new Error('not allowed'));
    vi.stubGlobal('window', { PasswordCredential: class {} });
    vi.stubGlobal('navigator', { credentials: { store } });

    expect(await saveCredential({ id: 'a', password: 'rahasia123' })).toBe(false);
  });
});
