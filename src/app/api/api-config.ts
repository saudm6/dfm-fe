import { inject, InjectionToken } from '@angular/core';
import type { ApiPath } from './api-types';

/**
 * Prefix of every backend request. The dev server proxy strips it before
 * forwarding to the Go service, whose routes sit at the root.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});

/** Supplies the CSRF header the interceptor adds to state-changing API requests. */
export interface CsrfSource {
  readonly header: string;
  /** The current token, or null when there is none yet. */
  token(): string | null;
}

/**
 * CSRF source for the API interceptor. app.config.ts provides the session's
 * token (sessionCsrf in core/auth/session.ts).
 */
export const API_CSRF = new InjectionToken<CsrfSource>('API_CSRF');

/** The URL of a contract path. Call it in an injection context. */
export function apiUrl(path: ApiPath): string {
  return inject(API_BASE_URL) + path;
}
