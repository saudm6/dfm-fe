import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiInterceptor } from '../../api/api-interceptor';
import type { Me } from '../../api/auth-api';
import { Session, sessionInterceptor } from '../../core/auth/session';
import { Login } from './login';

@Component({ template: '' })
class Blank {}

const OWNER: Me = { id: 1, username: 'saud', role: 'owner', csrfToken: 'owner-token' };

async function setup(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'login', component: Login },
        { path: '', pathMatch: 'full', component: Blank },
        { path: '**', component: Blank },
      ]),
      provideHttpClient(withInterceptors([sessionInterceptor, apiInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  return {
    harness,
    page: harness.routeNativeElement as HTMLElement,
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
  };
}

function fillIn(page: HTMLElement, label: string, value: string): void {
  const id = [...page.querySelectorAll('label')]
    .find((element) => element.textContent?.trim() === label)
    ?.getAttribute('for');
  const input = page.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) {
    throw new Error(`no input labelled ${label}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submit(page: HTMLElement): void {
  page.querySelector('form')!.dispatchEvent(new Event('submit'));
}

async function settled(router: Router): Promise<void> {
  while (router.currentNavigation()) {
    await new Promise((resolve) => setTimeout(resolve));
  }
}

async function signIn(url: string): Promise<string> {
  const { harness, page, httpMock, router } = await setup(url);
  fillIn(page, 'Username', 'saud');
  fillIn(page, 'Password', 'hunter22');
  submit(page);
  httpMock.expectOne('/api/auth/login').flush(OWNER);
  await harness.fixture.whenStable();
  await settled(router);
  return router.url;
}

describe('Login', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('labels both fields and the sign-in button', async () => {
    const { page } = await setup('/login');
    expect(page.querySelector('h2')?.textContent).toBe('Sign in');
    expect(page.querySelector('#login-username')?.getAttribute('autocomplete')).toBe('username');
    expect(page.querySelector('#login-password')?.getAttribute('type')).toBe('password');
    expect(page.querySelector('button[type=submit]')?.textContent?.trim()).toBe('Sign in');
  });

  it('signs in with the typed credentials and records the account', async () => {
    const { harness, page, httpMock } = await setup('/login');
    fillIn(page, 'Username', 'saud');
    fillIn(page, 'Password', 'hunter22');
    submit(page);
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ username: 'saud', password: 'hunter22' });
    req.flush(OWNER);
    await harness.fixture.whenStable();
    expect(TestBed.inject(Session).user()).toEqual(OWNER);
  });

  it('goes to the shell root without a return URL', async () => {
    expect(await signIn('/login')).toBe('/');
  });

  it('returns to the in-app URL it was sent from', async () => {
    expect(await signIn('/login?returnUrl=%2Fwatch%3Fsymbol%3DEMAAR')).toBe('/watch?symbol=EMAAR');
  });

  it.each([
    ['a protocol-relative URL', '//evil.example/x'],
    ['a backslash URL', '/\\evil.example'],
    ['an absolute URL', 'https://evil.example/'],
    ['a relative path', 'watch'],
    ['an empty value', ''],
  ])('goes to the shell root instead of %s', async (_name, returnUrl) => {
    expect(await signIn(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)).toBe('/');
  });

  it('says so when the username or password is wrong, and clears the password', async () => {
    const { harness, page, httpMock, router } = await setup('/login?returnUrl=%2Fwatch');
    fillIn(page, 'Username', 'saud');
    fillIn(page, 'Password', 'wrong-one');
    submit(page);
    httpMock
      .expectOne('/api/auth/login')
      .flush(
        { code: 'unauthorized', message: 'invalid username or password' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await harness.fixture.whenStable();
    expect(page.querySelector('[role=alert]')?.textContent).toBe('Wrong username or password.');
    expect(page.querySelector<HTMLInputElement>('#login-password')?.value).toBe('');
    expect(page.querySelector<HTMLInputElement>('#login-username')?.value).toBe('saud');
    expect(router.url).toBe('/login?returnUrl=%2Fwatch');
  });

  it('says so when the server cannot be reached', async () => {
    const { harness, page, httpMock } = await setup('/login');
    fillIn(page, 'Username', 'saud');
    fillIn(page, 'Password', 'hunter22');
    submit(page);
    httpMock.expectOne('/api/auth/login').error(new ProgressEvent('error'));
    await harness.fixture.whenStable();
    expect(page.querySelector('[role=alert]')?.textContent).toBe(
      'The server could not be reached. Try again.',
    );
  });

  it('asks for both fields before sending anything', async () => {
    const { harness, page, httpMock } = await setup('/login');
    fillIn(page, 'Username', 'saud');
    submit(page);
    await harness.fixture.whenStable();
    httpMock.expectNone('/api/auth/login');
    expect(page.querySelector('[role=alert]')?.textContent).toBe(
      'Enter your username and password.',
    );
  });

  it('sends one request while a sign-in is in flight', async () => {
    const { harness, page, httpMock } = await setup('/login');
    fillIn(page, 'Username', 'saud');
    fillIn(page, 'Password', 'hunter22');
    submit(page);
    submit(page);
    await harness.fixture.whenStable();
    expect(page.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(true);
    httpMock.expectOne('/api/auth/login').flush(OWNER);
  });
});
