import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { API_CSRF } from './api/api-config';
import { apiInterceptor } from './api/api-interceptor';
import { routes } from './app.routes';
import { sessionCsrf, sessionInterceptor } from './core/auth/session';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([sessionInterceptor, apiInterceptor])),
    { provide: API_CSRF, useFactory: sessionCsrf },
  ],
};
