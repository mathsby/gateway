import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { createClient } from '../../src/client.js';
import { ConfigError, HttpError, NetworkError, ParseError, TimeoutError } from '../../src/errors.js';

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

describe('structured errors (Story 3)', () => {
  it('raises HttpError for a non-2xx response, carrying status/body/request context', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/users/999', method: 'GET' }).reply(404, { error: 'not found' }, {
      headers: { 'content-type': 'application/json' },
    });

    const client = createClient({ baseUrl: 'https://api.example.com', retryPolicy: { maxRetries: 0 } });
    const error = await client.get('/users/999').catch((e) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
    expect((error as HttpError).body).toEqual({ error: 'not found' });
    expect((error as HttpError).request).toEqual({
      method: 'GET',
      url: 'https://api.example.com/users/999',
    });
  });

  it('raises TimeoutError when the response exceeds the configured timeout', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/slow', method: 'GET' }).reply(200, 'late').delay(300);

    const client = createClient({
      baseUrl: 'https://api.example.com',
      timeoutMs: 50,
      retryPolicy: { maxRetries: 0 },
    });
    const error = await client.get('/slow').catch((e) => e);

    expect(error).toBeInstanceOf(TimeoutError);
  });

  it('raises NetworkError for a connection-level failure, distinguishable from a timeout', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/down', method: 'GET' }).replyWithError(new Error('connection refused'));

    const client = createClient({ baseUrl: 'https://api.example.com', retryPolicy: { maxRetries: 0 } });
    const error = await client.get('/down').catch((e) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).not.toBeInstanceOf(TimeoutError);
  });

  it('raises ParseError when a declared-JSON response body is not valid JSON', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/broken', method: 'GET' }).reply(200, 'not-json{', {
      headers: { 'content-type': 'application/json' },
    });

    const client = createClient({ baseUrl: 'https://api.example.com', retryPolicy: { maxRetries: 0 } });
    const error = await client.get('/broken').catch((e) => e);

    expect(error).toBeInstanceOf(ParseError);
  });

  it('raises ConfigError when a relative path is used with no baseUrl configured', async () => {
    const client = createClient();
    const error = await client.get('/no-base-url').catch((e) => e);

    expect(error).toBeInstanceOf(ConfigError);
  });
});
