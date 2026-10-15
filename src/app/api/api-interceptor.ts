import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL, API_CSRF } from './api-config';
import { toApiError } from './api-error';

export const LOGIN_URL = '/login';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * For requests to the backend: sends the session cookie, adds the CSRF header
 * to state-changing requests when an API_CSRF source is provided, sends the
 * user to the login page on 401, and rethrows every HTTP failure as ApiError.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  if (req.url !== base && !req.url.startsWith(base + '/')) {
    return next(req);
  }
  const router = inject(Router);
  const csrf = inject(API_CSRF, { optional: true });

  let request = req.clone({ withCredentials: true });
  const token = csrf && !SAFE_METHODS.has(req.method) ? csrf.token() : null;
  if (csrf && token !== null) {
    request = request.clone({ setHeaders: { [csrf.header]: token } });
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      if (error.status === 401 && !router.url.startsWith(LOGIN_URL)) {
        void router.navigateByUrl(LOGIN_URL);
      }
      return throwError(() => toApiError(error));
    }),
  );
};
