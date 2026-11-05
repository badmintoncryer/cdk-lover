import { IgnoreMode, Duration, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { DockerImageFunction, Architecture } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CloudFrontLambdaFunctionUrlService } from './cf-lambda-furl-service/service';
import { GeoRestriction } from 'aws-cdk-lib/aws-cloudfront';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Database } from './database';
import { EdgeFunction } from './cf-lambda-furl-service/edge-function';
import { ContainerImageBuild } from '@cdklabs/deploy-time-build';
import { join } from 'path';
import { EventBus } from './event-bus/';

/** `us.amazon.nova-lite-v1:0` (inference profile) → `amazon.nova-lite-v1:0` (foundation model). */
const foundationModel = (modelId: string) => modelId.replace(/^(us|eu|apac|global)\./, '');

export interface WebappProps {
  database: Database;
  signPayloadHandler: EdgeFunction;
  accessLogBucket: Bucket;
  eventBus: EventBus;
  signingKey: ISecret;
  adminPassword: ISecret;
  translateModelId: string;
  summaryModelId: string;
  webAclId?: string;
  geoRestriction?: GeoRestriction;
}

export class Webapp extends Construct {
  public readonly baseUrl: string;

  constructor(scope: Construct, id: string, props: WebappProps) {
    super(scope, id);

    const { database, eventBus } = props;
    const stack = Stack.of(this);

    // ContainerImageBuild injects deploy-time values (Event API endpoint / key) into the Next.js build.
    const image = new ContainerImageBuild(this, 'Build', {
      directory: join('..', '..'),
      platform: Platform.LINUX_ARM64,
      ignoreMode: IgnoreMode.DOCKER,
      tagPrefix: 'cdk-lover-',
      file: 'apps/webapp/Dockerfile',
      buildArgs: {
        ALLOWED_ORIGIN_HOST: '*.cloudfront.net',
        SKIP_TS_BUILD: 'true',
        NEXT_PUBLIC_EVENT_HTTP_ENDPOINT: eventBus.httpEndpoint,
        NEXT_PUBLIC_EVENT_API_KEY: eventBus.apiKey,
        NEXT_PUBLIC_AWS_REGION: stack.region,
      },
    });

    const handler = new DockerImageFunction(this, 'Handler', {
      code: image.toLambdaDockerImageCode(),
      timeout: Duration.minutes(3),
      environment: {
        DSQL_ENDPOINT: database.endpoint,
        EVENT_HTTP_ENDPOINT: eventBus.httpEndpoint,
        SIGNING_KEY_SECRET_ARN: props.signingKey.secretArn,
        ADMIN_PASSWORD_SECRET_ARN: props.adminPassword.secretArn,
        TRANSLATE_MODEL_ID: props.translateModelId,
        SUMMARY_MODEL_ID: props.summaryModelId,
      },
      memorySize: 1024,
      architecture: Architecture.ARM_64,
      logGroup: new LogGroup(this, 'HandlerLogs', {
        retention: RetentionDays.THREE_DAYS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });
    database.grantConnect(handler);
    eventBus.api.grantPublish(handler);
    props.signingKey.grantRead(handler);
    props.adminPassword.grantRead(handler);
    // Only the two configured models. A cross-region inference profile (us.*) routes to the
    // foundation model in any US region, so the foundation-model ARN keeps a region wildcard.
    const modelIds = [...new Set([props.translateModelId, props.summaryModelId])];
    handler.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: modelIds.flatMap((modelId) => [
          `arn:${stack.partition}:bedrock:*::foundation-model/${foundationModel(modelId)}`,
          ...(modelId === foundationModel(modelId)
            ? []
            : [stack.formatArn({ service: 'bedrock', resource: 'inference-profile', resourceName: modelId })]),
        ]),
      }),
    );

    const service = new CloudFrontLambdaFunctionUrlService(this, 'Resource', {
      handler,
      serviceName: 'Webapp',
      accessLogBucket: props.accessLogBucket,
      signPayloadHandler: props.signPayloadHandler,
      webAclId: props.webAclId,
      geoRestriction: props.geoRestriction,
    });
    this.baseUrl = service.url;
  }
}
