import { describe, expect, it } from 'vitest';
import { isAbsoluteUrl, mergeHeaders, resolveUrl } from '../../src/client.js';
import { ConfigError } from '../../src/errors.js';
import type { HttpMethod } from '../../src/types.js';

const ctx: { method: HttpMethod } = { method: 'GET' };

describe('isAbsoluteUrl', () => {
  it('returns true for absolute URLs', () => {
    expect(isAbsoluteUrl('https://api.example.com/users')).toBe(true);
  });

  it('returns false for relative paths', () => {
    expect(isAbsoluteUrl('/users/42')).toBe(false);
    expect(isAbsoluteUrl('users/42')).toBe(false);
  });
});

describe('resolveUrl', () => {
  it('joins a relative path onto the base URL', () => {
    expect(resolveUrl('https://api.example.com', '/users/42', undefined, ctx)).toBe(
      'https://api.example.com/users/42',
    );
  });

  it('uses an absolute path as-is, ignoring the base URL', () => {
    expect(resolveUrl('https://api.example.com', 'https://other.example.com/x', undefined, ctx)).toBe(
      'https://other.example.com/x',
    );
  });

  it('appends query parameters', () => {
    const url = resolveUrl('https://api.example.com', '/search', { q: 'cats', page: 2, active: true }, ctx);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('q')).toBe('cats');
    expect(parsed.searchParams.get('page')).toBe('2');
    expect(parsed.searchParams.get('active')).toBe('true');
  });

  it('raises a ConfigError when a relative path is used with no baseUrl configured', () => {
    expect(() => resolveUrl(undefined, '/users/42', undefined, ctx)).toThrow(ConfigError);
  });
});

describe('mergeHeaders', () => {
  it('includes default headers when no override is given', () => {
    expect(mergeHeaders({ Authorization: 'Bearer token' }, {})).toEqual({ Authorization: 'Bearer token' });
  });

  it('lets a per-request header override a default header of the same name', () => {
    expect(mergeHeaders({ Authorization: 'Bearer default' }, { Authorization: 'Bearer override' })).toEqual({
      Authorization: 'Bearer override',
    });
  });

  it('overrides case-insensitively without duplicating the key', () => {
    const merged = mergeHeaders({ 'Content-Type': 'text/plain' }, { 'content-type': 'application/json' });
    expect(merged).toEqual({ 'content-type': 'application/json' });
  });

  it('keeps unrelated default headers alongside an override', () => {
    const merged = mergeHeaders(
      { Authorization: 'Bearer token', Accept: 'application/json' },
      { Accept: 'text/plain' },
    );
    expect(merged).toEqual({ Authorization: 'Bearer token', Accept: 'text/plain' });
  });
});
