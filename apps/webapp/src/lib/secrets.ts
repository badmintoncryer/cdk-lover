import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const cache = new Map<string, Promise<string>>();
const client = new SecretsManagerClient({});

async function fetchSecret(arn: string): Promise<string> {
  const res = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!res.SecretString) throw new Error(`secret ${arn} has no string value`);
  return res.SecretString;
}

/** Secrets Manager value, or a plain env var for local development. */
function load(arnEnv: string, plainEnv: string): Promise<string> {
  const plain = process.env[plainEnv];
  if (plain) return Promise.resolve(plain);
  const arn = process.env[arnEnv];
  if (!arn) throw new Error(`${arnEnv} or ${plainEnv} must be set`);
  let p = cache.get(arn);
  if (!p) {
    p = fetchSecret(arn);
    // Do not cache a rejected promise; let the next request retry.
    p.catch(() => cache.delete(arn));
    cache.set(arn, p);
  }
  return p;
}

export const getSigningKey = () => load('SIGNING_KEY_SECRET_ARN', 'SIGNING_KEY');
export const getAdminPassword = () => load('ADMIN_PASSWORD_SECRET_ARN', 'ADMIN_PASSWORD');

/** Bearer token for the admin tools of the MCP endpoint. Empty when not configured (admin MCP off). */
export async function getMcpAdminToken(): Promise<string> {
  if (!process.env.MCP_ADMIN_TOKEN && !process.env.MCP_ADMIN_TOKEN_SECRET_ARN) return '';
  return (await load('MCP_ADMIN_TOKEN_SECRET_ARN', 'MCP_ADMIN_TOKEN')).trim();
}
