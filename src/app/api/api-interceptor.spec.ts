import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_CSRF } from './api-config';
import { ApiError } from './api-error';
import { apiInterceptor } from './api-interceptor';

@Component({ template: '' })
class Blank {}

function setup(extraProviders: Provider[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'login', component: Blank },
        { path: 'watch', component: Blank },
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

  it('reports a response without the Error body as unexpected_response', async () => {
    const { http, httpMock } = setup();
    const result = firstValueFrom(http.get('/api/healthz'));
    httpMock
      .expectOne('/api/healthz')
      .flush('upstream down', { status: 502, statusText: 'Bad Gateway' });
    const error = await failure(result);
    expect(error.status).toBe(502);
    expect(error.code).toBe('unexpected_response');
    expect(error.body).toBe('upstream down');
  });

  it('sends the user to the login page on 401', async () => {
    const { http, httpMock, router } = setup();
    await router.navigateByUrl('/watch');
    const navigate = vi.spyOn(router, 'navigateByUrl');
    const result = firstValueFrom(http.get('/api/me'));
    httpMock
      .expectOne('/api/me')
      .flush(
        { code: 'unauthorized', message: 'sign in first' },
        { status: 401, statusText: 'Unauthorized' },
      );
    const error = await failure(result);
    expect(error.code).toBe('unauthorized');
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/login');
    await navigate.mock.results[0].value;
    expect(router.url).toBe('/login');
  });

  it('stays on the login page when a request from it gets 401', async () => {
    const { http, httpMock, router } = setup();
    await router.navigateByUrl('/login');
    const navigate = vi.spyOn(router, 'navigateByUrl');
    const result = firstValueFrom(http.post('/api/auth/login', {}));
    httpMock
      .expectOne('/api/auth/login')
      .flush(
        { code: 'unauthorized', message: 'wrong password' },
        { status: 401, statusText: 'Unauthorized' },
      );
    const error = await failure(result);
    expect(error.message).toBe('wrong password');
    expect(navigate).not.toHaveBeenCalled();
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
