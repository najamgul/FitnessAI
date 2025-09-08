
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Standardized function to initialize Firebase Admin SDK
function initializeAdminApp(): App {
    const appName = 'firebase-admin-app-delete-user';
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
            credential: cert(serviceAccount)
        }, appName);
    } catch (e: any) {
        console.error('Failed to parse or initialize Firebase Admin SDK:', e.message);
        throw new Error('Firebase service account key is not valid.');
    }
}


// Standardized function to verify admin user from a request
async function verifyAdmin(request: NextRequest, app: App): Promise<string | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split('Bearer ')[1];
    if (!token) {
        return null;
    }

    try {
        const decodedToken = await getAuth(app).verifyIdToken(token);
        if (decodedToken.role === 'admin') {
            return decodedToken.uid;
        }
        return null;
    } catch (error) {
        console.error('Error verifying admin token:', error);
        return null;
    }
}

// Recursively delete a collection in batches
async function deleteCollection(db: FirebaseFirestore.Firestore, collectionPath: string, batchSize: number) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise<void>((resolve, reject) => {
        deleteQueryBatch(db, query, resolve, reject);
    });
}

async function deleteQueryBatch(db: FirebaseFirestore.Firestore, query: FirebaseFirestore.Query, resolve: () => void, reject: (err: any) => void) {
    try {
        const snapshot = await query.get();

        const batchSize = snapshot.size;
        if (batchSize === 0) {
            resolve();
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        process.nextTick(() => {
            deleteQueryBatch(db, query, resolve, reject);
        });
    } catch(err) {
        reject(err);
    }
}


export async function POST(req: NextRequest) {
    let app: App;
    try {
        app = initializeAdminApp();
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to initialize server resources.', details: e.message }, { status: 500 });
    }

    try {
        const adminUid = await verifyAdmin(req, app);

        if (!adminUid) {
            return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
        }

        const { userId } = await req.json();

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json({ error: 'Invalid user ID provided.' }, { status: 400 });
        }
        
        const auth = getAuth(app);
        const db = getFirestore(app);

        // Delete subcollections first
        await deleteCollection(db, `users/${userId}/onboarding`, 50);
        await deleteCollection(db, `users/${userId}/dietPlan`, 50);
        
        const batch = db.batch();

        // Delete the main user document
        const userDocRef = db.collection('users').doc(userId);
        batch.delete(userDocRef);

        // Delete payment document if it exists
        const paymentDocRef = db.collection('payments').doc(userId);
        batch.delete(paymentDocRef);
        
        // Delete review document if it exists
        const reviewQuery = db.collection('reviews').where('userId', '==', userId);
        const reviewSnapshot = await reviewQuery.get();
        reviewSnapshot.forEach(doc => batch.delete(doc.ref));

        // Commit all batched deletions
        await batch.commit();

        // Finally, delete the user from Firebase Auth
        await auth.deleteUser(userId);

        return NextResponse.json({ message: `Successfully deleted user ${userId} and all associated data.` });

    } catch (error: any) {
        console.error('Error deleting user:', error);
        if (error.code === 'auth/user-not-found') {
            return NextResponse.json({ message: `User with ID ${error.uid} not found in Auth, but Firestore data deleted.` });
        }
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
