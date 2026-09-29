# Quickstart: HTTP Client Library

Validates the feature end-to-end against [spec.md](./spec.md)'s acceptance scenarios, using the API defined in [contracts/public-api.md](./contracts/public-api.md).

## Prerequisites

- Node.js 20 LTS installed (18.17+ also works; see research.md)
- Repository dependencies installed: `npm install`

## 1. Basic call with shared configuration (Story 1 + Story 2)

```ts
import { createClient } from './src/index.js';

const client = createClient({
  baseUrl: 'https://api.example.com',
  defaultHeaders: { 'Authorization': 'Bearer <token>' },
});

const { status, body } = await client.get('/users/42');
console.log(status, body);

await client.post('/users', { name: 'Ada' });
```

**Expected outcome**: the GET resolves the URL to `https://api.example.com/users/42`, sends the default `Authorization` header, and returns `{ status, headers, body }` for a 2xx response — satisfying SC-001 (a working call in under 5 lines).

## 2. Structured error handling (Story 3)

```ts
import { HttpError, TimeoutError, NetworkError } from './src/index.js';

try {
  await client.get('/users/does-not-exist');
} catch (err) {
  if (err instanceof HttpError) {
    console.error('HTTP failure', err.status, err.body);
  } else if (err instanceof TimeoutError) {
    console.error('timed out');
  } else if (err instanceof NetworkError) {
    console.error('network failure', err.cause);
  } else {
    throw err;
  }
}
```

**Expected outcome**: a 404 response raises `HttpError` with `status: 404` and the response body attached, without crashing the process — satisfying SC-002 and SC-006.

## 3. Timeout enforcement

```ts
const fastClient = createClient({ baseUrl: 'https://slow.example.com', timeoutMs: 200 });
await fastClient.get('/slow-endpoint'); // rejects with TimeoutError if the server takes >200ms
```

**Expected outcome**: the call rejects with `TimeoutError` at ~200ms, not left hanging — satisfying SC-003.

## 4. Retry on transient failure (Story 4)

```ts
const resilientClient = createClient({
  baseUrl: 'https://api.example.com',
  retryPolicy: { maxRetries: 3 },
});

await resilientClient.get('/flaky'); // transparently retried up to 3 times on 5xx/timeout/network errors
```

**Expected outcome**: if `/flaky` fails with a retryable error fewer than 3 times before succeeding, the call resolves normally with no error surfaced — satisfying SC-004. If it fails on every attempt, the final `ClientError` is raised after all retries are exhausted.

## 5. Interceptors (Story 5)

```ts
client.useRequestInterceptor(async (req) => ({ ...req, headers: { ...req.headers, 'X-Request-Id': crypto.randomUUID() } }));
client.useResponseInterceptor(async (res) => { console.log(`${res.request.method} ${res.request.url} -> ${res.status}`); return res; });
```

**Expected outcome**: every subsequent request carries an `X-Request-Id` header and every response is logged, with zero changes to existing `client.get/post/...` call sites — satisfying SC-005.

## Running the automated checks

```bash
npm test          # runs the Vitest suite (tests/unit + tests/integration)
npm run typecheck # tsc --noEmit, validates the public API contract compiles as documented above
```

**Expected outcome**: all tests in `tests/unit` and `tests/integration` (see [plan.md](./plan.md) Project Structure) pass, covering every acceptance scenario referenced above.
