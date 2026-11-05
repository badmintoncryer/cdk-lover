import { describe, test, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MainStack } from '../lib/main-stack';
import { UsEast1Stack } from '../lib/us-east-1-stack';

function synth(budgetEmail?: string) {
  const app = new cdk.App();
  const virginia = new UsEast1Stack(app, 'UsEast1Stack', {
    env: { account: '123456789012', region: 'us-east-1' },
    crossRegionReferences: true,
  });
  const main = new MainStack(app, 'MainStack', {
    env: { account: '123456789012', region: 'us-west-2' },
    crossRegionReferences: true,
    signPayloadHandler: virginia.signPayloadHandler,
    budgetEmail,
  });
  return Template.fromStack(main);
}

describe('CDK Lover stack', () => {
  const template = synth();

  test('nothing is retained: cdk destroy removes the database and secrets', () => {
    const clusters = template.findResources('AWS::DSQL::Cluster');
    expect(Object.values(clusters).map((r) => r.DeletionPolicy)).toEqual(['Delete']);
    for (const [, r] of Object.entries(template.findResources('AWS::SecretsManager::Secret'))) {
      expect(r.DeletionPolicy).toBe('Delete');
    }
  });

  test('no Cognito user pool', () => {
    expect(Object.keys(template.findResources('AWS::Cognito::UserPool'))).toHaveLength(0);
  });

  test('browsers subscribe with an API key, publishing is IAM-only', () => {
    template.hasResourceProperties('AWS::AppSync::Api', {
      EventConfig: Match.objectLike({
        DefaultPublishAuthModes: [{ AuthType: 'AWS_IAM' }],
        DefaultSubscribeAuthModes: [{ AuthType: 'API_KEY' }],
      }),
    });
    expect(Object.keys(template.findResources('AWS::AppSync::ApiKey'))).toHaveLength(1);
  });

  test('webapp can call Bedrock and gets the model ids', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'] }),
        ]),
      },
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          TRANSLATE_MODEL_ID: 'us.amazon.nova-lite-v1:0',
          SUMMARY_MODEL_ID: 'us.amazon.nova-pro-v1:0',
        }),
      },
    });
    expect(JSON.stringify(template.toJSON())).toContain('bedrock:InvokeModel');
  });

  test('budget is only created when an email is given', () => {
    expect(Object.keys(template.findResources('AWS::Budgets::Budget'))).toHaveLength(0);
    expect(Object.keys(synth('host@example.com').findResources('AWS::Budgets::Budget'))).toHaveLength(1);
  });
});
