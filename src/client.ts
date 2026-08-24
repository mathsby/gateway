import { ClientError, ConfigError, HttpError, NetworkError, ParseError, TimeoutError } from './errors.js';
import { runRequestInterceptors, runResponseInterceptors } from './interceptors.js';
import { computeBackoffDelayMs, isRetryableError, sleep } from './retry.js';
import {
  DEFAULT_RETRY_POLICY,
  DEFAULT_TIMEOUT_MS,
  type Client,
  type ClientConfig,
  type ClientResponse,
  type HttpMethod,
  type RequestInterceptor,
  type RequestOptions,
  type ResolvedRequest,
  type ResponseInterceptor,
  type RetryPolicy,
} from './types.js';

const TIMEOUT_REASON = Symbol('http-client:timeout');

export function isAbsoluteUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function resolveUrl(
  baseUrl: string | undefined,
  path: string,
  query: Record<string, string | number | boolean> | undefined,
  requestContext: { method: HttpMethod },
): string {
  let url: URL;
  if (isAbsoluteUrl(path)) {
    url = new URL(path);
  } else {
    if (!baseUrl) {
      throw new ConfigError({
        message: `Cannot resolve relative path "${path}": no baseUrl was configured on this client`,
        request: { method: requestContext.method, url: path },
      });
    }
    url = new URL(path, baseUrl);
  }
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Case-insensitive header merge: a key in `overrides` replaces the same-named key in `defaults`. */
export function mergeHeaders(
  defaults: Record<string, string> = {},
  overrides: Record<string, string> = {},
): Record<string, string> {
  const result: Record<string, string> = {};
  const lowerToKey = new Map<string, string>();

  for (const [key, value] of Object.entries(defaults)) {
    result[key] = value;
    lowerToKey.set(key.toLowerCase(), key);
  }
  for (const [key, value] of Object.entries(overrides)) {
    const existingKey = lowerToKey.get(key.toLowerCase());
    if (existingKey !== undefined && existingKey !== key) {
      delete result[existingKey];
    }
    result[key] = value;
    lowerToKey.set(key.toLowerCase(), key);
  }
  return result;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

type RequestBody = string | Uint8Array | ArrayBuffer;

function prepareBody(
  body: unknown,
  headers: Record<string, string>,
): { body: RequestBody | undefined; headers: Record<string, string> } {
  if (body === undefined || body === null) {
    return { body: undefined, headers };
  }
  if (typeof body === 'string' || body instanceof Uint8Array || body instanceof ArrayBuffer) {
    return { body, headers };
  }
  const finalHeaders = hasHeader(headers, 'content-type')
    ? headers
    : { ...headers, 'Content-Type': 'application/json' };
  return { body: JSON.stringify(body), headers: finalHeaders };
}

function buildResolvedRequest(
  method: HttpMethod,
  baseUrl: string | undefined,
  path: string,
  mergedHeaders: Record<string, string>,
  query: Record<string, string | number | boolean> | undefined,
  rawBody: unknown,
): ResolvedRequest {
  const url = resolveUrl(baseUrl, path, query, { method });
  const { body, headers } = prepareBody(rawBody, mergedHeaders);
  return { method, url, headers, body };
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    record[key] = value;
  }
  return record;
}

async function parseResponseBody(
  response: Response,
  requestContext: { method: HttpMethod; url: string },
  attempt: number,
): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const text = await response.text();
    if (text.length === 0) {
      return undefined;
    }
    try {
      return JSON.parse(text);
    } catch (cause) {
      throw new ParseError({
        message: 'Failed to parse response body as JSON despite a JSON Content-Type',
        request: requestContext,
        attempt,
        cause,
      });
    }
  }
  return response.text();
}

