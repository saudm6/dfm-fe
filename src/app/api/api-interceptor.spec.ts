import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { Component, inject, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  CanActivateFn,
  provideRouter,
  Router,
  Routes,
  UrlSegment,
  UrlSegmentGroup,
  UrlTree,
} from '@angular/router';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { API_CSRF } from './api-config';
import { ApiError } from './api-error';
import { apiInterceptor } from './api-interceptor';

@Component({ template: '' })
class Blank {}

const UNAUTHORIZED = { code: 'unauthorized', message: 'sign in first' };
const UNAUTHORIZED_STATUS = { status: 401, statusText: 'Unauthorized' };

/** Checks the session the way a login or auth guard will: GET /api/me, opening the page either way. */
const sessionGuard: CanActivateFn = () =>
  inject(HttpClient)
    .get('/api/me')
    .pipe(
      map(() => true),
      catchError(() => of(true)),
    );

function setup(
  extraProviders: Provider[] = [],
  extraRoutes: Routes = [],
  loginGuards: CanActivateFn[] = [],
) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'login', component: Blank, canActivate: loginGuards },
        { path: 'login-help', component: Blank },
        { path: 'watch', component: Blank },
        ...extraRoutes,
        { path: '**', component: Blank },
      ]),
      provideHttpClient(withInterceptors([apiInterceptor])),
      provideHttpClientTesting(),
      ...extraProviders,
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
  };
}

/** Waits for the navigation the interceptor started, if any, to finish. */
async function settled(router: Router): Promise<void> {
  while (router.currentNavigation()) {
    await new Promise((resolve) => setTimeout(resolve));
  }
}

/** The request a navigation's guard makes, once the router has got that far. */
async function guardRequest(httpMock: HttpTestingController, url: string): Promise<TestRequest> {
  let requests = httpMock.match(url);
  while (requests.length === 0) {
    await new Promise((resolve) => setTimeout(resolve));
    requests = httpMock.match(url);
  }
  expect(requests).toHaveLength(1);
  return requests[0];
}

