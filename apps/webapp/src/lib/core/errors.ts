/**
 * An error whose message is safe to show to the caller (a short code such as "not found" or a
 * human-readable admin message). Anything else is logged and reported as a generic "error".
 */
export class CoreError extends Error {}

export const coreError = (message: string) => new CoreError(message);
