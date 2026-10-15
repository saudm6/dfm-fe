import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { API_CSRF } from '../../api/api-config';
import { apiInterceptor } from '../../api/api-interceptor';
import type { Me } from '../../api/auth-api';
import { Session, sessionCsrf, sessionInterceptor } from '../../core/auth/session';
import { Shell } from './shell';

@Component({ template: '' })
class Blank {}

const OWNER: Me = { id: 1, username: 'saud', role: 'owner', csrfToken: 'owner-token' };
const MEMBER: Me = { id: 2, username: 'aisha', role: 'member', csrfToken: 'member-token' };

async function setup(me: Me) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'login', component: Blank },
        { path: '', pathMatch: 'full', component: Shell },
      ]),
      provideHttpClient(withInterceptors([sessionInterceptor, apiInterceptor])),
      provideHttpClientTesting(),
      { provide: API_CSRF, useFactory: sessionCsrf },
    ],
  });
  const httpMock = TestBed.inject(HttpTestingController);
  const login = firstValueFrom(TestBed.inject(Session).login(me.username, 'password1'));
  httpMock.expectOne('/api/auth/login').flush(me);
  await login;
  const harness = await RouterTestingHarness.create('/');
  return {
    harness,
    page: harness.routeNativeElement as HTMLElement,
    httpMock,
    router: TestBed.inject(Router),
  };
}

describe('Shell', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows who is signed in and their role', async () => {
    const { page } = await setup(OWNER);
    expect(page.querySelector('.user')?.textContent).toBe('saud');
    expect(page.querySelector('.role')?.textContent).toBe('owner');
  });

  it('shows market data to an owner', async () => {
    const { page } = await setup(OWNER);
    expect(page.querySelector('section[aria-label="Market data"]')).not.toBeNull();
    expect(page.querySelector('.notice')).toBeNull();
  });

  it('hides market data from a member', async () => {
    const { page } = await setup(MEMBER);
    expect(page.querySelector('section[aria-label="Market data"]')).toBeNull();
    expect(page.querySelector('.notice')?.textContent).toBe(
      'Market data is available to owner accounts only.',
    );
  });

  it('signs out and lands on the login page', async () => {
    const { harness, page, httpMock, router } = await setup(MEMBER);
    const button = [...page.querySelectorAll('button')].find(
      (element) => element.textContent?.trim() === 'Sign out',
    );
    button!.click();
    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('member-token');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();
    while (router.currentNavigation() || router.url !== '/login') {
      await new Promise((resolve) => setTimeout(resolve));
    }
    expect(router.url).toBe('/login');
    expect(TestBed.inject(Session).user()).toBeNull();
  });
});
