import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        console.log('=== DELETE USER API CALLED ===');
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getAuth } = await import('firebase-admin/auth');
        const { getFirestore } = await import('firebase-admin/firestore');
        console.log('Firebase admin modules imported successfully');

        function initializeAdminApp() {
            const appName = 'firebase-admin-app-delete-user';
            const existingApp = getApps().find(app => app.name === appName);
            if (existingApp) {
                console.log('Using existing app:', appName);
                return existingApp;
            }

            console.log('Initializing new admin app:', appName);
            const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            
            if (!serviceAccountString) {
                console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
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

        const app = initializeAdminApp();
        const auth = getAuth(app);
        const db = getFirestore(app);

        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);
        
        if (decodedToken.role !== 'admin') {
             return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
        }

        const { userId } = await req.json();

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json({ error: 'Invalid user ID provided.' }, { status: 400 });
        }
        
        console.log(`Attempting to delete user ${userId} and associated data...`);

        async function deleteCollection(collectionPath: string, batchSize: number) {
            const collectionRef = db.collection(collectionPath);
            const query = collectionRef.orderBy('__name__').limit(batchSize);
            return new Promise<void>((resolve, reject) => {
                deleteQueryBatch(query, resolve, reject);
            });
        }

        async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: () => void, reject: (err: any) => void) {
            try {
                const snapshot = await query.get();
                if (snapshot.size === 0) {
                    resolve();
                    return;
                }
                const batch = db.batch();
                snapshot.docs.forEach((doc) => { batch.delete(doc.ref); });
                await batch.commit();
                process.nextTick(() => { deleteQueryBatch(query, resolve, reject); });
            } catch(err) {
                reject(err);
            }
        }
        
        await deleteCollection(`users/${userId}/onboarding`, 50);
        await deleteCollection(`users/${userId}/dietPlan`, 50);
        
        const batch = db.batch();
        batch.delete(db.collection('users').doc(userId));
        batch.delete(db.collection('payments').doc(userId));
        
        const reviewQuery = db.collection('reviews').where('userId', '==', userId);
        const reviewSnapshot = await reviewQuery.get();
        reviewSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        await auth.deleteUser(userId);

        console.log(`Successfully deleted user ${userId}`);
        
        return NextResponse.json({ message: `Successfully deleted user ${userId} and all associated data.` });

    } catch (error: any) {
        console.error('=== DELETE USER API ERROR ===', error);
        return NextResponse.json({ error: error.message || 'Internal server error during user deletion.' }, { status: 500 });
    }
}
