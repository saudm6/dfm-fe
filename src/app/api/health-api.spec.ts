import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiError } from './api-error';
import { apiInterceptor } from './api-interceptor';
import { HealthApi } from './health-api';

describe('HealthApi', () => {
  let api: HealthApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(HealthApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads GET /api/healthz', async () => {
    const result = firstValueFrom(api.get());
    const req = httpMock.expectOne('/api/healthz');
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ok', db: 'ok' });
    expect(await result).toEqual({ status: 'ok', db: 'ok' });
  });

  it('emits the 503 report of an unavailable database', async () => {
    const result = firstValueFrom(api.get());
    httpMock
      .expectOne('/api/healthz')
      .flush(
        { status: 'unavailable', db: 'unavailable' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    expect(await result).toEqual({ status: 'unavailable', db: 'unavailable' });
  });

  it('fails with the ApiError of any other error response', async () => {
    const result = firstValueFrom(api.get());
    httpMock
      .expectOne('/api/healthz')
      .flush(
        { code: 'internal', message: 'internal server error' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    const error: unknown = await result.then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 500,
      code: 'internal',
      message: 'internal server error',
    });
  });
});
