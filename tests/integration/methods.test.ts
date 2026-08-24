import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { createClient } from '../../src/client.js';

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

describe('HTTP methods (Story 1)', () => {
  it('GET returns status, headers, and body', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/users/42', method: 'GET' }).reply(200, { id: 42, name: 'Ada' }, {
      headers: { 'content-type': 'application/json' },
    });

    const client = createClient({ baseUrl: 'https://api.example.com' });
    const res = await client.get<{ id: number; name: string }>('/users/42');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 42, name: 'Ada' });
    expect(res.headers['content-type']).toContain('application/json');
  });

  it('DELETE sends no body and returns the response', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/users/42', method: 'DELETE' }).reply(204, '');

    const client = createClient({ baseUrl: 'https://api.example.com' });
    const res = await client.delete('/users/42');
    expect(res.status).toBe(204);
  });

  it.each([
    ['POST', 'post'],
    ['PUT', 'put'],
    ['PATCH', 'patch'],
  ] as const)('%s serializes a JSON body and returns the response', async (httpMethod, clientMethod) => {
    const pool = mockAgent.get('https://api.example.com');
    pool
      .intercept({
        path: '/users',
        method: httpMethod,
        body: JSON.stringify({ name: 'Ada' }),
      })
      .reply(201, { id: 1, name: 'Ada' }, { headers: { 'content-type': 'application/json' } });

    const client = createClient({ baseUrl: 'https://api.example.com' });
    const res = await client[clientMethod]('/users', { name: 'Ada' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, name: 'Ada' });
  });
});

describe('client configuration reuse (Story 2)', () => {
  it('resolves a relative path against the configured base URL', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/ping', method: 'GET' }).reply(200, 'pong');

    const client = createClient({ baseUrl: 'https://api.example.com' });
    const res = await client.get('/ping');
    expect(res.status).toBe(200);
  });

  it('includes default headers on every request', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool
      .intercept({
        path: '/secure',
        method: 'GET',
        headers: { authorization: 'Bearer token' },
      })
      .reply(200, 'ok');

    const client = createClient({
      baseUrl: 'https://api.example.com',
      defaultHeaders: { Authorization: 'Bearer token' },
    });
    const res = await client.get('/secure');
    expect(res.status).toBe(200);
  });

  it('lets a per-request header override the default header of the same name', async () => {
    const pool = mockAgent.get('https://api.example.com');
    pool
      .intercept({
        path: '/secure',
        method: 'GET',
        headers: { authorization: 'Bearer override' },
      })
      .reply(200, 'ok');

    const client = createClient({
      baseUrl: 'https://api.example.com',
      defaultHeaders: { Authorization: 'Bearer default' },
    });
    const res = await client.get('/secure', { headers: { Authorization: 'Bearer override' } });
    expect(res.status).toBe(200);
  });

  it('uses an absolute URL as-is, bypassing the configured base URL', async () => {
    const pool = mockAgent.get('https://other.example.com');
    pool.intercept({ path: '/x', method: 'GET' }).reply(200, 'ok');

    const client = createClient({ baseUrl: 'https://api.example.com' });
    const res = await client.get('https://other.example.com/x');
    expect(res.status).toBe(200);
  });
});
