
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const KASHMIR_KB_PATH = path.join(process.cwd(), 'src', 'ai', 'knowledge-base-kashmir.txt');
const NON_KASHMIR_KB_PATH = path.join(process.cwd(), 'src', 'ai', 'knowledge-base-non-kashmir.txt');

// A very basic auth check for the prototype. In a real app, use a proper session/auth system.
function isAdmin(req: NextRequest): boolean {
    // This is insecure and for demonstration purposes only.
    // In a real app, you would validate a secure session cookie or JWT.
    const authHeader = req.headers.get('Authorization');
    return authHeader === `Bearer ${process.env.ADMIN_SECRET_KEY}`; 
}

export async function GET(req: NextRequest) {
    // In a real app, you'd protect this route with robust authentication.
    // For this prototype, we'll allow GET requests but secure the POST.
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
    // In a real app, use a proper authentication mechanism
    // We'll simulate a check here for the purpose of the prototype
    const loggedInEmail = req.headers.get('X-User-Email'); // A custom header we'll have to send from client
    if (loggedInEmail?.toLowerCase() !== 'care@aziaf.com') {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
