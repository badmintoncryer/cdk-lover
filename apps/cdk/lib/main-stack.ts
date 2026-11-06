import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { CfnBudget } from 'aws-cdk-lib/aws-budgets';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { GeoRestriction } from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import { Database } from './constructs/database';
import { Webapp } from './constructs/webapp';
import { EdgeFunction } from './constructs/cf-lambda-furl-service/edge-function';
import { EventBus } from './constructs/event-bus/';
import { DsqlMigrator } from './constructs/dsql-migrator/';
import { IpAllowlist } from './constructs/ip-allowlist';

interface MainStackProps extends StackProps {
  readonly signPayloadHandler: EdgeFunction;

  /**
   * ARN of a WAF Web ACL (scope=CLOUDFRONT, created in us-east-1). Required to enroll in the
   * CloudFront flat-rate (Free) pricing plan.
   *
   * @default No Web ACL is associated (pay-as-you-go).
   */
  readonly webAclId?: string;

  /**
   * @default No geographic restriction.
   */
  readonly geoRestriction?: GeoRestriction;

  /**
   * @default 'us.amazon.nova-lite-v1:0'
   */
  readonly translateModelId?: string;

  /**
   * @default 'us.amazon.nova-pro-v1:0'
   */
  readonly summaryModelId?: string;

  /**
   * Email that receives an AWS Budgets alert. The budget is skipped when unset.
   *
   * @default no budget
   */
  readonly budgetEmail?: string;

  /**
   * @default 20
   */
  readonly budgetUsd?: number;

  /**
   * Only let listed IPv4 addresses reach the site (CloudFront Function + KeyValueStore). Set the
   * list with `scripts/allow-ip.sh` after deploy (no redeploy needed); `open` allows everyone.
   *
   * @default false
   */
  readonly ipRestriction?: boolean;
}

export class MainStack extends Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, {
      description: 'CDK Lover session platform (based on serverless-full-stack-webapp-starter-kit)',
      ...props,
    });

    const accessLogBucket = new Bucket(this, 'AccessLogBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
      // Request paths include attendees' MCP tokens (/api/mcp/<token>) and every line has a viewer
      // IP; keep them only as long as the event needs them for troubleshooting.
      lifecycleRules: [{ expiration: Duration.days(7) }],
    });

    const database = new Database(this, 'Database');
    const eventBus = new EventBus(this, 'EventBus');

    // Signs the passphrase / admin cookies and salts the anonymous browser-id hashes.
    const signingKey = new Secret(this, 'SigningKey', {
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const adminPassword = new Secret(this, 'AdminPassword', {
      generateSecretString: { passwordLength: 20, excludePunctuation: true },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Bearer token for the admin tools of the MCP endpoint (/api/mcp). Only readable with AWS
    // credentials of this account; rotate it to revoke.
    const mcpAdminToken = new Secret(this, 'McpAdminToken', {
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const allowlist = props.ipRestriction ? new IpAllowlist(this, 'IpAllowlist') : undefined;

    const webapp = new Webapp(this, 'Webapp', {
      database,
      signPayloadHandler: props.signPayloadHandler,
      accessLogBucket,
      eventBus,
      signingKey,
      adminPassword,
      mcpAdminToken,
      translateModelId: props.translateModelId ?? 'us.amazon.nova-lite-v1:0',
      summaryModelId: props.summaryModelId ?? 'us.amazon.nova-pro-v1:0',
      webAclId: props.webAclId,
      geoRestriction: props.geoRestriction,
      // The allowlist matches IPv4 only, so viewers must not arrive over IPv6 while it is on.
      ...(allowlist ? { functionAssociations: [allowlist.association], enableIpv6: false } : {}),
    });

    new DsqlMigrator(this, 'DsqlMigrator', { database });

    if (props.budgetEmail) {
      new CfnBudget(this, 'Budget', {
        budget: {
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: { amount: props.budgetUsd ?? 20, unit: 'USD' },
        },
        notificationsWithSubscribers: [50, 100].map((threshold) => ({
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: props.budgetEmail! }],
        })),
      });
    }

    new CfnOutput(this, 'FrontendDomainName', { value: webapp.baseUrl });
    new CfnOutput(this, 'AdminPasswordCommand', {
      value: `aws secretsmanager get-secret-value --region ${this.region} --secret-id ${adminPassword.secretName} --query SecretString --output text`,
    });
    new CfnOutput(this, 'McpAdminTokenCommand', {
      value: `aws secretsmanager get-secret-value --region ${this.region} --secret-id ${mcpAdminToken.secretName} --query SecretString --output text`,
    });
  }
}
