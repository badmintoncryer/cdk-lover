import { readFileSync } from 'fs';
import { join } from 'path';
import { CfnOutput } from 'aws-cdk-lib';
import {
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  Function as CfFunction,
  KeyValueStore,
  type FunctionAssociation,
} from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

/**
 * Pre-event protection without WAF: a viewer-request CloudFront Function that only lets listed
 * IPv4 addresses through. The list lives in a CloudFront KeyValueStore so it can be changed in
 * seconds without a deploy, and set to `0.0.0.0/0` to open the site on the event day.
 *
 * The store starts empty (an S3 import source would tie it to a bucket region), so the site is
 * closed to everyone until `scripts/allow-ip.sh` puts the "allowed" key.
 */
export class IpAllowlist extends Construct {
  readonly store: KeyValueStore;
  readonly association: FunctionAssociation;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.store = new KeyValueStore(this, 'Store', { comment: 'CDK Lover IP allowlist (key "allowed")' });

    const source = readFileSync(join(__dirname, 'viewer-request.js'), 'utf8')
      // `export` is only there for unit tests; CloudFront Functions do not allow it.
      .replace(/export function /g, 'function ')
      .replace('__KVS_ID__', this.store.keyValueStoreId);

    const fn = new CfFunction(this, 'Function', {
      code: FunctionCode.fromInline(source),
      runtime: FunctionRuntime.JS_2_0,
      keyValueStore: this.store,
      comment: 'Allow only listed IPv4 viewers',
    });

    this.association = { function: fn, eventType: FunctionEventType.VIEWER_REQUEST };

    new CfnOutput(this, 'KeyValueStoreArn', { value: this.store.keyValueStoreArn });
  }
}
