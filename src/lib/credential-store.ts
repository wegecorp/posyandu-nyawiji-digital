'use client';

/**
 * Simpan password baru ke password manager browser lewat Credential Management API.
 * Dipakai setelah aktivasi akun agar password pribadi menimpa password default yang
 * sempat tersimpan otomatis oleh browser.
 *
 * Didukung Chrome/Edge/Android (target utama PWA). Safari/Firefox tak mendukung —
 * helper ini no-op, bukan error.
 */
export async function saveCredential(credential: {
  id: string;
  password: string;
  name?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const PasswordCredentialCtor = (window as unknown as { PasswordCredential?: new (init: {
    id: string;
    password: string;
    name?: string;
  }) => Credential }).PasswordCredential;
  const store = navigator.credentials?.store;
  if (!PasswordCredentialCtor || typeof store !== 'function') return false;
  try {
    await store.call(navigator.credentials, new PasswordCredentialCtor(credential));
    return true;
  } catch {
    return false;
  }
}
