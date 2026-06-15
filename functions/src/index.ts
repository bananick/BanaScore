import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { app } from '../../server/index';

// Secrets are configured once with `firebase functions:secrets:set NAME` and
// injected into the runtime environment (available at cold start).
const ADMIN_PASSWORD = defineSecret('ADMIN_PASSWORD');
const SESSION_SECRET = defineSecret('SESSION_SECRET');

setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

/**
 * Single HTTPS function serving the whole Express API. Firebase Hosting rewrites
 * `/api/**` to this function; the static frontend is served by Hosting directly.
 */
export const api = onRequest(
  {
    secrets: [ADMIN_PASSWORD, SESSION_SECRET],
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: false,
  },
  app,
);
