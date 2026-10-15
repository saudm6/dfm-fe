# dfm-fe

Angular frontend for the DFM trader terminal. The backend lives in [dfm-be](https://github.com/saudm6/dfm-be). The build order for both repos is in [ROADMAP.md](ROADMAP.md).

## Requirements

- Node.js `^22.22.3` (Angular CLI 22 refuses older Node 22 releases). CI reads the major version from `.nvmrc`.
- npm (lockfile is `package-lock.json`; install with `npm ci`).

## Scripts

| Command                | What it does                                                                |
| ---------------------- | --------------------------------------------------------------------------- |
| `npm start`            | Dev server with the `/api` and `/ws` proxy. Add `-- --port <n>` to move it. |
| `npm run build`        | Production build into `dist/dfm-fe`.                                        |
| `npm test`             | Unit tests, single run, Vitest on jsdom (headless).                         |
| `npm run lint`         | `angular-eslint` over `src/`, `e2e/`, and `playwright.config.ts`.           |
| `npm run format`       | Prettier, write mode.                                                       |
| `npm run format:check` | Prettier, check mode (what CI runs).                                        |
| `npm run e2e`          | Playwright end-to-end tests in Chromium.                                    |
| `npm run api:gen`      | Regenerate the typed API schema from a running backend (see below).         |
| `npm run api:gen:main` | Regenerate the typed API schema from `api/openapi.yaml` on dfm-be `main`.   |

Run one spec file, or only tests whose name matches a pattern:

```bash
npm test -- --include src/app/app.spec.ts
npm test -- --filter "page heading"
```

Unit tests watch for changes when run with `npx ng test`.

## Dev proxy

`proxy.conf.mjs` forwards `/api` (REST) and `/ws` (WebSocket) to the Go service at `http://localhost:8080`. It strips the `/api` prefix, because the Go service serves the contract's paths at its root (`/api/healthz` goes to `/healthz`). Point it elsewhere with `DFM_BACKEND_URL`:

```bash
DFM_BACKEND_URL=http://localhost:18080 npm start -- --port 4321
```

The proxy keeps the browser's `Host` header, so the backend sees same-origin WebSocket upgrades.

## API client

The backend contract is `api/openapi.yaml` in dfm-be. `openapi-typescript` turns it into `src/app/api/schema.d.ts`, which is committed and never edited by hand. Regenerate it whenever the contract changes:

```bash
npm run api:gen                               # http://localhost:8080/openapi.yaml
DFM_BACKEND_URL=http://localhost:18080 npm run api:gen
npm run api:gen -- ../dfm-be/api/openapi.yaml # a file or URL argument wins
DFM_OPENAPI_SPEC=<file-or-url> npm run api:gen
npm run api:gen:main                          # dfm-be main on GitHub, no backend needed
```

Services type their requests and responses with the generated schema, so when the backend renames or removes a field, `ng build` fails at every use of the old name.

`src/app/api/`:

- `schema.d.ts` generated contract types.
- `api-types.ts` `Schemas` (every component schema by name), `ApiPath` (every contract path), `ErrorBody`.
- `api-config.ts` `API_BASE_URL` (default `/api`), `apiUrl(path)`, and the `API_CSRF` hook.
- `api-error.ts` `ApiError` with `status`, `code` (the backend's snake_case reason, or `network_error` / `unexpected_response`), `message`, and the raw `body`.
- `api-interceptor.ts` for requests under `API_BASE_URL`: sends credentials (`withCredentials`), adds the CSRF header to state-changing requests when `API_CSRF` is provided, navigates to `/login` on 401 (except from `/login` itself), and rethrows every HTTP failure as `ApiError`.
- `health-api.ts` `HealthApi`, the service for `GET /healthz`.

### Adding a service for a feature

1. Add the operation to `api/openapi.yaml` in dfm-be and merge it, then run `npm run api:gen:main` (or `npm run api:gen` against your local backend) and commit `schema.d.ts`.
2. Create `src/app/api/<resource>-api.ts` with one `@Injectable({ providedIn: 'root' })` class per resource, following `health-api.ts`: build URLs with `apiUrl('/path')` (the argument must be a contract path; encode path parameters with `encodeURIComponent`), and type bodies with `Schemas['<Name>']`.
3. Return the `Observable` from `HttpClient` unchanged. Callers catch `ApiError` and branch on `code`. Only handle an error status in the service when the contract declares its own body for it, as `/healthz` does for 503.
4. Test it next to the file with `provideHttpClient(withInterceptors([apiInterceptor]))` and `HttpTestingController`, as in `health-api.spec.ts`.

## End-to-end tests

Install the browser once, then run the suite:

```bash
npx playwright install chromium
npm run e2e
```

Playwright starts `ng serve --port 0`, reads the chosen port from the server output into `E2E_PORT`, and uses it as `baseURL`. Tests live in `e2e/`, the config is `playwright.config.ts`.

## Layout

```
src/app/
  app.ts, app.html, app.scss   root shell (header + router outlet)
  app.config.ts                application providers
  app.routes.ts                top-level routes; features are lazy-loaded here
  api/                         generated contract types, typed HTTP services, the API interceptor
  core/                        app-wide singletons: WebSocket service, auth, guards
  shared/                      reusable standalone components, directives, and pipes with no feature knowledge
  features/<feature>/          one folder per routed feature, loaded with loadComponent or loadChildren
src/styles.scss                global styles entry
e2e/                           Playwright specs
```

Code follows the CLI defaults: standalone components, signals, zoneless change detection, strict TypeScript and templates, SCSS, the 2025 file naming style (`user-list.ts`, not `user-list.component.ts`), and the `app` selector prefix. Unit specs sit next to the file they test as `*.spec.ts`.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. Jobs: `lint` (ESLint and Prettier check), `test` (unit tests), `build` (production build), and `e2e` (Playwright smoke test).
