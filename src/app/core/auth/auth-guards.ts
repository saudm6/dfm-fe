import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { LOGIN_URL, RETURN_URL_PARAM } from '../../api/api-interceptor';
import { Session } from './session';

/** Lets signed-in accounts through and sends everyone else to the login page. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(Session);
  const router = inject(Router);
  return (await session.restore()) ? true : loginPage(router, state.url);
};

/**
 * For routes that need market data: a member goes to the shell root instead. Works on its own
 * or under authGuard.
 */
export const marketDataGuard: CanActivateFn = async (_route, state) => {
  const session = inject(Session);
  const router = inject(Router);
  if (!(await session.restore())) {
    return loginPage(router, state.url);
  }
  return session.canSeeMarketData() ? true : router.parseUrl('/');
};

function loginPage(router: Router, returnUrl: string): UrlTree {
  return router.createUrlTree([LOGIN_URL], { queryParams: { [RETURN_URL_PARAM]: returnUrl } });
}
