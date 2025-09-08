import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        // Add comprehensive logging for debugging
        console.log('=== DELETE USER API CALLED ===');
        console.log('Environment check:');
        console.log('- NODE_ENV:', process.env.NODE_ENV);
        console.log('- Service account key exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        console.log('- Service account key length:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0);

        // Dynamic imports inside try-catch
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getAuth } = await import('firebase-admin/auth');
        const { getFirestore } = await import('firebase-admin/firestore');
        
        console.log('Firebase admin modules imported successfully');

        function initializeAdminApp() {
            console.log('Initializing admin app...');
            
            const appName = 'firebase-admin-app-delete-user';
            const existingApp = getApps().find(app => app.name === appName);
            if (existingApp) {
                console.log('Using existing app:', appName);
                return existingApp;
            }

            const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            
            if (!serviceAccountString) {
                console.error('Service account key not found in environment');
                console.error('Available env vars containing "FIREBASE":', 
                    Object.keys(process.env).filter(key => key.includes('FIREBASE'))
                );
                throw new Error('Firebase service account key is not set in environment variables.');
            }
            
            if (serviceAccountString.trim() === '') {
                throw new Error('Firebase service account key is empty.');
            }
            
            try {
                console.log('Parsing service account JSON...');
                const serviceAccount = JSON.parse(serviceAccountString);
                
                if (!serviceAccount.project_id) throw new Error('Service account missing project_id');
                if (!serviceAccount.private_key) throw new Error('Service account missing private_key');
                if (!serviceAccount.client_email) throw new Error('Service account missing client_email');
                
                console.log('Service account parsed successfully for project:', serviceAccount.project_id);
                
                const app = initializeApp({
                    credential: cert(serviceAccount)
                }, appName);
                
                console.log('Firebase admin app initialized successfully');
                return app;
                
            } catch (parseError: any) {
                console.error('JSON Parse Error Details:', parseError.message);
                if (parseError instanceof SyntaxError) {
                    throw new Error(`Invalid JSON in service account key: ${parseError.message}`);
                }
                throw new Error(`Service account initialization failed: ${parseError.message}`);
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

        // Recursive delete helper function
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
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();

                process.nextTick(() => {
                    deleteQueryBatch(query, resolve, reject);
                });
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
        console.log('=== DELETE USER COMPLETED SUCCESSFULLY ===');
        
        return NextResponse.json({ message: `Successfully deleted user ${userId} and all associated data.` });

    } catch (error: any) {
        console.error('=== DELETE USER ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        
        if (error.message.includes('Firebase service account key')) {
            return NextResponse.json({ error: 'Firebase configuration error', details: error.message }, { status: 500 });
        }
        if (error.code === 'auth/user-not-found') {
            return NextResponse.json({ message: `User not found in Auth, but associated Firestore data was targeted for deletion.` });
        }
        return NextResponse.json({ error: 'Internal server error during user deletion.', details: error.message }, { status: 500 });
    }
}
