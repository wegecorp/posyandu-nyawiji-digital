// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { InAppBrowserWarning } from './InAppBrowserWarning';

describe('InAppBrowserWarning', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders without crashing when sessionStorage throws SecurityError', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    });

    expect(() => {
      render(<InAppBrowserWarning />);
    }).not.toThrow();
  });

  it('shows warning in WhatsApp userAgent even if storage throws SecurityError', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 WhatsApp/2.24.1.6',
      configurable: true,
    });

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    });

    const { container } = render(<InAppBrowserWarning />);
    expect(container.textContent).toContain('Aplikasi dibuka di browser bawaan WhatsApp');
  });

  it('shows warning in Google App (GSA) userAgent', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36 GSA/15.1.28.arm64',
      configurable: true,
    });

    const { container } = render(<InAppBrowserWarning />);
    expect(container.textContent).toContain('Aplikasi dibuka di browser bawaan WhatsApp');
  });

  it('renders null in standard Chrome browser without warning', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
      configurable: true,
    });

    const { container } = render(<InAppBrowserWarning />);
    expect(container.firstChild).toBeNull();
  });
});
