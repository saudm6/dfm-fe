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

Run one spec file, or only tests whose name matches a pattern:

```bash
npm test -- --include src/app/app.spec.ts
npm test -- --filter "page heading"
```

Unit tests watch for changes when run with `npx ng test`.

## Dev proxy

`proxy.conf.mjs` forwards `/api` (REST) and `/ws` (WebSocket) to the Go service at `http://localhost:8080`. Point it elsewhere with `DFM_BACKEND_URL`:

```bash
DFM_BACKEND_URL=http://localhost:18080 npm start -- --port 4321
```

The proxy keeps the browser's `Host` header, so the backend sees same-origin WebSocket upgrades.

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
  core/                        app-wide singletons: API client, WebSocket service, auth, interceptors, guards
  shared/                      reusable standalone components, directives, and pipes with no feature knowledge
  features/<feature>/          one folder per routed feature, loaded with loadComponent or loadChildren
src/styles.scss                global styles entry
e2e/                           Playwright specs
```

Code follows the CLI defaults: standalone components, signals, zoneless change detection, strict TypeScript and templates, SCSS, the 2025 file naming style (`user-list.ts`, not `user-list.component.ts`), and the `app` selector prefix. Unit specs sit next to the file they test as `*.spec.ts`.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. Jobs: `lint` (ESLint and Prettier check), `test` (unit tests), `build` (production build), and `e2e` (Playwright smoke test).
