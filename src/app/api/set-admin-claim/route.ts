
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Moved all firebase-admin imports and logic inside the POST handler
  const { initializeApp, getApps, App, cert } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  function initializeAdminApp(): App {
    const appName = 'firebase-admin-app-set-claim';
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

  try {
    const adminApp = initializeAdminApp();
    const authAdmin = getAuth(adminApp);
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    const decodedToken = await authAdmin.verifyIdToken(token);
    const { uid } = await req.json();

    if (decodedToken.uid !== uid) {
        return NextResponse.json({ error: 'Forbidden: You can only set claims for your own account.' }, { status: 403 });
    }
    
    await authAdmin.setCustomUserClaims(uid, { role: 'admin' });
    
    return NextResponse.json({ message: `Admin claim set successfully for user ${uid}` });

  } catch (error: any) {
    console.error('Error setting admin claim:', error);
    return NextResponse.json({ error: 'Failed to initialize server resources.', details: error.message }, { status: 500 });
  }
}
