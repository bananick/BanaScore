import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue as AdminFieldValue, type Firestore } from 'firebase-admin/firestore';

/**
 * Firestore data layer (replaces SQLite). In dev/tests, point at the emulator
 * with FIRESTORE_EMULATOR_HOST=localhost:8080. In prod (Cloud Functions/Run),
 * Application Default Credentials are used automatically.
 */
if (!getApps().length) {
  initializeApp({
    projectId:
      process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'banascore-dev',
  });
}

export const db = getFirestore();
export type DB = Firestore;
export const FieldValue = AdminFieldValue;

/**
 * Atomic numeric auto-increment per collection, stored in `counters/{name}`.
 * Lets us keep the app's numeric IDs (frontend, routes, types) unchanged while
 * using Firestore. Document IDs are the stringified number.
 */
export async function nextId(name: string): Promise<number> {
  const ref = db.collection('counters').doc(name);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const seq = ((snap.exists ? (snap.data() as { seq?: number }).seq : 0) ?? 0) + 1;
    tx.set(ref, { seq }, { merge: true });
    return seq;
  });
}

export default db;
