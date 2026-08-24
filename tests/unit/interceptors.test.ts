import { describe, expect, it } from 'vitest';
import { runRequestInterceptors, runResponseInterceptors } from '../../src/interceptors.js';
import type { ClientResponse, ResolvedRequest } from '../../src/types.js';

const baseRequest: ResolvedRequest = { method: 'GET', url: 'https://api.example.com/x', headers: {} };
const baseResponse: ClientResponse = {
  status: 200,
  headers: {},
  body: { ok: true },
  request: { method: 'GET', url: 'https://api.example.com/x' },
};

describe('runRequestInterceptors', () => {
  it('runs interceptors in registration order, threading the result forward', async () => {
    const order: string[] = [];
    const result = await runRequestInterceptors(
      [
        async (req) => {
          order.push('first');
          return { ...req, headers: { ...req.headers, A: '1' } };
        },
        async (req) => {
          order.push('second');
          return { ...req, headers: { ...req.headers, B: '2' } };
        },
      ],
      baseRequest,
    );
    expect(order).toEqual(['first', 'second']);
    expect(result.headers).toEqual({ A: '1', B: '2' });
  });

  it('returns the original request unchanged when no interceptors are registered', async () => {
    const result = await runRequestInterceptors([], baseRequest);
    expect(result).toBe(baseRequest);
  });

  it('propagates an error thrown by an interceptor', async () => {
    await expect(
      runRequestInterceptors(
        [
          async () => {
            throw new Error('boom');
          },
        ],
        baseRequest,
      ),
    ).rejects.toThrow('boom');
  });
});

describe('runResponseInterceptors', () => {
  it('runs interceptors in registration order, threading the result forward', async () => {
    const order: string[] = [];
    const result = await runResponseInterceptors(
      [
        async (res) => {
          order.push('first');
          return { ...res, body: { ...(res.body as object), a: 1 } };
        },
        async (res) => {
          order.push('second');
          return { ...res, body: { ...(res.body as object), b: 2 } };
        },
      ],
      baseResponse,
    );
    expect(order).toEqual(['first', 'second']);
    expect(result.body).toEqual({ ok: true, a: 1, b: 2 });
  });

  it('propagates an error thrown by an interceptor', async () => {
    await expect(
      runResponseInterceptors(
        [
          async () => {
            throw new Error('boom');
          },
        ],
        baseResponse,
      ),
    ).rejects.toThrow('boom');
  });
});
