import { NextResponse } from 'next/server';
import { connectionsDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const connections = connectionsDb.getAll();
    return NextResponse.json(
      connections.map(({ access_token: _, refresh_token: __, ...rest }) => rest)
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
