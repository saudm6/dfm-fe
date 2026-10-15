import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from './api-config';
import type { Schemas } from './api-types';

export type Me = Schemas['Me'];
export type Role = Schemas['Role'];
export type LoginRequest = Schemas['LoginRequest'];

/** POST /auth/login, POST /auth/logout, and GET /me. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly loginUrl = apiUrl('/auth/login');
  private readonly logoutUrl = apiUrl('/auth/logout');
  private readonly meUrl = apiUrl('/me');

  /** Starts a session. The response sets the session cookie and carries the CSRF token. */
  login(credentials: LoginRequest): Observable<Me> {
    // The backend answers any other content type with 415.
    return this.http.post<Me>(this.loginUrl, credentials, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** Ends the current session. Needs the CSRF header, which the API interceptor adds. */
  logout(): Observable<void> {
    return this.http.post<void>(this.logoutUrl, null);
  }

  /** The signed-in account, or a 401 ApiError when there is no session. */
  me(): Observable<Me> {
    return this.http.get<Me>(this.meUrl);
  }
}
