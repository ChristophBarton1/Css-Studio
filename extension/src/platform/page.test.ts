import { describe, expect, it } from 'vitest';
import { classifyPageUrl } from './page';

describe('classifyPageUrl', () => {
  it('supports regular websites', () => {
    expect(classifyPageUrl('https://example.com/pricing')).toEqual({
      supported: true,
      hostname: 'example.com',
    });
  });

  it('rejects chrome:// and extension pages', () => {
    expect(classifyPageUrl('chrome://extensions').supported).toBe(false);
    expect(classifyPageUrl('chrome-extension://abc/panel.html').supported).toBe(false);
    expect(classifyPageUrl('about:blank').supported).toBe(false);
  });

  it('rejects the Chrome Web Store', () => {
    expect(classifyPageUrl('https://chromewebstore.google.com/detail/x').supported).toBe(false);
  });

  it('rejects garbage URLs', () => {
    expect(classifyPageUrl('not a url').supported).toBe(false);
  });
});
