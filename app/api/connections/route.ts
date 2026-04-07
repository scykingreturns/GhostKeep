import { NextResponse } from 'next/server';
import { connectionsDb } from '@/lib/db';

export async function GET() {
  const connections = connectionsDb.getAll();
  return NextResponse.json(
    connections.map(({ access_token: _, refresh_token: __, ...rest }) => rest)
  );
}
