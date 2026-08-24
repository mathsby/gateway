# gateway

A dependency-free TypeScript HTTP client library for making API calls: common HTTP methods, configurable base URL and default headers, request/response interceptors, per-request timeout, and automatic retry with backoff — all surfaced as structured, catchable errors.

Full design docs live under [specs/001-http-client/](specs/001-http-client/) (spec, plan, research, data model, API contract).

## Install

```bash
npm install
```

Requires Node.js 18.17+ (20 LTS recommended). No runtime dependencies.

## Usage

```ts
import { createClient, HttpError, TimeoutError, NetworkError } from './src/index.js';

const client = createClient({
  baseUrl: 'https://api.example.com',
  defaultHeaders: { Authorization: 'Bearer <token>' },
});

const { status, body } = await client.get('/users/42');

await client.post('/users', { name: 'Ada' });

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

client.useRequestInterceptor(async (req) => ({
  ...req,
  headers: { ...req.headers, 'X-Request-Id': crypto.randomUUID() },
}));
```

See [specs/001-http-client/quickstart.md](specs/001-http-client/quickstart.md) for the full walkthrough (timeout, retry policy, interceptors) and [specs/001-http-client/contracts/public-api.md](specs/001-http-client/contracts/public-api.md) for the complete API contract.

## Scripts

```bash
npm run build      # compile src/ to dist/ (ESM + .d.ts)
npm run typecheck  # tsc --noEmit across src/ and tests/
npm test           # run the Vitest suite (tests/unit + tests/integration)
```
