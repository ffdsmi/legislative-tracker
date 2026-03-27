import { NextResponse } from 'next/server';
import { getSettings, saveSettings, getMaskedSettings } from '@/lib/settings';

// GET /api/settings — retrieve current settings (keys masked)
export async function GET() {
  const settings = getMaskedSettings();
  return NextResponse.json(settings);
}

// PUT /api/settings — update settings
export async function PUT(request) {
  const body = await request.json();
  const saved = saveSettings(body);

  // Return masked version so keys aren't sent back in full
  const masked = getMaskedSettings();
  return NextResponse.json({ success: true, settings: masked });
}
