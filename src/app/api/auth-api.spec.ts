import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiError } from './api-error';
import { apiInterceptor } from './api-interceptor';
import { AuthApi, Me } from './auth-api';

const SAUD: Me = { id: 1, username: 'saud', role: 'owner', csrfToken: 'tok-1' };

describe('AuthApi', () => {
  let api: AuthApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(AuthApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts the credentials to /api/auth/login as JSON', async () => {
    const result = firstValueFrom(api.login({ username: 'saud', password: 'hunter22' }));
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.body).toEqual({ username: 'saud', password: 'hunter22' });
    req.flush(SAUD);
    expect(await result).toEqual(SAUD);
  });

  it('fails a wrong password with the unauthorized ApiError', async () => {
    const result = firstValueFrom(api.login({ username: 'saud', password: 'nope-nope' }));
    httpMock
      .expectOne('/api/auth/login')
      .flush(
        { code: 'unauthorized', message: 'invalid username or password' },
        { status: 401, statusText: 'Unauthorized' },
      );
    const error: unknown = await result.then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: 'unauthorized' });
  });

  it('posts to /api/auth/logout with no body', async () => {
    const result = firstValueFrom(api.logout());
    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(await result).toBeNull();
  });

  it('reads GET /api/me', async () => {
    const result = firstValueFrom(api.me());
    const req = httpMock.expectOne('/api/me');
    expect(req.request.method).toBe('GET');
    req.flush(SAUD);
    expect(await result).toEqual(SAUD);
  });
});
