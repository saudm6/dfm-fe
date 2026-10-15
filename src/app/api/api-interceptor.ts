import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PRIMARY_OUTLET, Router, UrlTree } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL, API_CSRF } from './api-config';
import { toApiError } from './api-error';

export const LOGIN_URL = '/login';

/** Query parameter on LOGIN_URL holding the in-app URL to return to after sign-in. */
export const RETURN_URL_PARAM = 'returnUrl';

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
      if (error.status === 401) {
        redirectToLogin(router);
      }
      return throwError(() => toApiError(error));
    }),
  );
};

function redirectToLogin(router: Router): void {
  const current = router.parseUrl(router.url);
  const navigation = router.currentNavigation();
  const pending = navigation ? (navigation.finalUrl ?? navigation.extractedUrl) : null;
  // A 401 from a request made on, or on the way to, the login page (its guard
  // checking the session, a failed sign-in) must not navigate there again: that
  // navigation would rerun the guard and loop.
  if (isLoginPage(router, current) || (pending && isLoginPage(router, pending))) {
    return;
  }
  // The router's serializer only produces paths on this app: it turns a tree
  // that would serialize to a protocol-relative URL (//evil.example) into '/'.
  const returnUrl = router.serializeUrl(pending ?? current);
  void router.navigateByUrl(
    router.createUrlTree([LOGIN_URL], { queryParams: { [RETURN_URL_PARAM]: returnUrl } }),
  );
}

function isLoginPage(router: Router, url: UrlTree): boolean {
  return primaryPath(url) === primaryPath(router.parseUrl(LOGIN_URL));
}

function primaryPath(url: UrlTree): string {
  const segments = url.root.children[PRIMARY_OUTLET]?.segments ?? [];
  return segments.map((segment) => segment.path).join('/');
}
