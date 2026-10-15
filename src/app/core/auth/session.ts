import { HttpInterceptorFn } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import type { CsrfSource } from '../../api/api-config';
import { ApiError } from '../../api/api-error';
import { AuthApi, Me, Role } from '../../api/auth-api';

export const CSRF_HEADER = 'X-CSRF-Token';

/** The signed-in account. The session cookie is HttpOnly; this only holds what the backend reports. */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly api = inject(AuthApi);
  private readonly me = signal<Me | null>(null);
  /** Settles once whether anyone is signed in is known. */
  private known: Promise<void> | null = null;

  /** The signed-in account, or null. */
  readonly user = this.me.asReadonly();
  readonly role = computed<Role | null>(() => this.me()?.role ?? null);
  /**
   * Whether the account may use market data: quotes, history, orders, and positions. Only owner
   * may; the backend answers a member with 403. Hide every function that needs it behind this.
   */
  readonly canSeeMarketData = computed(() => this.role() === 'owner');
  /** The session's CSRF token, sent on state-changing requests. */
  readonly csrfToken = computed(() => this.me()?.csrfToken ?? null);

  /**
   * Whether someone is signed in. Only the first call asks GET /me; later calls see what that
   * answer, a login, a logout, or a 401 left.
   */
  async restore(): Promise<boolean> {
    this.known ??= firstValueFrom(this.api.me()).then(
      (me) => this.me.set(me),
      () => undefined,
    );
    await this.known;
    return this.me() !== null;
  }

  login(username: string, password: string): Observable<Me> {
    return this.api.login({ username, password }).pipe(tap((me) => this.set(me)));
  }

  /** Ends the session on the server, and here even when the server could not be told. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch {
      // The user asked to leave; the server session expires on its own.
    } finally {
      this.clear();
    }
  }

  /** Forgets the account and its CSRF token. */
  clear(): void {
    this.set(null);
  }

  private set(me: Me | null): void {
    this.me.set(me);
    this.known = Promise.resolve();
  }
}

/** The API_CSRF source: the current session's token in the X-CSRF-Token header. */
export function sessionCsrf(): CsrfSource {
  const session = inject(Session);
  return { header: CSRF_HEADER, token: () => session.csrfToken() };
}

/**
 * Clears the session when an API request gets 401: the server no longer knows it. List it
 * before apiInterceptor, which turns failures into the ApiError this checks.
 */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(Session);
  return next(req).pipe(
    tap({
      error: (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          session.clear();
        }
      },
    }),
  );
};
