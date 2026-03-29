
import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Authorized admin emails — maintain this list server-side only
const ADMIN_EMAILS = ['care@aziaf.com'];

function getAdminApp() {
    if (getApps().length > 0) return getApps()[0];
    return initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const body = await request.json();
        const { uid } = body;

        if (!uid || typeof uid !== 'string') {
            return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
        }

        const app = getAdminApp();
        const adminAuth = getAuth(app);

        // Verify the token and get the user's email
        const decodedToken = await adminAuth.verifyIdToken(token);
        
        // CRITICAL: The uid must match the token's uid (user setting their own claim)
        if (decodedToken.uid !== uid) {
            return NextResponse.json({ error: 'UID mismatch' }, { status: 403 });
        }

        // Server-side verification that this email is an authorized admin
        const userRecord = await adminAuth.getUser(uid);
        if (!userRecord.email || !ADMIN_EMAILS.includes(userRecord.email.toLowerCase())) {
            return NextResponse.json({ error: 'Not an authorized admin email' }, { status: 403 });
        }

        // Set the admin custom claim
        await adminAuth.setCustomUserClaims(uid, { admin: true });

        // Also update the Firestore document to be consistent
        const adminDb = getFirestore(app);
        await adminDb.collection('users').doc(uid).update({ role: 'admin' });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Set admin claim error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to set admin claim' },
            { status: 500 }
        );
    }
}
