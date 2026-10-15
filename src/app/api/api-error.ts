import { HttpErrorResponse } from '@angular/common/http';
import type { ErrorBody } from './api-types';

/** Codes the client sets itself when the response carries no Error body. */
export const NETWORK_ERROR = 'network_error';
export const UNEXPECTED_RESPONSE = 'unexpected_response';

/**
 * A failed API request. code is the backend's snake_case reason (bad_request,
 * unauthorized, not_found, ...), or one the client sets itself:
 * - NETWORK_ERROR: the backend could not be reached. Either no response at all
 *   (status 0), or a 502/503/504 whose body is not JSON, which is what a proxy
 *   in front of the backend (the dev server's included) sends when the backend
 *   is down. status keeps the proxy's status.
 * - UNEXPECTED_RESPONSE: any other response without an Error body.
 * Branch on code, never on message.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly status: number,
    readonly code: ErrorBody['code'],
    message: ErrorBody['message'],
    /** The raw response body, for operations that declare their own error bodies. */
    readonly body: unknown = null,
  ) {
    super(message);
  }
}

const GATEWAY_FAILURES = new Set([502, 503, 504]);

export function toApiError(response: HttpErrorResponse): ApiError {
  const body: unknown = response.error;
  if (isErrorBody(body)) {
    return new ApiError(response.status, body.code, body.message, body);
  }
  if (response.status === 0 || (GATEWAY_FAILURES.has(response.status) && !isJson(body))) {
    return new ApiError(response.status, NETWORK_ERROR, 'The server could not be reached.', body);
  }
  return new ApiError(response.status, UNEXPECTED_RESPONSE, response.message, body);
}

function isErrorBody(body: unknown): body is ErrorBody {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const candidate = body as Partial<Record<keyof ErrorBody, unknown>>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

/** HttpClient leaves an error body that does not parse as JSON as a string (or null when empty). */
function isJson(body: unknown): boolean {
  return typeof body === 'object' && body !== null;
}
