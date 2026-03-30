import { NextResponse } from 'next/server';
import { ingestBill, ingestState } from '@/lib/ingest';
import { getSettings } from '@/lib/settings';
import { requireSession } from '@/lib/session';

// POST /api/ingest — trigger bill ingestion
export async function POST(request) {
  try {
    const session = await requireSession();
    const settings = await getSettings(session.workspaceId);
    if (!settings.legiscanApiKey) {
      return NextResponse.json({ error: 'LegiScan API key not configured.' }, { status: 400 });
    }

    const body = await request.json();

    if (body.billId) {
      // Ingest a single bill
      const result = await ingestBill(session.workspaceId, body.billId);
      return NextResponse.json({ success: true, result });
    } else if (body.state) {
      // Ingest a state's current session
      const result = await ingestState(session.workspaceId, body.state, body.limit || 10);
      return NextResponse.json({ success: true, result });
    } else {
      return NextResponse.json({ error: 'Provide billId or state in request body.' }, { status: 400 });
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

