# dfm-fe

Angular frontend for the DFM trader terminal. The backend lives in [dfm-be](https://github.com/saudm6/dfm-be). The build order for both repos is in [ROADMAP.md](ROADMAP.md).

## Requirements

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`, the range Angular 22 supports (`engines.node` in `package.json`). CI uses the version in `.nvmrc` (22.22.3).
- npm (lockfile is `package-lock.json`; install with `npm ci`).

## Scripts

| Command                 | What it does                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `npm start`             | Dev server with the `/api` and `/ws` proxy. Add `-- --port <n>` to move it.             |
| `npm run build`         | Production build into `dist/dfm-fe`.                                                    |
| `npm test`              | Unit tests, single run, Vitest on jsdom (headless).                                     |
| `npm run lint`          | `angular-eslint` over `src/`, `e2e/`, and `playwright.config.ts`, then `typecheck:e2e`. |
| `npm run typecheck:e2e` | `tsc` over `e2e/` and `playwright.config.ts` (`tsconfig.e2e.json`).                     |
| `npm run format`        | Prettier, write mode.                                                                   |
| `npm run format:check`  | Prettier, check mode (what CI runs).                                                    |
| `npm run e2e`           | Playwright end-to-end tests in Chromium.                                                |
| `npm run api:gen`       | Regenerate the typed API schema from a running backend (see below).                     |
| `npm run api:gen:main`  | Regenerate the typed API schema from `api/openapi.yaml` on dfm-be `main`.               |

Run one spec file, or only tests whose name matches a pattern:

```bash
npm test -- --include src/app/app.spec.ts
npm test -- --filter "page heading"
```

Unit tests watch for changes when run with `npx ng test`.

## Dev proxy

`proxy.conf.mjs` forwards `/api` and `/api/...` (REST) and `/ws` and `/ws/...` (WebSocket) to the Go service at `http://localhost:8080`. The keys are anchored regular expressions, so a path such as `/apix` stays on the dev server. It strips the `/api` prefix, because the Go service serves the contract's paths at its root (`/api/healthz` goes to `/healthz`). Point it elsewhere with `DFM_BACKEND_URL`:

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
- `api-error.ts` `ApiError` with `status`, `code` (the backend's snake_case reason; `network_error` when the backend is unreachable, including a proxy's 502/503/504 with a non-JSON body; `unexpected_response` for any other response without an Error body), `message`, and the raw `body`.
- `api-interceptor.ts` for requests under `API_BASE_URL`: sends credentials (`withCredentials`), adds the CSRF header to state-changing requests when `API_CSRF` is provided, navigates to `/login?returnUrl=<url>` on 401 (`returnUrl` is the in-app URL being left, or being navigated to when the 401 interrupts a navigation; nothing happens when the current page or the navigation in flight is `/login` itself), and rethrows every HTTP failure as `ApiError`.
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
src/styles/_tokens.scss        theme tokens (CSS custom properties)
src/styles/_base.scss          base element styles and the change-up/down/flat classes
e2e/                           Playwright specs
```

Code follows the CLI defaults: standalone components, signals, zoneless change detection, strict TypeScript and templates, SCSS, the 2025 file naming style (`user-list.ts`, not `user-list.component.ts`), and the `app` selector prefix. Unit specs sit next to the file they test as `*.spec.ts`.

## Theme and formatting

Colors, type, and spacing are CSS custom properties on `:root` in `src/styles/_tokens.scss`: `--color-*`, `--font-*`, `--space-1` to `--space-6`, and `--radius`. Components use the tokens and never hard-code a color. Amber on black is the default theme; `<html data-theme="light">` switches to the light theme. `e2e/theme.spec.ts` checks every text, up, down, and freshness color against every background at 4.5:1 in both themes.

The whole app is set in a monospace face with `font-variant-numeric: tabular-nums`, so numbers line up in columns.

Shared formatting lives in `src/app/shared/`:

| Use                                                | Output for the example                      |
| -------------------------------------------------- | ------------------------------------------- |
| `{{ 5.4 \| price: 3 }}` (instrument decimals)      | `5.400`                                     |
| `{{ 1.2345 \| percentChange }}` (input in percent) | `+1.23%`                                    |
| `[class]="-0.5 \| changeClass"`                    | `change-down` (colors the text red)         |
| `{{ 164267392.04 \| volume }}`                     | `164.27M`                                   |
| `{{ 1234.5 \| money: 'AED' }}` (AED or USD)        | `AED 1,234.50` (with a no-break space)      |
| `<dfm-freshness [freshness]="q.freshness" />`      | `RT`, `DLY`, or `EOD` badge                 |
| `<td appAutoDir>{{ nameAr }}</td>`                 | `dir="auto"`, so Arabic reads right to left |

Every pipe and function takes a number or a decimal string as the backend sends it (`"11.4"`), and formats a string exactly, without a float round trip. Missing or non-finite numbers, strings that are not plain decimals, and invalid decimals arguments (not an integer from 0 to 20) print as `—`. Zero never prints with a minus. The sign and color of a change come from the value rounded to the shown decimals, so `-0.004` prints `0.00%` and is flat; pass the same decimals to `changeClass` as to `percentChange`. An unknown freshness value shows a neutral `?` badge. The same functions (`formatPrice`, `formatPercentChange`, `formatVolume`, `formatCurrency`, `changeDirection`) are exported from `src/app/shared/format` for code that cannot use a pipe, such as grid value formatters.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. Jobs: `lint` (ESLint, e2e type-check, and Prettier check), `test` (unit tests), `build` (production build), and `e2e` (Playwright smoke test).
