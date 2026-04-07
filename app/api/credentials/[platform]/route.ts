import { NextRequest, NextResponse } from 'next/server';
import { credentialsDb } from '@/lib/db';

// Force Node.js runtime — required for better-sqlite3 native module
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  try {
    const creds = credentialsDb.get(platform);
    if (!creds) return NextResponse.json({ configured: false });
    return NextResponse.json({ configured: true, client_id: creds.client_id });
  } catch (err) {
    console.error(`[credentials GET ${platform}]`, err);
    return NextResponse.json({ configured: false, error: String(err) });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  try {
    const body = await req.json();
    const client_id = body?.client_id?.trim();
    const client_secret = body?.client_secret?.trim();

    if (!client_id || !client_secret) {
      return NextResponse.json({ error: 'Both client_id and client_secret are required' }, { status: 400 });
    }

    credentialsDb.save(platform, client_id, client_secret);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[credentials POST ${platform}]`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  try {
    credentialsDb.delete(platform);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(`[credentials DELETE ${platform}]`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