async function executeAttempt(
  resolvedRequest: ResolvedRequest,
  timeoutMs: number,
  externalSignal: AbortSignal | undefined,
  attempt: number,
): Promise<ClientResponse> {
  const requestContext = { method: resolvedRequest.method, url: resolvedRequest.url };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(TIMEOUT_REASON), timeoutMs);

  let onExternalAbort: (() => void) | undefined;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      onExternalAbort = () => controller.abort(externalSignal.reason);
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const response = await fetch(resolvedRequest.url, {
      method: resolvedRequest.method,
      headers: resolvedRequest.headers,
      body: resolvedRequest.body as RequestBody | undefined,
      signal: controller.signal,
    });

    const body = await parseResponseBody(response, requestContext, attempt);

    if (response.status < 200 || response.status >= 300) {
      throw new HttpError({
        message: `Request failed with status ${response.status}`,
        request: requestContext,
        attempt,
        status: response.status,
        body,
      });
    }

    return {
      status: response.status,
      headers: headersToRecord(response.headers),
      body,
      request: requestContext,
    };
  } catch (err) {
    if (err instanceof HttpError || err instanceof ParseError) {
      throw err;
    }
    // A fetch aborted via AbortController.abort(reason) rejects with `reason` itself
    // (not necessarily an Error/AbortError instance), so detect abort via the signal.
    if (controller.signal.aborted) {
      if (controller.signal.reason === TIMEOUT_REASON) {
        throw new TimeoutError({
          message: `Request timed out after ${timeoutMs}ms`,
          request: requestContext,
          attempt,
          cause: err,
        });
      }
      throw new NetworkError({
        message: 'Request was aborted',
        request: requestContext,
        attempt,
        cause: err,
      });
    }
    throw new NetworkError({
      message: err instanceof Error ? err.message : 'Network request failed',
      request: requestContext,
      attempt,
      cause: err,
    });
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && onExternalAbort) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

async function requestWithRetry(
  resolvedRequest: ResolvedRequest,
  retryPolicy: RetryPolicy,
  timeoutMs: number,
  externalSignal: AbortSignal | undefined,
): Promise<ClientResponse> {
  const totalAttempts = retryPolicy.maxRetries + 1;
  let lastError: ClientError | undefined;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      return await executeAttempt(resolvedRequest, timeoutMs, externalSignal, attempt);
    } catch (err) {
      const clientError = err as ClientError;
      lastError = clientError;
      const isLastAttempt = attempt === totalAttempts;
      if (isLastAttempt || !isRetryableError(retryPolicy, clientError, attempt)) {
        throw clientError;
      }
      await sleep(computeBackoffDelayMs(retryPolicy, attempt));
    }
  }
  // Unreachable: the loop above always returns or throws.
  throw lastError as ClientError;
}

interface ClientState {
  baseUrl?: string;
  defaultHeaders: Record<string, string>;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  requestInterceptors: RequestInterceptor[];
  responseInterceptors: ResponseInterceptor[];
}

function createRequestExecutor(state: ClientState) {
  return async function performRequest<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    options: RequestOptions | undefined,
  ): Promise<ClientResponse<T>> {
    const mergedHeaders = mergeHeaders(state.defaultHeaders, options?.headers);
    let resolvedRequest = buildResolvedRequest(method, state.baseUrl, path, mergedHeaders, options?.query, body);
    resolvedRequest = await runRequestInterceptors(state.requestInterceptors, resolvedRequest);

    const effectiveTimeoutMs = options?.timeoutMs ?? state.timeoutMs;
    const effectiveRetryPolicy: RetryPolicy = { ...state.retryPolicy, ...options?.retryPolicy };

    const response = await requestWithRetry(resolvedRequest, effectiveRetryPolicy, effectiveTimeoutMs, options?.signal);
    const finalResponse = await runResponseInterceptors(state.responseInterceptors, response);
    return finalResponse as ClientResponse<T>;
  };
}

export function createClient(config: ClientConfig = {}): Client {
  if (config.baseUrl !== undefined && !isAbsoluteUrl(config.baseUrl)) {
    throw new Error(`Invalid ClientConfig: baseUrl "${config.baseUrl}" is not a valid absolute URL`);
  }

  const state: ClientState = {
    baseUrl: config.baseUrl,
    defaultHeaders: { ...(config.defaultHeaders ?? {}) },
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    retryPolicy: { ...DEFAULT_RETRY_POLICY, ...(config.retryPolicy ?? {}) },
    requestInterceptors: [...(config.interceptors?.request ?? [])],
    responseInterceptors: [...(config.interceptors?.response ?? [])],
  };

  const performRequest = createRequestExecutor(state);

  return {
    get: (path, options) => performRequest('GET', path, undefined, options),
    post: (path, body, options) => performRequest('POST', path, body, options),
    put: (path, body, options) => performRequest('PUT', path, body, options),
    patch: (path, body, options) => performRequest('PATCH', path, body, options),
    delete: (path, options) => performRequest('DELETE', path, undefined, options),
    useRequestInterceptor: (interceptor) => {
      state.requestInterceptors.push(interceptor);
    },
    useResponseInterceptor: (interceptor) => {
      state.responseInterceptors.push(interceptor);
    },
  };
}
