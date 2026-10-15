// DFM_BACKEND_URL lets a dev server on a shared host reach a backend that is not on the default port.
const target = process.env.DFM_BACKEND_URL ?? 'http://localhost:8080';

export default {
  // The Go service serves the contract's paths at its root, so /api/healthz goes to /healthz.
  '/api': { target, secure: false, pathRewrite: { '^/api': '' } },
  '/ws': { target, secure: false, ws: true },
};
