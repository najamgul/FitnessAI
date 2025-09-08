
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
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error("verifyAdmin: No authorization header found.");
      return false;
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
       console.error("verifyAdmin: No token found in header.");
       return false;
    }

    try {
        if (!serviceAccount) throw new Error("Firebase Admin SDK not initialized");
        const decodedToken = await authAdmin.verifyIdToken(token);
        if (decodedToken.role === 'admin') {
            return true;
        }
        console.warn(`verifyAdmin: User ${decodedToken.uid} is not an admin.`);
        return false;
    } catch (error) {
        console.error('Error verifying admin token:', error);
        return false;
    }
}

export async function GET(req: NextRequest) {
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = [];

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            let user: any = {
                id: userDoc.id,
                name: userData.name,
                email: userData.email,
                paymentStatus: userData.paymentStatus || 'unpaid',
                planStatus: userData.planStatus || 'not_started',
                assignedTo: userData.assignedTo || '',
                role: userData.role || 'user',
                createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : null,
            };
            
            // Only fetch payment and onboarding for pending users
            if (user.paymentStatus === 'pending') {
                const paymentDoc = await db.collection('payments').doc(user.id).get();
                if (paymentDoc.exists()) {
                    user.screenshotUrl = paymentDoc.data()?.screenshotUrl;
                }

                const onboardingDoc = await db.collection('users').doc(user.id).collection('onboarding').doc('profile').get();
                if (onboardingDoc.exists()) {
                    const onboardingData = onboardingDoc.data();
                    user.planDuration = onboardingData?.planDuration;
                    user.onboardingData = onboardingData;
                }
            }
            
            users.push(user);
        }

        return NextResponse.json(users);

    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
