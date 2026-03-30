import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { saveBill, saveTextVersion } from '@/lib/store';
import { requireSession } from '@/lib/session';
import { decodeText } from '@/lib/legiscan';
import { stripHtml } from '@/lib/diff-engine';
import { isPdfContent, extractPdfText } from '@/lib/pdf-extract';
import fs from 'fs';
import os from 'os';
import path from 'path';

export async function POST(request) {
  try {
    const session = await requireSession();
    const formData = await request.formData();
    
    // --- CHUNKED UPLOAD HANDLING ---
    const chunk = formData.get('chunk');
    if (chunk) {
      const fileId = formData.get('fileId');
      const chunkIndex = parseInt(formData.get('chunkIndex'), 10);
      const tempPath = path.join(os.tmpdir(), `dataset_${fileId}.zip`);
      
      const buffer = Buffer.from(await chunk.arrayBuffer());
      
      // If it's the first chunk, ensure we start with a fresh file
      if (chunkIndex === 0) {
        fs.writeFileSync(tempPath, buffer);
      } else {
        fs.appendFileSync(tempPath, buffer);
      }
      
      return NextResponse.json({ success: true, chunkIndex });
    }

    // --- PROCESSING HANDLING ---
    const processFileId = formData.get('processFileId');
    if (!processFileId) {
      return NextResponse.json({ error: 'No processFileId or chunk provided.' }, { status: 400 });
    }

    const tempPath = path.join(os.tmpdir(), `dataset_${processFileId}.zip`);
    if (!fs.existsSync(tempPath)) {
      return NextResponse.json({ error: `File not found on server temp disk: ${tempPath}` }, { status: 400 });
    }

    // Read the fully assembled file from disk!
    const buffer = fs.readFileSync(tempPath);
    console.log(`[DATASET INGEST] Read assembled ZIP from disk: ${buffer.length} bytes`);

    const encoder = new TextEncoder();
    
    // We immediately initiate streaming to avoid a silent stalling frontend
    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (payload) => {
          controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
        };

        try {
          sendUpdate({ type: 'start', message: 'Unpacking ZIP archive into memory...' });
          
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();
          
          const billEntries = zipEntries.filter(e => !e.isDirectory && e.entryName.includes('bill/') && e.entryName.endsWith('.json'));
          const textEntries = zipEntries.filter(e => !e.isDirectory && e.entryName.includes('text/') && e.entryName.endsWith('.json'));

          let processedCount = 0;
          let textProcessedCount = 0;
          const saveErrors = [];

          sendUpdate({ type: 'progress', message: `Found ${billEntries.length} bills and ${textEntries.length} texts. Starting insertion...` });

          for (const entry of billEntries) {
            try {
              const content = entry.getData().toString('utf8');
              const data = JSON.parse(content);
              
              if (data && data.bill) {
                const bill = data.bill;
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
                  changeHash: bill.change_hash
                });
                processedCount++;
                
                // Keep the frontend updated every 50 bills
                if (processedCount % 50 === 0) {
                  sendUpdate({ type: 'progress', message: `Inserted ${processedCount} / ${billEntries.length} tracked bills. Processing...` });
                }
              }
            } catch (e) {
              saveErrors.push(`Bill Save Failed: ${e.message}`);
            }
          }

          sendUpdate({ type: 'progress', message: `Bills completed (${processedCount}). Starting Base64 Extraction for ${textEntries.length} documents...` });

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
                
                if (textProcessedCount % 50 === 0) {
                  sendUpdate({ type: 'progress', message: `Extracted ${textProcessedCount} / ${textEntries.length} text PDFs...` });
                }
              }
            } catch(e) {
              saveErrors.push(`Text Parse Failed: ${e.message}`);
            }
          }

          if (processedCount === 0 && saveErrors.length > 0) {
            sendUpdate({ type: 'error', message: `Dataset parsing failed database insertion. First error: ${saveErrors[0]}` });
            controller.close();
            return;
          }

          if (processedCount === 0 && textProcessedCount === 0) {
            const sample = zipEntries.slice(0, 5).map(e => e.entryName).join(', ');
            sendUpdate({ type: 'error', message: `Found 0 matching files in root structure. Are you sure you downloaded the JSON format? Sample: [${sample}]` });
            controller.close();
            return;
          }

          sendUpdate({ 
            type: 'done', 
            message: `Success: Migrated ${processedCount} bills and ${textProcessedCount} mapped text PDFs into the database.` 
          });
          
          try { fs.unlinkSync(tempPath); } catch(ex) { /* cleanup */ }
        } catch (err) {
          sendUpdate({ type: 'error', message: `ZIP Fault: ${err.message}` });
          try { fs.unlinkSync(tempPath); } catch(ex) { /* cleanup */ }
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
  } catch (err) {
    console.error('ZIP backfill failed:', err);
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
