
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

async function verifyAdmin(req: NextRequest) {
    console.log('=== ADMIN VERIFICATION DEBUG (approve-user) ===');
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
        console.log('No valid auth header found');
        return null;
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
        
        if (isAdmin) {
            console.log('=== END DEBUG (SUCCESS) ===');
            return decodedToken;
        }
        console.log('User is not an admin.');
        console.log('=== END DEBUG (FAILURE) ===');
        return null;
    } catch (error) {
        console.error('Error verifying admin token:', error);
        console.log('=== END DEBUG (ERROR) ===');
        return null;
    }
}


export async function POST(req: NextRequest) {
    const decodedToken = await verifyAdmin(req);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { userId, userEmail, userName, days, assignedTo } = await req.json();

        if (!userId || !userEmail || !userName || !days || !assignedTo) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);

        const batch = db.batch();

        const userDocRef = db.collection('users').doc(userId);
        batch.update(userDocRef, {
            paymentStatus: 'approved',
            planStatus: 'pending_review',
            assignedTo: assignedTo.name,
            paymentExpiryDate: expiryDate.toISOString(),
        });

        const reviewDocRef = db.collection('reviews').doc();
        batch.set(reviewDocRef, {
            userId: userId,
            userName: userName,
            userEmail: userEmail,
            assignedTo: assignedTo.name,
            assignedToId: assignedTo.id,
            status: 'pending_generation',
            createdAt: FieldValue.serverTimestamp(),
        });
        
        const paymentDocRef = db.collection('payments').doc(userId);
        batch.update(paymentDocRef, {
            status: 'verified',
        });

        await batch.commit();

        return NextResponse.json({ message: 'User approved successfully' });

    } catch (error) {
        console.error('Error approving user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
