
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Store the initialized app to avoid re-initializing on every request
let adminApp: App;

function initializeAdminApp() {
    if (getApps().length > 0) {
        return getApps().find(app => app.name === 'admin') || initializeApp({
            credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!))
        }, 'admin');
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('Firebase service account key is not set in environment variables.');
    }
    
    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        return initializeApp({
            credential: cert(serviceAccount)
        }, 'admin');
    } catch (e) {
        console.error('Failed to parse Firebase service account key string.', e);
        throw new Error('Firebase service account key is not valid JSON.');
    }
}


async function verifyAdmin(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await getAuth(adminApp).verifyIdToken(token);
        if (decodedToken.role === 'admin') {
            return decodedToken.uid;
        }
        return null;
    } catch (error) {
        console.error('Error verifying admin token:', error);
        return null;
    }
}


export async function POST(req: NextRequest) {
    try {
        adminApp = initializeAdminApp();
        const adminUid = await verifyAdmin(req);

        if (!adminUid) {
            return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
        }

        const { userId } = await req.json();

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json({ error: 'Invalid user ID provided.' }, { status: 400 });
        }
        
        const auth = getAuth(adminApp);
        const db = getFirestore(adminApp);

        // Delete user from Firebase Auth
        await auth.deleteUser(userId);

        // Delete user document from Firestore
        await db.collection('users').doc(userId).delete();
        
        // Note: This does not delete subcollections like 'onboarding' or 'dietPlan'.
        // For a production app, a Firebase Function triggered by user deletion would be better.

        return NextResponse.json({ message: `Successfully deleted user ${userId}` });

    } catch (error: any) {
        console.error('Error deleting user:', error);
        if (error.code === 'auth/user-not-found') {
            return NextResponse.json({ error: 'User not found in Firebase Authentication.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

