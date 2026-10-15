import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { apiInterceptor } from '../../api/api-interceptor';
import type { Me } from '../../api/auth-api';
import { authGuard, marketDataGuard } from './auth-guards';
import { sessionInterceptor } from './session';

@Component({ template: '' })
class Blank {}

const OWNER: Me = { id: 1, username: 'saud', role: 'owner', csrfToken: 'owner-token' };
const MEMBER: Me = { id: 2, username: 'aisha', role: 'member', csrfToken: 'member-token' };

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'login', component: Blank },
        { path: '', pathMatch: 'full', component: Blank, canActivate: [authGuard] },
        { path: 'chat', component: Blank, canActivate: [authGuard] },
        { path: 'quotes', component: Blank, canActivate: [marketDataGuard] },
      ]),
      provideHttpClient(withInterceptors([sessionInterceptor, apiInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return { httpMock: TestBed.inject(HttpTestingController), router: TestBed.inject(Router) };
}

/** Answers the GET /api/me the navigation's guard makes, once the router has got that far. */
async function answerMe(
  httpMock: HttpTestingController,
  answer: (request: TestRequest) => void,
): Promise<void> {
  let requests = httpMock.match('/api/me');
  while (requests.length === 0) {
    await new Promise((resolve) => setTimeout(resolve));
    requests = httpMock.match('/api/me');
  }
  expect(requests).toHaveLength(1);
  answer(requests[0]);
}

const signedInAs = (me: Me) => (request: TestRequest) => request.flush(me);
const noSession = (request: TestRequest) =>
  request.flush(
    { code: 'unauthorized', message: 'sign in first' },
    { status: 401, statusText: 'Unauthorized' },
  );

async function settled(router: Router): Promise<void> {
  while (router.currentNavigation()) {
    await new Promise((resolve) => setTimeout(resolve));
  }
}

describe('authGuard', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lets a signed-in account through', async () => {
    const { httpMock, router } = setup();
    const navigation = router.navigateByUrl('/chat');
    await answerMe(httpMock, signedInAs(OWNER));
    expect(await navigation).toBe(true);
    expect(router.url).toBe('/chat');
  });

  it('sends a visitor without a session to the login page with the URL asked for', async () => {
    const { httpMock, router } = setup();
    const navigation = router.navigateByUrl('/chat?room=general');
    await answerMe(httpMock, noSession);
    await navigation;
    await settled(router);
    expect(router.url).toBe('/login?returnUrl=%2Fchat%3Froom%3Dgeneral');
  });

  it('sends a visitor to the login page when the server cannot be reached', async () => {
    const { httpMock, router } = setup();
    const navigation = router.navigateByUrl('/chat');
    await answerMe(httpMock, (request) => request.error(new ProgressEvent('error')));
    await navigation;
    await settled(router);
    expect(router.url).toBe('/login?returnUrl=%2Fchat');
  });

  it('checks the session once, not on every navigation', async () => {
    const { httpMock, router } = setup();
    const first = router.navigateByUrl('/chat');
    await answerMe(httpMock, signedInAs(MEMBER));
    await first;
    expect(await router.navigateByUrl('/')).toBe(true);
    expect(await router.navigateByUrl('/chat')).toBe(true);
    httpMock.expectNone('/api/me');
  });
});

describe('marketDataGuard', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lets an owner through', async () => {
    const { httpMock, router } = setup();
    const navigation = router.navigateByUrl('/quotes');
    await answerMe(httpMock, signedInAs(OWNER));
    expect(await navigation).toBe(true);
    expect(router.url).toBe('/quotes');
  });

  it('sends a member to the shell root', async () => {
    const { httpMock, router } = setup();
    const navigation = router.navigateByUrl('/quotes');
    await answerMe(httpMock, signedInAs(MEMBER));
    await navigation;
    await settled(router);
    expect(router.url).toBe('/');
  });

  it('sends a visitor without a session to the login page', async () => {
    const { httpMock, router } = setup();
    const navigation = router.navigateByUrl('/quotes');
    await answerMe(httpMock, noSession);
    await navigation;
    await settled(router);
    expect(router.url).toBe('/login?returnUrl=%2Fquotes');
  });
});
