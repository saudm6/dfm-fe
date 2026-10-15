import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { apiUrl } from './api-config';
import { ApiError } from './api-error';
import type { Schemas } from './api-types';

export type Health = Schemas['Health'];

/** GET /healthz. */
@Injectable({ providedIn: 'root' })
export class HealthApi {
  private readonly http = inject(HttpClient);
  private readonly url = apiUrl('/healthz');

  /** Emits the health report, including the 503 report of an unavailable database. */
  get(): Observable<Health> {
    return this.http
      .get<Health>(this.url)
      .pipe(
        catchError((error: unknown) =>
          error instanceof ApiError && error.status === 503 && isHealth(error.body)
            ? of(error.body)
            : throwError(() => error),
        ),
      );
  }
}

function isHealth(body: unknown): body is Health {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const candidate = body as Partial<Record<keyof Health, unknown>>;
  return typeof candidate.status === 'string' && typeof candidate.db === 'string';
}
