import { NextResponse } from 'next/server';
import { credentialsDb } from '@/lib/db';

export async function GET() {
  return NextResponse.json({
    linkedin: credentialsDb.has('linkedin'),
    twitter: credentialsDb.has('twitter'),
    threads: credentialsDb.has('threads'),
  });
}
