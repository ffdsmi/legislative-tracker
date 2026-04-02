import { NextResponse } from 'next/server';
import { getSettings, saveSettings, getMaskedSettings } from '@/lib/settings';
import { requireSession } from '@/lib/session';

// GET /api/settings — retrieve current settings (keys masked)
export async function GET() {
  try {
    const session = await requireSession();
    const settings = await getMaskedSettings(session.workspaceId);
    return NextResponse.json(settings);
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT /api/settings — update settings
export async function PUT(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const saved = await saveSettings(session.workspaceId, body);

    // Return masked version so keys aren't sent back in full
    const masked = await getMaskedSettings(session.workspaceId);
    return NextResponse.json({ success: true, settings: masked });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

