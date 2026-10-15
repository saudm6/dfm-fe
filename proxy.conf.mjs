// DFM_BACKEND_URL lets a dev server on a shared host reach a backend that is not on the default port.
const target = process.env.DFM_BACKEND_URL ?? 'http://localhost:8080';

// Keys starting with ^ are regular expressions. The anchors keep look-alike paths such as
// /apix or /wsdl on the dev server instead of sending them to the backend.
export default {
  '^/api(?:[/?]|$)': { target, secure: false },
  '^/ws(?:[/?]|$)': { target, secure: false, ws: true },
};
