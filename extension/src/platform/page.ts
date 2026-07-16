export type PageSupport =
  | { supported: true; hostname: string }
  | { supported: false; reason: 'internal-page' | 'store-page' | 'invalid-url' };

const INTERNAL_PROTOCOLS = [
  'chrome:',
  'chrome-extension:',
  'chrome-untrusted:',
  'edge:',
  'about:',
  'devtools:',
  'view-source:',
  'chrome-search:',
];

/** Classifies a tab URL into supported / unsupported panel states. */
export function classifyPageUrl(url: string): PageSupport {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { supported: false, reason: 'invalid-url' };
  }
  if (INTERNAL_PROTOCOLS.includes(parsed.protocol)) {
    return { supported: false, reason: 'internal-page' };
  }
  if (parsed.hostname === 'chromewebstore.google.com') {
    return { supported: false, reason: 'store-page' };
  }
  if (parsed.protocol === 'file:') {
    return { supported: true, hostname: 'local file' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { supported: false, reason: 'internal-page' };
  }
  return { supported: true, hostname: parsed.hostname };
}
