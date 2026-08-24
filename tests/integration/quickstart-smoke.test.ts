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

// End-to-end smoke test walking through quickstart.md's scenarios together on one
// client instance: shared config (Story 2), interceptors (Story 5) that must apply
// to every call including retried ones (Story 4), and a final structured error (Story 3).
it('combines config reuse, interceptors, and retry across several calls on one client', async () => {
  const pool = mockAgent.get('https://api.example.com');
  pool
    .intercept({ path: '/users/42', method: 'GET', headers: { 'x-request-id': /.+/ } })
    .reply(200, { id: 42, name: 'Ada' }, { headers: { 'content-type': 'application/json' } });
  pool.intercept({ path: '/flaky', method: 'GET', headers: { 'x-request-id': /.+/ } }).reply(503, 'unavailable');
  pool
    .intercept({ path: '/flaky', method: 'GET', headers: { 'x-request-id': /.+/ } })
    .reply(200, 'recovered');
  pool
    .intercept({ path: '/missing', method: 'GET', headers: { 'x-request-id': /.+/ } })
    .reply(404, { error: 'not found' }, { headers: { 'content-type': 'application/json' } });

  const seenResponses: number[] = [];
  const client = createClient({
    baseUrl: 'https://api.example.com',
    retryPolicy: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 },
  });
  client.useRequestInterceptor((req) => ({
    ...req,
    headers: { ...req.headers, 'X-Request-Id': 'smoke-test' },
  }));
  client.useResponseInterceptor((res) => {
    seenResponses.push(res.status);
    return res;
  });

  const ok = await client.get<{ id: number; name: string }>('/users/42');
  expect(ok.body).toEqual({ id: 42, name: 'Ada' });

  const recovered = await client.get('/flaky');
  expect(recovered.status).toBe(200);

  const error = await client.get('/missing').catch((e) => e);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(404);

  // The response interceptor ran for both successful calls (SC-005), but not for
  // the failed one, since HttpError never produces a ClientResponse to intercept.
  expect(seenResponses).toEqual([200, 200]);
});
