import * as cdk from 'aws-cdk-lib';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { EdgeFunction } from './constructs/cf-lambda-furl-service/edge-function';
import { join } from 'path';

type UsEast1StackProps = cdk.StackProps;

export class UsEast1Stack extends cdk.Stack {
  /**
   * the signer L@E function (it must be deployed in us-east-1).
   */
  public readonly signPayloadHandler: EdgeFunction;
  /**
   * ARN of the WAF Web ACL (scope=CLOUDFRONT) associated with the CloudFront distribution.
   * Required for the CloudFront flat-rate pricing plan.
   */
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: UsEast1StackProps) {
    super(scope, id, props);

    const signPayloadHandler = new EdgeFunction(this, 'SignPayloadHandler', {
      entryPath: join(__dirname, 'constructs', 'cf-lambda-furl-service', 'lambda', 'sign-payload.ts'),
    });

    this.signPayloadHandler = signPayloadHandler;

    // WAF Web ACL associated with the CloudFront distribution. Required for the CloudFront
    // flat-rate pricing plan (an associated Web ACL is mandatory to enroll).
    //
    // Intentionally minimal to avoid hard-to-diagnose false positives in a starter kit:
    //   - No rate-based rule: trips on shared NAT / corporate proxies, load tests, and Next.js
    //     prefetch bursts, blocking legitimate users with an opaque 403.
    //   - No AmazonIpReputationList: blocks specific users by source-IP reputation with no
    //     request-content cause — impossible for the user to understand.
    //   - No CommonRuleSet: its NoUserAgent_HEADER and SizeRestrictions_Cookie rules false-positive
    //     on health checks / server-side fetches and on large Amplify/auth cookies.
    // Only KnownBadInputs is kept: it matches actual exploit signatures (e.g. Log4Shell) that do
    // not appear in legitimate traffic, so it blocks nothing a real user would send. Add more
    // managed rule groups (up to the Free plan's 5-rule limit) once you understand your traffic.
    const webAcl = new CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WebappWebAcl',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWSManagedKnownBadInputs',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputs',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });
    this.webAclArn = webAcl.attrArn;
  }
}
