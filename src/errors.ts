import type { HttpMethod } from './types.js';

export type ClientErrorKind = 'http' | 'timeout' | 'network' | 'parse' | 'config';

export interface ClientErrorOptions {
  message: string;
  request: { method: HttpMethod; url: string };
  attempt?: number;
  cause?: unknown;
}

export class ClientError extends Error {
  readonly kind: ClientErrorKind;
  readonly request: { method: HttpMethod; url: string };
  readonly attempt: number;
  override readonly cause?: unknown;

  constructor(kind: ClientErrorKind, options: ClientErrorOptions) {
    super(options.message);
    this.name = new.target.name;
    this.kind = kind;
    this.request = options.request;
    this.attempt = options.attempt ?? 1;
    this.cause = options.cause;
  }
}

export interface HttpErrorOptions extends ClientErrorOptions {
  status: number;
  body: unknown;
}

export class HttpError extends ClientError {
  readonly status: number;
  readonly body: unknown;

  constructor(options: HttpErrorOptions) {
    super('http', options);
    this.status = options.status;
    this.body = options.body;
  }
}

export class TimeoutError extends ClientError {
  constructor(options: ClientErrorOptions) {
    super('timeout', options);
  }
}

export class NetworkError extends ClientError {
  constructor(options: ClientErrorOptions) {
    super('network', options);
  }
}

export class ParseError extends ClientError {
  constructor(options: ClientErrorOptions) {
    super('parse', options);
  }
}

/** Raised for client-side misconfiguration (e.g. a relative path with no baseUrl). */
export class ConfigError extends ClientError {
  constructor(options: ClientErrorOptions) {
    super('config', options);
  }
}
