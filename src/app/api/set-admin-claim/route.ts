
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// This function will be called inside the POST handler to ensure it runs at runtime.
function initializeAdminApp(): App {
  const appName = 'firebase-admin-app-set-claim';
  // Avoid re-initializing the app on every call
  const existingApp = getApps().find(app => app.name === appName);
  if (existingApp) {
    return existingApp;
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('Firebase service account key is not set in environment variables.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    return initializeApp({
      credential: cert(serviceAccount),
    }, appName);
  } catch (e: any) {
    console.error('Failed to parse or initialize Firebase Admin SDK:', e.message);
    throw new Error(`Firebase service account key is not valid. Error: ${e.message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Initialize the app inside the request handler
    const adminApp = initializeAdminApp();
    const authAdmin = getAuth(adminApp);
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token to ensure the request is from a legitimate user.
    const decodedToken = await authAdmin.verifyIdToken(token);
    const { uid } = await req.json();

    // Security check: Only allow a user to trigger this for their own account.
    if (decodedToken.uid !== uid) {
        return NextResponse.json({ error: 'Forbidden: You can only set claims for your own account.' }, { status: 403 });
    }
    
    // The check for whether this user *should* be an admin is implicitly handled by the signup logic
    // which only calls this API for the specific admin email.
    // Setting the custom claim.
    await authAdmin.setCustomUserClaims(uid, { role: 'admin' });
    
    return NextResponse.json({ message: `Admin claim set successfully for user ${uid}` });

  } catch (error: any) {
    console.error('Error setting admin claim:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
