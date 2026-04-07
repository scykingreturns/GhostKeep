import { NextResponse } from 'next/server';
import { credentialsDb } from '@/lib/db';
import { getAyrshareProfile } from '@/lib/platforms/publisher';

export async function GET() {
  const creds = credentialsDb.get('ayrshare');
  if (!creds) {
    return NextResponse.json({ configured: false, activePlatforms: [] });
  }

  const profile = await getAyrshareProfile();
  if (!profile) {
    return NextResponse.json({ configured: true, valid: false, activePlatforms: [] });
  }

  return NextResponse.json({
    configured: true,
    valid: true,
    name: profile.name,
    email: profile.email,
    activePlatforms: profile.activePlatforms,
  });
}
