import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, test } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MainStack } from '../lib/main-stack';
import { UsEast1Stack } from '../lib/us-east-1-stack';

// Load the function source as plain JS (drop the CloudFront-only import) to test the matcher.
const src = readFileSync(join(__dirname, '../lib/constructs/ip-allowlist/viewer-request.js'), 'utf8')
  .replace(/^import .*$/m, '')
  .replace("const kvs = cf.kvs('__KVS_ID__');", '')
  .replace('export function matches', 'function matches');
const matches = new Function(`${src}; return matches;`)() as (ip: string, entry: string) => boolean;

describe('IP allowlist matcher', () => {
  // Tests run on Node, which accepts syntax the CloudFront runtime rejects at deploy time.
  test('avoids syntax cloudfront-js-2.0 does not support', () => {
    expect(src).not.toMatch(/(const|let|var)\s*[[{]/);
    expect(src).not.toMatch(/\.\.\./);
  });

  test.each([
    ['203.0.113.7', '203.0.113.7', true],
    ['203.0.113.8', '203.0.113.7', false],
    ['198.51.100.200', '198.51.100.0/24', true],
    ['198.51.101.1', '198.51.100.0/24', false],
    ['1.2.3.4', '0.0.0.0/0', true],
    ['1.2.3.4', ' 1.2.3.4 ', true],
    ['2001:db8::1', '0.0.0.0/0', false],
    ['1.2.3.4', 'none', false],
    ['1.2.3.4', '1.2.3.4/33', false],
  ])('%s vs %s → %s', (ip, entry, expected) => {
    expect(matches(ip, entry)).toBe(expected);
  });
});

function synth(ipRestriction = false) {
  const app = new cdk.App();
  const virginia = new UsEast1Stack(app, 'UsEast1Stack', {
    env: { account: '123456789012', region: 'us-east-1' },
    crossRegionReferences: true,
  });
  const main = new MainStack(app, 'MainStack', {
    env: { account: '123456789012', region: 'us-west-2' },
    crossRegionReferences: true,
    signPayloadHandler: virginia.signPayloadHandler,
    ipRestriction,
  });
  return Template.fromStack(main);
}

describe('IP allowlist wiring', () => {
  test('off by default', () => {
    const t = synth();
    expect(Object.keys(t.findResources('AWS::CloudFront::Function'))).toHaveLength(0);
    expect(Object.keys(t.findResources('AWS::CloudFront::KeyValueStore'))).toHaveLength(0);
  });

  test('attaches a viewer-request function to every behavior and disables IPv6', () => {
    const t = synth(true);
    t.resourceCountIs('AWS::CloudFront::KeyValueStore', 1);
    t.hasResourceProperties('AWS::CloudFront::Function', {
      FunctionConfig: Match.objectLike({ Runtime: 'cloudfront-js-2.0' }),
    });
    const dist = Object.values(t.findResources('AWS::CloudFront::Distribution'))[0].Properties.DistributionConfig;
    expect(dist.IPV6Enabled).toBe(false);
    for (const b of [dist.DefaultCacheBehavior, ...dist.CacheBehaviors]) {
      expect(b.FunctionAssociations).toEqual([expect.objectContaining({ EventType: 'viewer-request' })]);
    }
    expect(JSON.stringify(t.toJSON())).not.toContain('export function');
  });
});
