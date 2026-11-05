#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main-stack';
import { UsEast1Stack } from '../lib/us-east-1-stack';

const app = new cdk.App();

/**
 * Deployment settings. Values can also be passed with `-c key=value`.
 */
const props = {
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
  /** Bedrock model (or inference profile) used to translate posts. */
  translateModelId: app.node.tryGetContext('translateModelId') ?? 'us.amazon.nova-lite-v1:0',
  /** Bedrock model (or inference profile) used to summarize all opinions. */
  summaryModelId: app.node.tryGetContext('summaryModelId') ?? 'us.amazon.nova-pro-v1:0',
  /** Email address that receives the AWS Budgets alert. Leave unset to skip the budget. */
  budgetEmail: app.node.tryGetContext('budgetEmail') as string | undefined,
  /** Monthly budget in USD for the alert. */
  budgetUsd: Number(app.node.tryGetContext('budgetUsd') ?? 20),
};

const virginia = new UsEast1Stack(app, 'CdkLoverUsEast1Stack', {
  env: { account: props.account, region: 'us-east-1' },
  crossRegionReferences: true,
});

new MainStack(app, 'CdkLoverStack', {
  env: { account: props.account, region: props.region },
  crossRegionReferences: true,
  signPayloadHandler: virginia.signPayloadHandler,
  webAclId: virginia.webAclArn,
  translateModelId: props.translateModelId,
  summaryModelId: props.summaryModelId,
  budgetEmail: props.budgetEmail,
  budgetUsd: props.budgetUsd,
});

cdk.Tags.of(app).add('Application', 'CdkLover');
