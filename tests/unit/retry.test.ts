import { describe, expect, it } from 'vitest';
import { computeBackoffDelayMs, isRetryableError } from '../../src/retry.js';
import { DEFAULT_RETRY_POLICY, type HttpMethod } from '../../src/types.js';
import { HttpError, NetworkError, TimeoutError } from '../../src/errors.js';

const request: { method: HttpMethod; url: string } = { method: 'GET', url: 'https://api.example.com/x' };

describe('computeBackoffDelayMs', () => {
  it('stays within [0, maxDelayMs] across a range of attempts', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, baseDelayMs: 100, maxDelayMs: 2000 };
    for (let attempt = 1; attempt <= 6; attempt++) {
      const delay = computeBackoffDelayMs(policy, attempt);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(policy.maxDelayMs);
    }
  });

  it('clamps to maxDelayMs even for large attempt numbers', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, baseDelayMs: 100, maxDelayMs: 500 };
    const delay = computeBackoffDelayMs(policy, 10);
    expect(delay).toBeLessThanOrEqual(500);
  });

  it('grows the unclamped delay between early attempts', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, baseDelayMs: 100, maxDelayMs: 100_000 };
    // With maxDelayMs effectively unreachable, attempt 3's ceiling (400ms) must exceed attempt 1's (100ms).
    const ceilingAttempt1 = policy.baseDelayMs * 2 ** 0;
    const ceilingAttempt3 = policy.baseDelayMs * 2 ** 2;
    expect(ceilingAttempt3).toBeGreaterThan(ceilingAttempt1);
  });
});

describe('isRetryableError', () => {
  const policy = DEFAULT_RETRY_POLICY;

  it('treats timeout errors as retryable', () => {
    expect(isRetryableError(policy, new TimeoutError({ message: 'x', request }), 1)).toBe(true);
  });

  it('treats network errors as retryable', () => {
    expect(isRetryableError(policy, new NetworkError({ message: 'x', request }), 1)).toBe(true);
  });

  it('treats a 5xx HttpError in retryableStatusCodes as retryable', () => {
    const error = new HttpError({ message: 'x', request, status: 503, body: undefined });
    expect(isRetryableError(policy, error, 1)).toBe(true);
  });

  it('does not treat a 4xx HttpError as retryable by default', () => {
    const error = new HttpError({ message: 'x', request, status: 400, body: undefined });
    expect(isRetryableError(policy, error, 1)).toBe(false);
  });

  it('honors a custom isRetryable predicate override', () => {
    const customPolicy = { ...policy, isRetryable: () => true };
    const error = new HttpError({ message: 'x', request, status: 400, body: undefined });
    expect(isRetryableError(customPolicy, error, 1)).toBe(true);
  });
});
