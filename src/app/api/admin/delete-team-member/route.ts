
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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

export async function POST(req: NextRequest) {
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ error: 'Team member ID is required' }, { status: 400 });
        }

        await db.collection('team').doc(id).delete();

        return NextResponse.json({ message: 'Team member deleted successfully' });
    } catch (error) {
        console.error('Error deleting team member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
