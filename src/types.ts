export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RetryPolicy {
  /** Total attempts = maxRetries + 1. */
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Status codes considered retryable in addition to network/timeout failures. */
  retryableStatusCodes: number[];
  /** Overrides the default retryable classification when supplied. */
  isRetryable?: (error: import('./errors.js').ClientError, attempt: number) => boolean;
}

export interface ResolvedRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface RequestInterceptor {
  (req: ResolvedRequest): ResolvedRequest | Promise<ResolvedRequest>;
}

export interface ResponseInterceptor {
  (res: ClientResponse): ClientResponse | Promise<ClientResponse>;
}

export interface ClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
}

export interface RequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  timeoutMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
  signal?: AbortSignal;
}

export interface ClientResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
  request: { method: HttpMethod; url: string };
}

export interface Client {
  get<T = unknown>(path: string, options?: RequestOptions): Promise<ClientResponse<T>>;
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ClientResponse<T>>;
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ClientResponse<T>>;
  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ClientResponse<T>>;
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<ClientResponse<T>>;
  useRequestInterceptor(interceptor: RequestInterceptor): void;
  useResponseInterceptor(interceptor: ResponseInterceptor): void;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  retryableStatusCodes: [500, 502, 503, 504],
};

export const DEFAULT_TIMEOUT_MS = 10_000;
