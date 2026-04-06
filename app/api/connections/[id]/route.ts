import { NextRequest, NextResponse } from 'next/server';
import { connectionsDb } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  connectionsDb.delete(id);
  return new NextResponse(null, { status: 204 });
}
