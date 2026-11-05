import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { CfnOutput, Duration, Expiration, Names } from 'aws-cdk-lib';
import { join } from 'path';

export interface EventBusProps {
  /**
   * How long the public subscribe-only API key stays valid.
   *
   * @default 90 days
   */
  readonly apiKeyLifetime?: Duration;
}

/**
 * Real-time fan-out for board updates.
 *
 * Attendees have no login, so browsers subscribe with an API key that the namespace handler
 * restricts to `/event-bus/public/*`. Publishing stays IAM-only (the webapp Lambda), so the key
 * shipped to the browser cannot be used to push fake events.
 */
export class EventBus extends Construct {
  public readonly httpEndpoint: string;
  public readonly api: appsync.EventApi;
  public readonly apiKey: string;

  constructor(scope: Construct, id: string, props: EventBusProps = {}) {
    super(scope, id);

    const api = new appsync.EventApi(this, 'Api', {
      apiName: Names.uniqueResourceName(this, { maxLength: 30 }),
      authorizationConfig: {
        authProviders: [
          { authorizationType: appsync.AppSyncAuthorizationType.IAM },
          {
            authorizationType: appsync.AppSyncAuthorizationType.API_KEY,
            apiKeyConfig: {
              // The default (7 days) would expire between deploy and the event.
              expires: Expiration.after(props.apiKeyLifetime ?? Duration.days(90)),
            },
          },
        ],
        connectionAuthModeTypes: [appsync.AppSyncAuthorizationType.IAM, appsync.AppSyncAuthorizationType.API_KEY],
        defaultPublishAuthModeTypes: [appsync.AppSyncAuthorizationType.IAM],
        defaultSubscribeAuthModeTypes: [appsync.AppSyncAuthorizationType.API_KEY],
      },
    });

    new appsync.ChannelNamespace(this, 'Namespace', {
      api,
      channelNamespaceName: 'event-bus',
      code: appsync.Code.fromAsset(join(__dirname, 'handler.mjs')),
    });

    this.httpEndpoint = `https://${api.httpDns}`;
    this.api = api;
    this.apiKey = api.apiKeys['Default'].attrApiKey;

    new CfnOutput(this, 'HttpEndpoint', { value: this.httpEndpoint });
  }
}
