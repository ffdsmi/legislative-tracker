import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { saveBill, saveTextVersion } from '@/lib/store';
import { requireSession } from '@/lib/session';
import { decodeText } from '@/lib/legiscan';
import { stripHtml } from '@/lib/diff-engine';
import { isPdfContent, extractPdfText } from '@/lib/pdf-extract';

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
    
    const billEntries = zipEntries.filter(e => !e.isDirectory && e.entryName.includes('bill/') && e.entryName.endsWith('.json'));
    const textEntries = zipEntries.filter(e => !e.isDirectory && e.entryName.includes('text/') && e.entryName.endsWith('.json'));

    let processedCount = 0;
    let textProcessedCount = 0;

    for (const entry of billEntries) {
      try {
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
            texts: bill.texts || [],
            votes: bill.votes || [],
            amendments: bill.amendments || [],
            supplements: bill.supplements || [],
            changeHash: bill.change_hash // CRITICAL for Delta Tracking Engine
          });
          processedCount++;
        }
      } catch (e) {
        // Skip malformed entries
      }
    }

    for (const entry of textEntries) {
      try {
        const content = entry.getData().toString('utf8');
        const data = JSON.parse(content);
        if (data && data.text) {
          const textInfo = data.text;
          const decoded = decodeText(textInfo.doc);
          
          let plainText;
          if (isPdfContent(decoded)) {
            const pdfBuffer = Buffer.from(textInfo.doc, 'base64');
            plainText = await extractPdfText(pdfBuffer);
          } else {
            plainText = stripHtml(decoded);
          }
          
          await saveTextVersion(session.workspaceId, textInfo.bill_id, textInfo.doc_id, plainText, {
            date: textInfo.date,
            type: textInfo.name || textInfo.type,
            mime: textInfo.mime,
          });
          textProcessedCount++;
        }
      } catch(e) {
        // Skip malformed textual extracts
      }
    }

    return NextResponse.json({ success: true, count: processedCount, textCount: textProcessedCount });
  } catch (err) {
    console.error('ZIP backfill failed:', err);
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
