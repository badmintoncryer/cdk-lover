import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Certificate, CertificateValidation, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { EdgeFunction } from './constructs/cf-lambda-furl-service/edge-function';
import { join } from 'path';

export interface CustomDomain {
  /** e.g. `cdk-lover.appnao.com`. The site is served at the apex of the hosted zone. */
  readonly domainName: string;
  /** Public hosted zone whose name is `domainName`, in the deploy account. */
  readonly hostedZoneId: string;
}

interface UsEast1StackProps extends cdk.StackProps {
  /**
   * @default CloudFront's default domain only
   */
  readonly customDomain?: CustomDomain;
}

export class UsEast1Stack extends cdk.Stack {
  /**
   * the signer L@E function (it must be deployed in us-east-1).
   */
  public readonly signPayloadHandler: EdgeFunction;

  /**
   * Certificate for the custom domain (CloudFront needs it in us-east-1).
   */
  public readonly certificate?: ICertificate;

  constructor(scope: Construct, id: string, props: UsEast1StackProps) {
    super(scope, id, props);

    const signPayloadHandler = new EdgeFunction(this, 'SignPayloadHandler', {
      entryPath: join(__dirname, 'constructs', 'cf-lambda-furl-service', 'lambda', 'sign-payload.ts'),
    });

    this.signPayloadHandler = signPayloadHandler;

    if (props.customDomain) {
      const { domainName, hostedZoneId } = props.customDomain;
      this.certificate = new Certificate(this, 'Certificate', {
        domainName,
        validation: CertificateValidation.fromDns(
          HostedZone.fromHostedZoneAttributes(this, 'HostedZone', { hostedZoneId, zoneName: domainName }),
        ),
      });
    }
  }
}
