import { NextRequest, NextResponse } from 'next/server';
import { credentialsDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const creds = credentialsDb.get(platform);
  if (!creds) return NextResponse.json({ configured: false });
  // Return masked values so the UI can show the form is pre-filled
  return NextResponse.json({
    configured: true,
    client_id: creds.client_id,
    // Never return secret to client
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  try {
    const { client_id, client_secret } = await req.json();
    if (!client_id?.trim() || !client_secret?.trim()) {
      return NextResponse.json({ error: 'client_id and client_secret are required' }, { status: 400 });
    }
    credentialsDb.save(platform, client_id.trim(), client_secret.trim());
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  credentialsDb.delete(platform);
  return new NextResponse(null, { status: 204 });
}
