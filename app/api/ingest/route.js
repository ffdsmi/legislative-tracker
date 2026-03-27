import { NextResponse } from 'next/server';
import { ingestBill, ingestState } from '@/lib/ingest';
import { getSettings } from '@/lib/settings';

// POST /api/ingest — trigger bill ingestion
export async function POST(request) {
  const settings = getSettings();
  if (!settings.legiscanApiKey) {
    return NextResponse.json({ error: 'LegiScan API key not configured.' }, { status: 400 });
  }

  const body = await request.json();

  try {
    if (body.billId) {
      // Ingest a single bill
      const result = await ingestBill(body.billId);
      return NextResponse.json({ success: true, result });
    } else if (body.state) {
      // Ingest a state's current session
      const result = await ingestState(body.state, body.limit || 10);
      return NextResponse.json({ success: true, result });
    } else {
      return NextResponse.json({ error: 'Provide billId or state in request body.' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
