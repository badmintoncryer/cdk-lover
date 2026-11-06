#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Preflight } from 'cdk-preflight';
import { IdleCost } from 'cfn-idle-cost';
import { MainStack } from '../lib/main-stack';
import { UsEast1Stack } from '../lib/us-east-1-stack';

const app = new cdk.App();

/**
 * Deployment settings. Values can also be passed with `-c key=value`.
 */
const props = {
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  // Pinned: the CLI sets CDK_DEFAULT_REGION from the AWS profile, which silently moved the stack
  // to the profile's region. Override with `-c region=...` if needed.
  region: (app.node.tryGetContext('region') as string | undefined) ?? 'us-west-2',
  /** Bedrock model (or inference profile) used to translate posts. */
  translateModelId: app.node.tryGetContext('translateModelId') ?? 'us.amazon.nova-lite-v1:0',
  /** Bedrock model (or inference profile) used to summarize all opinions. */
  summaryModelId: app.node.tryGetContext('summaryModelId') ?? 'us.amazon.nova-pro-v1:0',
  /** Email address that receives the AWS Budgets alert. Leave unset to skip the budget. */
  budgetEmail: app.node.tryGetContext('budgetEmail') as string | undefined,
  /** Monthly budget in USD for the alert. */
  budgetUsd: Number(app.node.tryGetContext('budgetUsd') ?? 20),
  /**
   * Pre-event IP allowlist. On unless `-c ipRestriction=false`. Manage the list with
   * `scripts/allow-ip.sh` (blocked for everyone until it is first run).
   */
  ipRestriction: String(app.node.tryGetContext('ipRestriction') ?? 'true') !== 'false',
  /**
   * Custom domain (set in cdk.json). The hosted zone must be named exactly `domainName` and live
   * in the deploy account; delegate it from the parent zone with NS records. `-c domainName=`
   * (empty) deploys without it.
   */
  domainName: (app.node.tryGetContext('domainName') as string | undefined) || undefined,
  hostedZoneId: (app.node.tryGetContext('hostedZoneId') as string | undefined) || undefined,
};

if (Boolean(props.domainName) !== Boolean(props.hostedZoneId)) {
  throw new Error('Set both domainName and hostedZoneId (or neither)');
}
const customDomain =
  props.domainName && props.hostedZoneId
    ? { domainName: props.domainName, hostedZoneId: props.hostedZoneId }
    : undefined;

const virginia = new UsEast1Stack(app, 'CdkLoverUsEast1Stack', {
  env: { account: props.account, region: 'us-east-1' },
  crossRegionReferences: true,
  customDomain,
});

new MainStack(app, 'CdkLoverStack', {
  env: { account: props.account, region: props.region },
  crossRegionReferences: true,
  signPayloadHandler: virginia.signPayloadHandler,
  translateModelId: props.translateModelId,
  summaryModelId: props.summaryModelId,
  budgetEmail: props.budgetEmail,
  budgetUsd: props.budgetUsd,
  ipRestriction: props.ipRestriction,
  customDomain,
  certificate: virginia.certificate,
});

cdk.Tags.of(app).add('Application', 'CdkLover');

// Fail `cdk synth` on templates known to fail at deploy time (rules CloudFormation's schema misses).
Preflight.apply(app);
// Report what the stacks cost with zero traffic; fail synth if the idle cost exceeds the budget.
IdleCost.apply(app, { max: props.budgetUsd, warnAbove: 1 });
