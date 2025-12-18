import admin from 'firebase-admin';

let app: admin.app.App;
if (!admin.apps.length) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    try {
      const parsed = JSON.parse(sa);
      app = admin.initializeApp({ credential: admin.credential.cert(parsed) });
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT, falling back to default creds', e);
      app = admin.initializeApp();
    }
  } else {
    app = admin.initializeApp();
  }
} else {
  app = admin.app();
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;

// Warm-up helper: perform a small Firestore read on startup to initialize
// SDK connections and reduce first-request latency in development.
export async function warmFirebaseOnStartup(): Promise<void> {
  try {
    const shouldWarm = process.env.WARM_FIREBASE_ON_STARTUP === '1' || process.env.NODE_ENV !== 'production';
    if (!shouldWarm) return;
    const start = Date.now();
    // Perform a cheap read; use a small collection like 'transactions' and limit to 1.
    await adminDb.collection('transactions').limit(1).get();
    const took = Date.now() - start;
    console.log(`Firebase Admin warm-up completed in ${took} ms`);
  } catch (err) {
    console.warn('Firebase Admin warm-up failed', err);
  }
}

// Trigger warm-up asynchronously; don't block module initialization.
(async () => {
  try {
    await warmFirebaseOnStartup();
  } catch (e) {
    // ignore
  }
})();
