
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountString) {
  throw new Error('Firebase service account key is not set in environment variables.');
}

const serviceAccount = JSON.parse(serviceAccountString);

let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
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
