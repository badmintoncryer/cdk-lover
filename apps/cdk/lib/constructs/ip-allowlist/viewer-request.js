// CloudFront Functions (cloudfront-js-2.0). Lets a request through only when the viewer's IPv4
// address matches an entry of the "allowed" key in the KeyValueStore: comma-separated IPs or
// CIDRs, e.g. "203.0.113.7, 198.51.100.0/24". "0.0.0.0/0" opens the site to everyone.
// A missing key or any error blocks (fail closed).
import cf from 'cloudfront';

const kvs = cf.kvs('__KVS_ID__');

function toInt(ip) {
  const p = ip.split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (let i = 0; i < 4; i++) {
    const v = Number(p[i]);
    if (!/^\d{1,3}$/.test(p[i]) || v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

export function matches(ip, entry) {
  const [base, bitsText] = entry.trim().split('/');
  const addr = toInt(ip);
  const net = toInt(base);
  if (addr === null || net === null) return false;
  const bits = bitsText === undefined ? 32 : Number(bitsText);
  if (!(bits >= 0 && bits <= 32)) return false;
  const size = Math.pow(2, 32 - bits);
  return Math.floor(addr / size) === Math.floor(net / size);
}

const deny = {
  statusCode: 403,
  statusDescription: 'Forbidden',
  headers: { 'content-type': { value: 'text/plain; charset=utf-8' }, 'cache-control': { value: 'no-store' } },
  body: 'This site is not open yet.',
};

async function handler(event) {
  const ip = event.viewer.ip;
  try {
    const allowed = await kvs.get('allowed');
    if (allowed.split(',').some((e) => e.trim() && matches(ip, e))) return event.request;
  } catch (e) {
    // fall through: fail closed
  }
  return deny;
}
