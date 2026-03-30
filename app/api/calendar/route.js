import { NextResponse } from 'next/server';
import { getCalendarEvents, syncCalendar } from '@/lib/calendar';
import { getSettings } from '@/lib/settings';
import { requireSession } from '@/lib/session';

export async function GET(req) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const filters = {};
    if (state) filters.state = state;
    if (type) filters.type = type;
    if (from) filters.from = from;
    if (to) filters.to = to;

    const events = await getCalendarEvents(session.workspaceId, filters);
    return NextResponse.json({ events });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await requireSession();
    const settings = await getSettings(session.workspaceId);
    let jurisdictions = ['US'];
    if (settings.trackedJurisdictions && settings.trackedJurisdictions.length > 0) {
      jurisdictions = settings.trackedJurisdictions;
    }

    const results = [];
    for (const state of jurisdictions) {
      const events = await syncCalendar(session.workspaceId, state);
      results.push({ state, count: events.length });
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

