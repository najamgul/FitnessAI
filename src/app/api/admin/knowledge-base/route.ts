
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

const KASHMIR_KB_PATH = path.join(process.cwd(), 'src', 'ai', 'knowledge-base-kashmir.txt');
const NON_KASHMIR_KB_PATH = path.join(process.cwd(), 'src', 'ai', 'knowledge-base-non-kashmir.txt');

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
    // Initialize without credentials for environments where it's not needed/available.
    adminApp = initializeApp();
  }
} else {
  adminApp = getApps()[0];
}

const authAdmin = getAuth(adminApp);

async function verifyAdmin(req: NextRequest) {
    console.log('=== ADMIN VERIFICATION DEBUG (knowledge-base) ===');
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


export async function GET(req: NextRequest) {
    try {
        const kashmir = await fs.readFile(KASHMIR_KB_PATH, 'utf-8');
        const nonKashmir = await fs.readFile(NON_KASHMIR_KB_PATH, 'utf-8');
        return NextResponse.json({ kashmir, nonKashmir });
    } catch (error) {
        console.error('Failed to read knowledge base files:', error);
        return NextResponse.json({ error: 'Could not read knowledge base files' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const decodedToken = await verifyAdmin(req);
    if (!decodedToken) {
         return NextResponse.json({ error: 'Unauthorized: You must be an admin to perform this action.' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { type, content } = body;

        if (typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
        }

        let filePath;
        if (type === 'kashmir') {
            filePath = KASHMIR_KB_PATH;
        } else if (type === 'non-kashmir') {
            filePath = NON_KASHMIR_KB_PATH;
        } else {
            return NextResponse.json({ error: 'Invalid knowledge base type' }, { status: 400 });
        }

        await fs.writeFile(filePath, content, 'utf-8');

        return NextResponse.json({ message: 'Knowledge base updated successfully' });

    } catch (error) {
        console.error('Failed to write knowledge base file:', error);
        return NextResponse.json({ error: 'Could not update knowledge base' }, { status: 500 });
    }
}
