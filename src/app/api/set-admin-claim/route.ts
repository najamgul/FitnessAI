
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getAuth } = await import('firebase-admin/auth');
        
        function initializeAdminApp() {
            const appName = 'firebase-admin-app-set-claim';
            const existingApp = getApps().find(app => app.name === appName);
            if (existingApp) {
                return existingApp;
            }

            const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            
            if (!serviceAccountString) {
                throw new Error('Firebase configuration error: The service account key is missing from the server environment. Please ensure the FIREBASE_SERVICE_ACCOUNT_KEY is set in your deployment settings.');
            }
            
            try {
                const serviceAccount = JSON.parse(serviceAccountString);
                return initializeApp({ credential: cert(serviceAccount) }, appName);
            } catch (e: any) {
                console.error('CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. It may be malformed.', e);
                throw new Error('Firebase configuration error: The service account key is not valid JSON. Please check the format in your deployment settings.');
            }
        }
        
        const adminApp = initializeAdminApp();
        const authAdmin = getAuth(adminApp);
        
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }
        
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(token);
        
        const { uid } = await req.json();

        if (!uid || typeof uid !== 'string') {
            return NextResponse.json({ error: 'Invalid uid provided.' }, { status: 400 });
        }
        
        if (decodedToken.uid !== uid) {
            return NextResponse.json({ error: 'Forbidden: You can only set claims for your own account.' }, { status: 403 });
        }
        
        await authAdmin.setCustomUserClaims(uid, { role: 'admin' });
        
        return NextResponse.json({ message: `Admin claim set successfully for user ${uid}` });

    } catch (error: any) {
        console.error('=== SET ADMIN CLAIM API ERROR ===', error);
        return NextResponse.json({ error: error.message || 'Internal server error during claim setting' }, { status: 500 });
    }
}
