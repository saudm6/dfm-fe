import { Routes } from '@angular/router';
import { LOGIN_URL } from './api/api-interceptor';
import { authGuard } from './core/auth/auth-guards';

export const routes: Routes = [
  {
    // The API interceptor sends a 401 here, so this path must stay LOGIN_URL.
    path: LOGIN_URL.slice(1),
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
  },
  { path: '**', redirectTo: '' },
];
