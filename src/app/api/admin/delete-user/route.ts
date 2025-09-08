
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK
async function initializeAdminApp() {
    const appName = 'firebase-admin-delete-user-route';
    
    // Check if the app is already initialized
    const existingApp = admin.apps.find(app => app?.name === appName);
    if (existingApp) {
        return existingApp;
    }

    // This is the critical part: parsing the service account key from environment variables
    // This key should be set in your Vercel/Netlify/etc. deployment settings
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

// Recursive function to delete all documents in a collection and its subcollections
async function deleteCollection(db: admin.firestore.Firestore, collectionPath: string, batchSize: number) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db: admin.firestore.Firestore, query: admin.firestore.Query, resolve: (value: unknown) => void) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve(true);
        return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        // Recursively delete subcollections
        const subcollections = doc.ref.listCollections().then(collections => {
            collections.forEach(collection => deleteCollection(db, collection.path, 50));
        });
        batch.delete(doc.ref);
    });

    await batch.commit();

    // Recurse on the next process tick, to avoid hitting stack limits
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}


export async function POST(req: NextRequest) {
    try {
        const adminApp = await initializeAdminApp();
        const auth = admin.auth(adminApp);
        const db = admin.firestore(adminApp);
        
        const reqBody = await req.json();
        const { userIdToDelete } = reqBody;
        
        // 1. Verify the admin token making the request
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: No admin token provided' }, { status: 401 });
        }
        const adminToken = authHeader.split('Bearer ')[1];
        const decodedAdminToken = await auth.verifyIdToken(adminToken);
        if (decodedAdminToken.role !== 'admin') {
            return NextResponse.json({ error: 'Permission denied: You must be an admin.' }, { status: 403 });
        }

        // --- Start Deletion Process ---

        // 2. Delete user from Firebase Authentication
        await auth.deleteUser(userIdToDelete);

        // 3. Delete all Firestore data for the user
        // This includes the main user doc and all subcollections (onboarding, dietPlan, etc.)
        await deleteCollection(db, `users/${userIdToDelete}`, 50);

        // 4. Delete associated top-level documents
        const paymentDocRef = db.doc(`payments/${userIdToDelete}`);
        await paymentDocRef.delete().catch(() => {}); // Ignore if it doesn't exist

        const reviewsQuery = db.collection('reviews').where('userId', '==', userIdToDelete);
        const reviewsSnapshot = await reviewsQuery.get();
        if (!reviewsSnapshot.empty) {
            const batch = db.batch();
            reviewsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        return NextResponse.json({ message: `Successfully deleted user ${userIdToDelete}` });
    } catch (error: any) {
        console.error("Error in delete-user route:", error);

        let errorMessage = 'An internal server error occurred.';
        let statusCode = 500;

        if (error.message.includes('Firebase configuration error')) {
            errorMessage = error.message;
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'The user to delete was not found in Firebase Authentication.';
            statusCode = 404;
        } else if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            errorMessage = 'Admin token is invalid or expired. Please log in again.';
            statusCode = 401;
        } else if (error.code === 'permission-denied') {
             errorMessage = 'Permission denied. Ensure the service account has necessary roles.';
             statusCode = 403;
        }

        return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
}