async function failure(request: Promise<unknown>): Promise<ApiError> {
  const error = await request.then(
    () => new Error('expected the request to fail'),
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe('apiInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('sends credentials with API requests', () => {
    const { http, httpMock } = setup();
    http.get('/api/healthz').subscribe();
    expect(httpMock.expectOne('/api/healthz').request.withCredentials).toBe(true);
  });

  it('leaves requests outside the API alone', () => {
    const { http, httpMock } = setup();
    http.get('/apis.json').subscribe();
    expect(httpMock.expectOne('/apis.json').request.withCredentials).toBe(false);
  });

  it('maps the Error body of a non-2xx response to an ApiError', async () => {
    const { http, httpMock } = setup();
    const result = firstValueFrom(http.get('/api/nope'));
    httpMock
      .expectOne('/api/nope')
      .flush(
        { code: 'not_found', message: 'no route for /nope' },
        { status: 404, statusText: 'Not Found' },
      );
    const error = await failure(result);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(404);
    expect(error.code).toBe('not_found');
    expect(error.message).toBe('no route for /nope');
    expect(error.body).toEqual({ code: 'not_found', message: 'no route for /nope' });
  });

  it('reports an unreachable server as network_error', async () => {
    const { http, httpMock } = setup();
    const result = firstValueFrom(http.get('/api/healthz'));
    httpMock.expectOne('/api/healthz').error(new ProgressEvent('error'));
    const error = await failure(result);
    expect(error.status).toBe(0);
    expect(error.code).toBe('network_error');
    expect(error.message).toBe('The server could not be reached.');
  });

  // The Angular dev server answers 502 text/plain with an empty body when the backend is down.
  it.each([
    [502, null],
    [502, 'Error occurred while trying to proxy: localhost:4321/healthz'],
    [503, 'Service Unavailable'],
    [504, 'Gateway Timeout'],
  ])(
    'reports a %i with a non-JSON body (%j) from a proxy as network_error',
    async (status, body) => {
      const { http, httpMock } = setup();
      const result = firstValueFrom(http.get('/api/healthz'));
      httpMock.expectOne('/api/healthz').flush(body, { status, statusText: 'Bad Gateway' });
      const error = await failure(result);
      expect(error.status).toBe(status);
      expect(error.code).toBe('network_error');
      expect(error.message).toBe('The server could not be reached.');
      expect(error.body).toBe(body);
    },
  );

  it('reports a gateway status with a JSON body that is not an Error body as unexpected_response', async () => {
    const { http, httpMock } = setup();
    const result = firstValueFrom(http.get('/api/healthz'));
    httpMock
      .expectOne('/api/healthz')
      .flush({ status: 'down' }, { status: 503, statusText: 'Service Unavailable' });
    const error = await failure(result);
    expect(error.status).toBe(503);
    expect(error.code).toBe('unexpected_response');
    expect(error.body).toEqual({ status: 'down' });
  });

  it('reports another response without the Error body as unexpected_response', async () => {
    const { http, httpMock } = setup();
    const result = firstValueFrom(http.get('/api/healthz'));
    httpMock
      .expectOne('/api/healthz')
      .flush('oops', { status: 500, statusText: 'Internal Server Error' });
    const error = await failure(result);
    expect(error.status).toBe(500);
    expect(error.code).toBe('unexpected_response');
    expect(error.body).toBe('oops');
  });

  it('sends the user to the login page on 401, keeping the URL being left', async () => {
    const { http, httpMock, router } = setup();
    await router.navigateByUrl('/watch?symbol=EMAAR');
    const result = firstValueFrom(http.get('/api/me'));
    httpMock.expectOne('/api/me').flush(UNAUTHORIZED, UNAUTHORIZED_STATUS);
    expect((await failure(result)).code).toBe('unauthorized');
    await settled(router);
    expect(router.url).toBe('/login?returnUrl=%2Fwatch%3Fsymbol%3DEMAAR');
  });

  it('keeps the URL being navigated to when a 401 interrupts a navigation', async () => {
    const { httpMock, router } = setup(
      [],
      [{ path: 'orders', component: Blank, canActivate: [sessionGuard] }],
    );
    await router.navigateByUrl('/watch');
    const navigation = router.navigateByUrl('/orders');
    (await guardRequest(httpMock, '/api/me')).flush(UNAUTHORIZED, UNAUTHORIZED_STATUS);
    expect(await navigation).toBe(false);
    await settled(router);
    expect(router.url).toBe('/login?returnUrl=%2Forders');
  });

  it('redirects from a page whose path only starts with login', async () => {
    const { http, httpMock, router } = setup();
    await router.navigateByUrl('/login-help');
    const result = firstValueFrom(http.get('/api/me'));
    httpMock.expectOne('/api/me').flush(UNAUTHORIZED, UNAUTHORIZED_STATUS);
    await failure(result);
    await settled(router);
    expect(router.url).toBe('/login?returnUrl=%2Flogin-help');
  });

  it('never carries a return URL that would leave the app', async () => {
    const { http, httpMock, router } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const offSite = new UrlTree(
      new UrlSegmentGroup([], {
        primary: new UrlSegmentGroup(
          [new UrlSegment('', {}), new UrlSegment('evil.example', {}), new UrlSegment('x', {})],
          {},
        ),
      }),
    );
    await router.navigateByUrl(offSite);
    expect(router.url).toBe('/');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('NG04019'));
    const result = firstValueFrom(http.get('/api/me'));
    httpMock.expectOne('/api/me').flush(UNAUTHORIZED, UNAUTHORIZED_STATUS);
    await failure(result);
    await settled(router);
    expect(router.url).toBe('/login?returnUrl=%2F');
  });

  it('stays on the login page when a request from it gets 401', async () => {
    const { http, httpMock, router } = setup();
    await router.navigateByUrl('/login?returnUrl=%2Fwatch');
    const navigate = vi.spyOn(router, 'navigateByUrl');
    const result = firstValueFrom(http.post('/api/auth/login', {}));
    httpMock
      .expectOne('/api/auth/login')
      .flush({ code: 'unauthorized', message: 'wrong password' }, UNAUTHORIZED_STATUS);
    expect((await failure(result)).message).toBe('wrong password');
    expect(navigate).not.toHaveBeenCalled();
    expect(router.url).toBe('/login?returnUrl=%2Fwatch');
  });

  it('does not loop when a guard on the login page gets 401', async () => {
    const { httpMock, router } = setup([], [], [sessionGuard]);
    await router.navigateByUrl('/watch');
    const navigation = router.navigateByUrl('/login');
    (await guardRequest(httpMock, '/api/me')).flush(UNAUTHORIZED, UNAUTHORIZED_STATUS);
    expect(await navigation).toBe(true);
    await settled(router);
    httpMock.expectNone('/api/me');
    expect(router.url).toBe('/login');
  });

  it('does not redirect on other error statuses', async () => {
    const { http, httpMock, router } = setup();
    await router.navigateByUrl('/watch');
    const result = firstValueFrom(http.get('/api/orders'));
    httpMock
      .expectOne('/api/orders')
      .flush(
        { code: 'forbidden', message: 'owner only' },
        { status: 403, statusText: 'Forbidden' },
      );
    expect((await failure(result)).code).toBe('forbidden');
    expect(router.url).toBe('/watch');
  });

  it('adds the CSRF header to state-changing API requests when a source is provided', () => {
    const { http, httpMock } = setup([
      { provide: API_CSRF, useValue: { header: 'X-CSRF-Token', token: () => 'abc123' } },
    ]);
    http.post('/api/orders', {}).subscribe();
    http.get('/api/healthz').subscribe();
    expect(httpMock.expectOne('/api/orders').request.headers.get('X-CSRF-Token')).toBe('abc123');
    expect(httpMock.expectOne('/api/healthz').request.headers.has('X-CSRF-Token')).toBe(false);
  });

  it('sends no CSRF header when no source is provided', () => {
    const { http, httpMock } = setup();
    http.delete('/api/orders/1').subscribe();
    expect(httpMock.expectOne('/api/orders/1').request.headers.keys()).toEqual([]);
  });
});
