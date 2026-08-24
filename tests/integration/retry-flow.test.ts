import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { createClient } from '../../src/client.js';
import { HttpError } from '../../src/errors.js';

let mockAgent: MockAgent;
let originalDispatcher: ReturnType<typeof getGlobalDispatcher>;

beforeEach(() => {
  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

describe('automatic retry (Story 4)', () => {
  it('retries a retryable 503 failure and returns the eventual success', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/flaky', method: 'GET' }).reply(503, 'unavailable');
    pool.intercept({ path: '/flaky', method: 'GET' }).reply(503, 'unavailable');
    pool.intercept({ path: '/flaky', method: 'GET' }).reply(200, 'ok');

    const client = createClient({
      baseUrl: 'https://api.example.com',
      retryPolicy: { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 5 },
    });

    const res = await client.get('/flaky');
    expect(res.status).toBe(200);
  });

  it('surfaces the final error once the retry budget is exhausted', async () => {
    const pool = mockAgent.get('https://api.example.com');
    for (let i = 0; i < 3; i++) {
      pool.intercept({ path: '/always-down', method: 'GET' }).reply(503, 'unavailable');
    }

    const client = createClient({
      baseUrl: 'https://api.example.com',
      retryPolicy: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 },
    });

    const error = await client.get('/always-down').catch((e) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(503);
    expect((error as HttpError).attempt).toBe(3);
  });

  it('does not retry a non-retryable 400 failure', async () => {
    const pool = mockAgent.get('https://api.example.com');
    // Only one interceptor is registered — if the client retried, the second attempt
    // would find no matching mock and fail with a different error, breaking this test.
    pool.intercept({ path: '/bad-request', method: 'GET' }).reply(400, 'bad request');

    const client = createClient({
      baseUrl: 'https://api.example.com',
      retryPolicy: { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 5 },
    });

    const error = await client.get('/bad-request').catch((e) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(400);
    expect((error as HttpError).attempt).toBe(1);
  });
});
