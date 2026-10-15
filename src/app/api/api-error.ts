import { HttpErrorResponse } from '@angular/common/http';
import type { ErrorBody } from './api-types';

/** Codes the client sets itself when the response carries no Error body. */
export const NETWORK_ERROR = 'network_error';
export const UNEXPECTED_RESPONSE = 'unexpected_response';

/**
 * A failed API request. code is the backend's snake_case reason (bad_request,
 * unauthorized, not_found, ...), or NETWORK_ERROR / UNEXPECTED_RESPONSE.
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

export function toApiError(response: HttpErrorResponse): ApiError {
  const body: unknown = response.error;
  if (isErrorBody(body)) {
    return new ApiError(response.status, body.code, body.message, body);
  }
  if (response.status === 0) {
    return new ApiError(0, NETWORK_ERROR, 'The server could not be reached.', body);
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
