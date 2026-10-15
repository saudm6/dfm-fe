import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_CSRF } from '../../api/api-config';
import { apiInterceptor } from '../../api/api-interceptor';
import type { Me } from '../../api/auth-api';
import { Session, sessionCsrf, sessionInterceptor } from './session';

const OWNER: Me = { id: 1, username: 'saud', role: 'owner', csrfToken: 'owner-token' };
const MEMBER: Me = { id: 2, username: 'aisha', role: 'member', csrfToken: 'member-token' };
const UNAUTHORIZED = { code: 'unauthorized', message: 'sign in first' };
const UNAUTHORIZED_STATUS = { status: 401, statusText: 'Unauthorized' };

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', children: [] }]),
      provideHttpClient(withInterceptors([sessionInterceptor, apiInterceptor])),
      provideHttpClientTesting(),
      { provide: API_CSRF, useFactory: sessionCsrf },
    ],
  });
  return {
    session: TestBed.inject(Session),
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

async function signIn(session: Session, httpMock: HttpTestingController, me: Me): Promise<void> {
  const login = firstValueFrom(session.login(me.username, 'password1'));
  httpMock.expectOne('/api/auth/login').flush(me);
  await login;
}

describe('Session', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('starts signed out', () => {
    const { session } = setup();
    expect(session.user()).toBeNull();
    expect(session.role()).toBeNull();
    expect(session.canSeeMarketData()).toBe(false);
    expect(session.csrfToken()).toBeNull();
  });

  it('restores the session from GET /api/me', async () => {
    const { session, httpMock } = setup();
    const restored = session.restore();
    httpMock.expectOne('/api/me').flush(OWNER);
    expect(await restored).toBe(true);
    expect(session.user()).toEqual(OWNER);
    expect(session.role()).toBe('owner');
    expect(session.csrfToken()).toBe('owner-token');
  });

  it('asks GET /api/me only once, however often it is checked', async () => {
    const { session, httpMock } = setup();
    const checks = [session.restore(), session.restore()];
    httpMock.expectOne('/api/me').flush(UNAUTHORIZED, UNAUTHORIZED_STATUS);
    expect(await Promise.all(checks)).toEqual([false, false]);
    expect(await session.restore()).toBe(false);
    httpMock.expectNone('/api/me');
  });

  it('reports signed out when the server cannot be reached', async () => {
    const { session, httpMock } = setup();
    const restored = session.restore();
    httpMock.expectOne('/api/me').error(new ProgressEvent('error'));
    expect(await restored).toBe(false);
    expect(session.user()).toBeNull();
  });

  it('signs in with the login response, without asking GET /api/me', async () => {
    const { session, httpMock } = setup();
    await signIn(session, httpMock, MEMBER);
    expect(session.user()).toEqual(MEMBER);
    expect(await session.restore()).toBe(true);
    httpMock.expectNone('/api/me');
  });

  it.each([
    ['owner', OWNER, true],
    ['member', MEMBER, false],
  ])('lets an %s see market data: %s', async (_role, me, allowed) => {
    const { session, httpMock } = setup();
    await signIn(session, httpMock, me);
    expect(session.canSeeMarketData()).toBe(allowed);
  });

  it('sends the session CSRF token on state-changing requests only', async () => {
    const { session, http, httpMock } = setup();
    await signIn(session, httpMock, OWNER);
    http.post('/api/orders', {}).subscribe();
    http.get('/api/me').subscribe();
    expect(httpMock.expectOne('/api/orders').request.headers.get('X-CSRF-Token')).toBe(
      'owner-token',
    );
    expect(httpMock.expectOne('/api/me').request.headers.has('X-CSRF-Token')).toBe(false);
  });

  it('logs out with the CSRF token and forgets the account', async () => {
    const { session, httpMock } = setup();
    await signIn(session, httpMock, OWNER);
    const logout = session.logout();
    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('owner-token');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await logout;
    expect(session.user()).toBeNull();
    expect(session.csrfToken()).toBeNull();
    expect(await session.restore()).toBe(false);
  });

  it('forgets the account even when the logout request fails', async () => {
    const { session, httpMock } = setup();
    await signIn(session, httpMock, OWNER);
    const logout = session.logout();
    httpMock.expectOne('/api/auth/logout').error(new ProgressEvent('error'));
    await logout;
    expect(session.user()).toBeNull();
  });

  it('forgets the account and its CSRF token when any API request gets 401', async () => {
    const { session, http, httpMock } = setup();
    await signIn(session, httpMock, OWNER);
    const result = firstValueFrom(http.get('/api/orders'));
    httpMock.expectOne('/api/orders').flush(UNAUTHORIZED, UNAUTHORIZED_STATUS);
    await result.catch(() => undefined);
    expect(session.user()).toBeNull();
    expect(session.csrfToken()).toBeNull();
  });

  it('keeps the account on other failures', async () => {
    const { session, http, httpMock } = setup();
    await signIn(session, httpMock, MEMBER);
    const result = firstValueFrom(http.get('/api/orders'));
    httpMock
      .expectOne('/api/orders')
      .flush(
        { code: 'forbidden', message: 'owner only' },
        { status: 403, statusText: 'Forbidden' },
      );
    await result.catch(() => undefined);
    expect(session.user()).toEqual(MEMBER);
  });
});
