import { HttpError, type ClientError } from './errors.js';
import type { RetryPolicy } from './types.js';

/**
 * Exponential backoff with +/-50% jitter, clamped to [0, maxDelayMs].
 * attempt is 1-based (the delay computed before retrying attempt N+1).
 */
export function computeBackoffDelayMs(policy: RetryPolicy, attempt: number): number {
  const exponential = policy.baseDelayMs * 2 ** (attempt - 1);
  const capped = Math.min(policy.maxDelayMs, exponential);
  const jitterFactor = 0.5 + Math.random() / 2;
  return Math.round(capped * jitterFactor);
}

export function isRetryableError(policy: RetryPolicy, error: ClientError, attempt: number): boolean {
  if (policy.isRetryable) {
    return policy.isRetryable(error, attempt);
  }
  if (error.kind === 'timeout' || error.kind === 'network') {
    return true;
  }
  if (error instanceof HttpError) {
    return policy.retryableStatusCodes.includes(error.status);
  }
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
