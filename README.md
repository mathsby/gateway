# gateway

A dependency-free TypeScript HTTP client library for making API calls: common HTTP methods, configurable base URL and default headers, request/response interceptors, per-request timeout, and automatic retry with backoff — all surfaced as structured, catchable errors.

API Doc on Render- https://gateway-api-docs.onrender.com/

Grafana dashboard- https://playfulradish138.grafana.net/public-dashboards/d7ec08f103064363a795d079f0dde0a2

Make a 200 GET request in Postman- https://client-gateway-api.onrender.com/sites/00000000-0000-0000-0000-000000000001/assignments

C# servers are good at handling high load and computationally complex tasks and the compiler serves as a strong line of defense. 
Python makes for very readable UI tests and any performance hit is negligible.  
It also has the most support from selenium.
JavaScript/typescript for API and contract testing allow for fast and flexible testing with a robust set of tools around it.
Playwright tests have been added that include a trace.

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
