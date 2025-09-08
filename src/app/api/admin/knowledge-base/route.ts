
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

const KASHMIR_KB_PATH = path.join(process.cwd(), 'src', 'ai', 'knowledge-base-kashmir.txt');
const NON_KASHMIR_KB_PATH = path.join(process.cwd(), 'src', 'ai', 'knowledge-base-non-kashmir.txt');

// Initialize Firebase Admin SDK
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let adminApp: App;
if (!getApps().length) {
  if (serviceAccount) {
    adminApp = initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
    });
  } else {
    console.warn("Firebase Admin SDK service account not found. API routes requiring auth will fail.");
    adminApp = initializeApp();
  }
} else {
  adminApp = getApps()[0];
}

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


export async function GET(req: NextRequest) {
    const decodedToken = await verifyAdmin(req);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Unauthorized: You must be an admin to perform this action.' }, { status: 403 });
    }
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
