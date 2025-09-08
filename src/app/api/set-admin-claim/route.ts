import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        // Add comprehensive logging for debugging
        console.log('=== SET ADMIN CLAIM API CALLED ===');
        console.log('Environment check:');
        console.log('- NODE_ENV:', process.env.NODE_ENV);
        console.log('- Service account key exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        console.log('- Service account key length:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0);
        
        // Dynamic imports inside try-catch
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getAuth } = await import('firebase-admin/auth');
        
        console.log('Firebase admin modules imported successfully');

        function initializeAdminApp() {
            console.log('Initializing admin app...');
            
            const appName = 'firebase-admin-app-set-claim';
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
                
                // Validate critical fields
                if (!serviceAccount.project_id) {
                    throw new Error('Service account missing project_id');
                }
                if (!serviceAccount.private_key) {
                    throw new Error('Service account missing private_key');
                }
                if (!serviceAccount.client_email) {
                    throw new Error('Service account missing client_email');
                }
                
                console.log('Service account parsed successfully for project:', serviceAccount.project_id);
                
                const app = initializeApp({
                    credential: cert(serviceAccount)
                }, appName);
                
                console.log('Firebase admin app initialized successfully');
                return app;
                
            } catch (parseError: any) {
                console.error('JSON Parse Error Details:', parseError.message);
                console.error('First 100 chars of service account:', serviceAccountString.substring(0, 100));
                console.error('Last 100 chars of service account:', serviceAccountString.substring(serviceAccountString.length - 100));
                
                if (parseError instanceof SyntaxError) {
                    throw new Error(`Invalid JSON in service account key: ${parseError.message}`);
                }
                throw new Error(`Service account initialization failed: ${parseError.message}`);
            }
        }

        // Initialize Firebase Admin
        console.log('Starting Firebase initialization...');
        const adminApp = initializeAdminApp();
        const authAdmin = getAuth(adminApp);
        
        // Verify authorization header
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('No valid authorization header found');
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }
        
        const token = authHeader.split('Bearer ')[1];
        if (!token) {
            console.log('No token found in authorization header');
            return NextResponse.json({ error: 'Unauthorized: Invalid token format' }, { status: 401 });
        }
        
        // Verify the token
        console.log('Verifying ID token...');
        const decodedToken = await authAdmin.verifyIdToken(token);
        console.log('Token verified for user:', decodedToken.uid);
        
        // Parse request body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('Failed to parse request body:', e);
            return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
        }

        const { uid } = body;
        if (!uid || typeof uid !== 'string') {
            console.log('Invalid uid provided:', uid);
            return NextResponse.json({ error: 'Invalid uid provided.' }, { status: 400 });
        }

        // Security check: Only allow a user to set claims for their own account
        if (decodedToken.uid !== uid) {
            console.log('Security violation: User', decodedToken.uid, 'trying to set claims for', uid);
            return NextResponse.json({ 
                error: 'Forbidden: You can only set claims for your own account.' 
            }, { status: 403 });
        }
        
        console.log('Setting admin claim for user:', uid);
        
        // Set the custom claim
        await authAdmin.setCustomUserClaims(uid, { role: 'admin' });
        
        console.log('Admin claim set successfully for user:', uid);
        console.log('=== SET ADMIN CLAIM COMPLETED SUCCESSFULLY ===');
        
        return NextResponse.json({ 
            message: `Admin claim set successfully for user ${uid}` 
        });

    } catch (error: any) {
        console.error('=== SET ADMIN CLAIM ERROR ===');
        console.error('Error type:', typeof error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        console.error('Full error object:', error);
        
        // Return more specific error messages
        if (error.message.includes('Firebase service account key')) {
            return NextResponse.json({ 
                error: 'Firebase configuration error', 
                details: error.message,
                troubleshooting: 'Check that FIREBASE_SERVICE_ACCOUNT_KEY environment variable is properly set'
            }, { status: 500 });
        }
        
        if (error.code?.includes('auth/')) {
            return NextResponse.json({ 
                error: 'Firebase Authentication error', 
                details: error.message,
                errorCode: error.code
            }, { status: 400 });
        }
        
        return NextResponse.json({ 
            error: 'Internal server error during claim setting', 
            details: error.message,
            errorCode: error.code || 'unknown'
        }, { status: 500 });
    }
}
