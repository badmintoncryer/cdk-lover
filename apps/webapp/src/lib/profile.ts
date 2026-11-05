type Kind = 'linkedin' | 'x' | 'github';

const HOSTS: Record<Kind, string[]> = {
  linkedin: ['linkedin.com', 'www.linkedin.com', 'jp.linkedin.com'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  github: ['github.com', 'www.github.com'],
};

const BASE: Record<Kind, string> = {
  linkedin: 'https://www.linkedin.com/in/',
  x: 'https://x.com/',
  github: 'https://github.com/',
};

/**
 * Accepts a full profile URL or a bare handle ("@foo", "foo") and returns a canonical https URL.
 * Returns null for empty input, and throws for anything that is not a profile on that service,
 * so attendee cards never link to arbitrary sites.
 */
export function normalizeProfileUrl(kind: Kind, input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) || v.includes('.')) {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (!HOSTS[kind].includes(url.hostname.toLowerCase())) throw new Error(`not a ${kind} URL`);
    url.protocol = 'https:';
    return url.toString();
  }
  const handle = v.replace(/^@/, '');
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(handle)) throw new Error(`invalid ${kind} handle`);
  return BASE[kind] + handle;
}
