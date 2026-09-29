# Public API Contract: HTTP Client Library

This library's "external interface" is its public TypeScript API (there is no network-facing service contract for this feature — the client is what *calls* other services). This document is the contract for `index.ts`'s exports, which downstream code and tests are written against.

## `createClient(config?: ClientConfig): Client`

Factory function; the sole way to construct a client (no bare constructor export, to keep the surface small and mockable).

```ts
function createClient(config?: ClientConfig): Client;
```

- Every field of `ClientConfig` is optional (see `data-model.md`); calling `createClient()` with no arguments yields a client with no base URL, no default headers, the default timeout (10000ms), and the default retry policy.
- Throws synchronously if `config.baseUrl` is provided but is not a valid absolute URL.

## `Client` interface

```ts
interface Client {
  get<T = unknown>(path: string, options?: RequestOptions): Promise<ClientResponse<T>>;
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ClientResponse<T>>;
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ClientResponse<T>>;
  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ClientResponse<T>>;
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<ClientResponse<T>>;
  useRequestInterceptor(interceptor: RequestInterceptor): void;
  useResponseInterceptor(interceptor: ResponseInterceptor): void;
}
```

- **Contract**: each method resolves with a `ClientResponse<T>` on a 2xx response, and rejects with a `ClientError` subtype (`HttpError | TimeoutError | NetworkError | ParseError | ConfigError`) on any failure (FR-006, FR-014, FR-015, FR-017; spec Story 1, Story 3).
- **Contract**: `get`/`delete` accept no body parameter; `post`/`put`/`patch` accept an optional body as their second positional argument, with `options` shifted to third (FR-001, FR-005).
- **Contract**: `options.headers` are merged over the client's `defaultHeaders`, per-header-name override (FR-003, FR-004; spec Story 2, Acceptance Scenario 3).
- **Contract**: `path` is resolved against `baseUrl` when relative, or used verbatim when it is already an absolute URL (spec Edge Cases).
- **Contract**: `useRequestInterceptor()`/`useResponseInterceptor()` register an interceptor and return nothing; interceptors run in registration order (within their own list), request interceptors before send and response interceptors after receive (FR-008–FR-010; spec Story 5). Two methods exist because a request interceptor and a response interceptor are structurally identical (one-argument functions) and cannot be distinguished at runtime from a single `use()`.
- **Contract**: Calling a client-level method never throws synchronously for a valid config — all failures (including configuration errors like a relative path with no `baseUrl`) surface as a rejected promise with a `ClientError`.

## Error hierarchy

```ts
class ClientError extends Error {
  readonly kind: 'http' | 'timeout' | 'network' | 'parse' | 'config';
  readonly request: { method: HttpMethod; url: string };
  readonly attempt: number;
  readonly cause?: unknown;
}
class HttpError extends ClientError { readonly kind: 'http'; readonly status: number; readonly body: unknown; }
class TimeoutError extends ClientError { readonly kind: 'timeout'; }
class NetworkError extends ClientError { readonly kind: 'network'; }
class ParseError extends ClientError { readonly kind: 'parse'; }
class ConfigError extends ClientError { readonly kind: 'config'; }
```

- **Contract**: every rejection from a `Client` method is `instanceof ClientError`; callers needing to distinguish failure categories check `error.kind` or use `instanceof HttpError`/`TimeoutError`/`NetworkError`/`ParseError`/`ConfigError` (SC-006).
- **Contract**: `HttpError` is raised for any completed response with `status` outside `[200, 299]`, after retries (if any) are exhausted (FR-014, FR-017).
- **Contract**: `TimeoutError` is raised when an attempt's `AbortController` fires due to the configured timeout, not due to a caller-supplied `signal` (FR-011, FR-015).
- **Contract**: `NetworkError` wraps connection-level failures (DNS, connection refused, TLS) that never produced an HTTP response (FR-015).
- **Contract**: `ParseError` is raised when a response declares `Content-Type: application/json` but the body fails to parse as JSON (spec Edge Cases).
- **Contract**: `ConfigError` is raised when a request path is relative but no `baseUrl` was configured (spec Edge Cases).

## Types re-exported from `index.ts`

`ClientConfig`, `RequestOptions`, `ClientResponse`, `RetryPolicy`, `RequestInterceptor`, `ResponseInterceptor`, `HttpMethod`, `ClientError`, `HttpError`, `TimeoutError`, `NetworkError`, `ParseError`, `ConfigError` — all defined in `data-model.md`.

## Stability

This is a v1 contract. Any change to a method signature, the error hierarchy's discriminant values, or default `RetryPolicy`/timeout values is a breaking change for consumers and must be called out explicitly in future plans.
