
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config();

// Standardized function to initialize Firebase Admin SDK
function initializeAdminApp(): App {
    const adminApps = getApps().filter(app => app.name === 'admin');
    if (adminApps.length > 0) {
        return adminApps[0]!;
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('Firebase service account key is not set in environment variables.');
    }
    
    try {
        // Handle both stringified JSON and plain objects
        const serviceAccount = typeof serviceAccountString === 'string'
            ? JSON.parse(serviceAccountString)
            : serviceAccountString;
            
        return initializeApp({
            credential: cert(serviceAccount)
        }, 'admin');
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
        // Correctly check for the custom claim
        if (decodedToken.role === 'admin') {
            return decodedToken.uid;
        }
        return null;
    } catch (error) {
        console.error('Error verifying admin token:', error);
        return null;
    }
}

// Recursively delete a collection
async function deleteCollection(db: FirebaseFirestore.Firestore, collectionPath: string, batchSize: number, batch: WriteBatch) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise<void>((resolve, reject) => {
        deleteQueryBatch(db, query, batch, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db: FirebaseFirestore.Firestore, query: FirebaseFirestore.Query, batch: WriteBatch, resolve: () => void) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    // Delete documents in a batch
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, batch, resolve);
    });
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
        const batch = db.batch();

        // Delete subcollections first
        await deleteCollection(db, `users/${userId}/onboarding`, 50, batch);
        await deleteCollection(db, `users/${userId}/dietPlan`, 50, batch);

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
            // If user doesn't exist in auth, it's not a fatal error, just log and continue
            return NextResponse.json({ message: `User with ID ${error.uid} not found in Auth, but Firestore data deleted.` });
        }
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
