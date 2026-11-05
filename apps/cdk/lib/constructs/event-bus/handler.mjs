import { util } from '@aws-appsync/utils';

/**
 * Browsers subscribe with a public API key, so only the public channels are allowed.
 * The trailing "/" keeps `/event-bus/publicfoo` from matching.
 */
export function onSubscribe(ctx) {
  if (ctx.info.channel.path.startsWith('/event-bus/public/')) {
    return;
  }
  util.unauthorized();
}
