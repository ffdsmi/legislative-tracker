import { NextResponse } from 'next/server';

// GET /api/settings — retrieve current settings
export async function GET() {
  // TODO: read from PostgreSQL once DB is connected
  const settings = {
    legiscanApiKey: '',
    congressApiKey: '',
    pollInterval: 60,
    trackedJurisdictions: ['US', 'NE'],
  };
  return NextResponse.json(settings);
}

// PUT /api/settings — update settings
export async function PUT(request) {
  const body = await request.json();
  // TODO: persist to PostgreSQL
  return NextResponse.json({ success: true, settings: body });
}
