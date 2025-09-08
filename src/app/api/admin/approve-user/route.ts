
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccount = serviceAccountString ? JSON.parse(serviceAccountString) : undefined;

let adminApp: App;
if (!getApps().length) {
  if (serviceAccount) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
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
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split('Bearer ')[1];

    try {
        if (!serviceAccount) {
            throw new Error("Firebase Admin SDK not initialized. Service account key is missing.");
        }
        
        const decodedToken = await authAdmin.verifyIdToken(token);
        
        if (decodedToken.role === 'admin') {
            return decodedToken;
        }
        return null;
    } catch (error) {
        console.error('Error verifying admin token:', error);
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
        const paymentDoc = await paymentDocRef.get();
        if (paymentDoc.exists) {
            batch.update(paymentDocRef, {
                status: 'verified',
            });
        }

        await batch.commit();

        return NextResponse.json({ message: 'User approved successfully' });

    } catch (error) {
        console.error('Error approving user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
