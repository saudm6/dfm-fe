import { expect, test, type Page, type Route } from '@playwright/test';

// CI runs no backend, so these tests answer /api at the network layer with the shapes of
// dfm-be api/openapi.yaml: Me for POST /auth/login and GET /me, 204 for POST /auth/logout,
// and the Error body ({code, message}) otherwise.

interface Me {
  id: number;
  username: string;
  role: 'owner' | 'member';
  csrfToken: string;
}

const PASSWORD = 'correct-horse';
const ACCOUNTS: Me[] = [
  { id: 1, username: 'saud', role: 'owner', csrfToken: 'csrf-owner' },
  { id: 2, username: 'aisha', role: 'member', csrfToken: 'csrf-member' },
];

class FakeBackend {
  session: Me | null = null;
  /** The X-CSRF-Token header of every POST /auth/logout. */
  readonly logoutTokens: (string | undefined)[] = [];

  async install(page: Page): Promise<void> {
    await page.route(
      (url) => url.pathname === '/api' || url.pathname.startsWith('/api/'),
      (route) => this.handle(route),
    );
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const path = new URL(request.url()).pathname.slice('/api'.length);
    const call = `${request.method()} ${path}`;
    if (call === 'GET /me') {
      return this.session ? json(route, 200, this.session) : unauthorized(route);
    }
    if (call === 'POST /auth/login') {
      if (!request.headers()['content-type']?.startsWith('application/json')) {
        return error(
          route,
          415,
          'unsupported_media_type',
          'send the login request as application/json',
        );
      }
      const { username, password } = request.postDataJSON() as {
        username: string;
        password: string;
      };
      const account = ACCOUNTS.find((candidate) => candidate.username === username);
      if (!account || password !== PASSWORD) {
        return error(route, 401, 'unauthorized', 'invalid username or password');
      }
      this.session = account;
      return json(route, 200, account);
    }
    if (call === 'POST /auth/logout') {
      const token = request.headers()['x-csrf-token'];
      this.logoutTokens.push(token);
      if (!this.session) {
        return unauthorized(route);
      }
      if (token !== this.session.csrfToken) {
        return error(route, 403, 'forbidden', 'missing or wrong CSRF token');
      }
      this.session = null;
      return route.fulfill({ status: 204 });
    }
    return error(route, 404, 'not_found', `no route for ${path}`);
  }
}

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function error(route: Route, status: number, code: string, message: string): Promise<void> {
  return json(route, status, { code, message });
}

function unauthorized(route: Route): Promise<void> {
  return error(route, 401, 'unauthorized', 'sign in first');
}

async function signIn(page: Page, username: string, password = PASSWORD): Promise<void> {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

let backend: FakeBackend;

test.beforeEach(async ({ page }) => {
  backend = new FakeBackend();
  await backend.install(page);
});

test('logs in, sees the shell, logs out, and lands on the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login?returnUrl=%2F');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await signIn(page, 'saud');
  await expect(page).toHaveURL('/');
  await expect(page.getByText('saud', { exact: true })).toBeVisible();
  await expect(page.getByText('owner', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Market data' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(backend.logoutTokens).toEqual(['csrf-owner']);
  expect(backend.session).toBeNull();

  await page.goto('/');
  await expect(page).toHaveURL('/login?returnUrl=%2F');
});

test('hides market data from a member', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, 'aisha');
  await expect(page.getByText('member', { exact: true })).toBeVisible();
  await expect(page.getByText('Market data is available to owner accounts only.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Market data' })).toHaveCount(0);
});

test('keeps an existing session on reload', async ({ page }) => {
  backend.session = ACCOUNTS[0];
  await page.goto('/');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});

test('says so when the password is wrong', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, 'saud', 'not-the-password');
  await expect(page.getByRole('alert')).toHaveText('Wrong username or password.');
  await expect(page).toHaveURL('/login');
  await expect(page.getByLabel('Password')).toHaveValue('');
});
