
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

async function initializeAdminApp() {
    const appName = 'firebase-admin-set-claim';
    
    const existingApp = admin.apps.find(app => app?.name === appName);
    if (existingApp) {
        return existingApp;
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('Firebase configuration error: The service account key is missing from the server environment. Please ensure the FIREBASE_SERVICE_ACCOUNT_KEY is set in your deployment settings.');
    }
    
    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        }, appName);
    } catch (e) {
        throw new Error('Firebase configuration error: Failed to parse the service account key. Ensure it is a valid JSON string.');
    }
}

export async function POST(req: NextRequest) {
    try {
        const adminApp = await initializeAdminApp();
        const auth = admin.auth(adminApp);
        
        const { uid } = await req.json();
        
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        await auth.verifyIdToken(token);
        
        await auth.setCustomUserClaims(uid, { role: 'admin' });
        
        return NextResponse.json({ message: `Admin claim set for user ${uid}` });

    } catch (error: any) {
        console.error("Error in set-admin-claim route:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
