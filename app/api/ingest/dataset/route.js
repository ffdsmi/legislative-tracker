import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { saveBill } from '@/lib/store';
import { requireSession } from '@/lib/session';

// POST /api/ingest/dataset -> Extract a LegiScan ZIP and backfill 100% of the JSON data locally.
export async function POST(request) {
  try {
    const session = await requireSession();
    const formData = await request.formData();
    const file = formData.get('dataset');

    if (!file) {
      return NextResponse.json({ error: 'No dataset file deployed.' }, { status: 400 });
    }

    // Convert Web File stream to Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    let processedCount = 0;

    for (const entry of zipEntries) {
      // LegiScan structural standard places all discrete bill objects inside the `bill/` directory as raw .json
      if (!entry.isDirectory && entry.entryName.includes('bill/') && entry.entryName.endsWith('.json')) {
        const content = entry.getData().toString('utf8');
        const data = JSON.parse(content);
        
        if (data && data.bill) {
          const bill = data.bill;
          // Format mathematically identically to our API ingest pattern to secure the baseline data integrity
          await saveBill(session.workspaceId, {
            id: String(bill.bill_id),
            number: bill.bill_number,
            title: bill.title,
            description: bill.description,
            jurisdiction: bill.state,
            session: bill.session?.session_title || '',
            status: bill.status,
            statusDate: bill.status_date,
            lastActionDate: bill.last_action_date,
            lastAction: bill.last_action,
            url: bill.url,
            stateLink: bill.state_link,
            sponsors: bill.sponsors || [],
            subjects: bill.subjects || [],
            history: bill.history || [],
            calendar: bill.calendar || [],
            changeHash: bill.change_hash // CRITICAL for Delta Tracking Engine
          });
          processedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, count: processedCount });
  } catch (err) {
    console.error('ZIP backfill failed:', err);
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

