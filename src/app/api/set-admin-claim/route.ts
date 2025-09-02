
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

let adminApp: App;
if (!getApps().length) {
  if (serviceAccount) {
    adminApp = initializeApp({
      credential: credential.cert(serviceAccount),
    });
  } else {
    console.warn("Firebase Admin SDK service account not found. API routes requiring auth will fail.");
    adminApp = initializeApp();
  }
} else {
  adminApp = getApps()[0];
}

const auth = getAuth(adminApp);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    // The user calling this should be the user who just signed up.
    // We verify their token to get their UID.
    const decodedToken = await auth.verifyIdToken(token);
    const { uid } = await req.json();

    // Security check: Only the user themselves can trigger this for their own account.
    if (decodedToken.uid !== uid) {
        return NextResponse.json({ error: 'Forbidden: You can only set claims for your own account.' }, { status: 403 });
    }

    // A more robust check might ensure this can only be called once,
    // or only for specific emails, but for this context, we set the claim.
    await auth.setCustomUserClaims(uid, { role: 'admin' });
    
    return NextResponse.json({ message: `Admin claim set for user ${uid}` });
  } catch (error) {
    console.error('Error setting admin claim:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
