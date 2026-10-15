import type { components, paths } from './schema';

/** Every schema in components.schemas of the backend contract, by name. */
export type Schemas = components['schemas'];

/** A path of the backend contract, such as '/healthz'. */
export type ApiPath = keyof paths;

/** The body of every non-2xx response. */
export type ErrorBody = Schemas['Error'];
