import type { ClientResponse, RequestInterceptor, ResolvedRequest, ResponseInterceptor } from './types.js';

/** Runs request interceptors sequentially, in registration order. Throws propagate as-is. */
export async function runRequestInterceptors(
  interceptors: RequestInterceptor[],
  request: ResolvedRequest,
): Promise<ResolvedRequest> {
  let current = request;
  for (const interceptor of interceptors) {
    current = await interceptor(current);
  }
  return current;
}

/** Runs response interceptors sequentially, in registration order. Throws propagate as-is. */
export async function runResponseInterceptors(
  interceptors: ResponseInterceptor[],
  response: ClientResponse,
): Promise<ClientResponse> {
  let current = response;
  for (const interceptor of interceptors) {
    current = await interceptor(current);
  }
  return current;
}
