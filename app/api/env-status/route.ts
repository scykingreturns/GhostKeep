import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    twitter: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
    threads: !!(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET),
  });
}
