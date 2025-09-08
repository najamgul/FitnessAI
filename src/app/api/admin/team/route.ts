
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

let adminApp: App;
if (!getApps().length) {
  if (serviceAccount) {
    adminApp = initializeApp({
      credential: credential.cert(serviceAccount),
    });
  } else {
    console.warn("Firebase Admin SDK service account not found. API routes requiring auth will fail.");
    adminApp = initializeApp();
  }
} else {
  adminApp = getApps()[0];
}

const db = getFirestore(adminApp);
const authAdmin = getAuth(adminApp);

async function verifyAdmin(req: NextRequest): Promise<boolean> {
    console.log('=== ADMIN VERIFICATION DEBUG (team) ===');
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
        console.log('No valid auth header found');
        return false;
    }
    
    const token = authHeader.split('Bearer ')[1];
    console.log('Token extracted:', token ? 'Yes' : 'No');
    
    try {
        if (!serviceAccount) {
            console.log('Service account not available');
            throw new Error("Firebase Admin SDK not initialized");
        }
        
        console.log('Verifying token...');
        const decodedToken = await authAdmin.verifyIdToken(token);
        console.log('Token verified successfully for UID:', decodedToken.uid);
        console.log('Full decoded token:', JSON.stringify(decodedToken, null, 2));
        
        const isAdmin = decodedToken.role === 'admin';
        console.log(`Checking for admin role... found: ${isAdmin}`);
        
        console.log('=== END DEBUG ===');
        
        return isAdmin;
    } catch (error) {
        console.error('Error verifying admin token:', error);
        console.log('=== END DEBUG (ERROR) ===');
        return false;
    }
}


export async function GET(req: NextRequest) {
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const teamSnapshot = await db.collection('team').get();
        const teamMembers = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(teamMembers);
    } catch (error) {
        console.error('Error fetching team members:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
