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
