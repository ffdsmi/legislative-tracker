import { NextResponse } from 'next/server';
import { ingestBill, ingestState } from '@/lib/ingest';
import { getSettings } from '@/lib/settings';
import { requireSession } from '@/lib/session';

// POST /api/ingest — trigger bill ingestion with streaming progress
export async function POST(request) {
  try {
    const session = await requireSession();
    const settings = await getSettings(session.workspaceId);
    if (!settings.legiscanApiKey) {
      return NextResponse.json({ error: 'LegiScan API key not configured.' }, { status: 400 });
    }

    const body = await request.json();

    if (body.billId) {
      // Ingest a single bill (fast, no stream needed)
      const result = await ingestBill(session.workspaceId, body.billId);
      return NextResponse.json({ success: true, result });
    } else if (body.state) {
      // Stream state ingestion progress using Server-Sent NDJSON
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          const sendUpdate = (payload) => {
            controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
          };

          try {
            sendUpdate({ type: 'start', message: `Initializing extraction for ${body.state}...` });
            
            const result = await ingestState(
              session.workspaceId, 
              body.state, 
              body.limit || 10,
              (progress) => {
                sendUpdate({ type: 'progress', ...progress });
              }
            );

            sendUpdate({ type: 'done', result });
          } catch (err) {
            sendUpdate({ type: 'error', message: err.message });
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson'
        }
      });
    } else {
      return NextResponse.json({ error: 'Provide billId or state in request body.' }, { status: 400 });
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

