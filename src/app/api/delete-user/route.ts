
import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin (lazily)
function getAdminApp() {
    if (getApps().length > 0) return getApps()[0];
    
    // In production, use environment variable for service account
    // For now, use application default credentials
    return initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { uid } = body;

        if (!uid || typeof uid !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid user ID' }, { status: 400 });
        }

        // Verify the request comes from an admin (check auth header)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const app = getAdminApp();
        const adminAuth = getAuth(app);
        const adminDb = getFirestore(app);
        
        // Verify the caller is an admin
        const callerToken = await adminAuth.verifyIdToken(token);
        const callerDoc = await adminDb.collection('users').doc(callerToken.uid).get();
        
        if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Delete the user's Firestore data
        const userDocRef = adminDb.collection('users').doc(uid);
        
        // Delete subcollections
        const subcollections = await userDocRef.listCollections();
        for (const subcollection of subcollections) {
            const docs = await subcollection.listDocuments();
            for (const doc of docs) {
                await doc.delete();
            }
        }
        
        // Delete the user document itself
        await userDocRef.delete();
        
        // Delete payment record if exists
        const paymentDocRef = adminDb.collection('payments').doc(uid);
        const paymentDoc = await paymentDocRef.get();
        if (paymentDoc.exists) {
            await paymentDocRef.delete();
        }

        // Delete the user from Firebase Auth
        try {
            await adminAuth.deleteUser(uid);
        } catch (authError: any) {
            // User may not exist in Auth (e.g., already deleted)
            if (authError.code !== 'auth/user-not-found') {
                console.error('Error deleting auth user:', authError);
            }
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete user' },
            { status: 500 }
        );
    }
}
