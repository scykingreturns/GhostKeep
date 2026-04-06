import { NextResponse } from 'next/server';
import { connectionsDb } from '@/lib/db';

export async function GET() {
  try {
    const connections = connectionsDb.getAll();
    // Mask access tokens for security
    const safe = connections.map(({ access_token: _, refresh_token: __, ...rest }) => rest);
    return NextResponse.json(safe);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
