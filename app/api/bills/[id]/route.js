import { NextResponse } from 'next/server';
import { getBill, getBillText, decodeText } from '@/lib/legiscan';
import { getSettings } from '@/lib/settings';
import { loadTextVersion, loadBill } from '@/lib/store';
import { stripHtml } from '@/lib/diff-engine';
import { isPdfContent, extractPdfText } from '@/lib/pdf-extract';
import { requireSession } from '@/lib/session';

// GET /api/bills/[id] — get full bill detail from Local Postgres (with fallback to LegiScan)
export async function GET(request, { params }) {
  try {
    const session = await requireSession();
    const settings = await getSettings(session.workspaceId);
    if (!settings.legiscanApiKey) {
      return NextResponse.json({ error: 'LegiScan API key not configured.' }, { status: 200 });
    }

    const { id } = await params;

    // 1. Instantly load from local Postgres
    let bill = await loadBill(session.workspaceId, id);
    
    // 2. Fallback to live API if completely missing locally
    if (!bill) {
      console.log(`[API] Local cache miss for ${id}, falling back to LegiScan...`);
      const remote = await getBill(session.workspaceId, id);
      if (!remote) {
        return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      }
      // Re-map format precisely to match our local ORM structure
      bill = {
        id: remote.bill_id,
        number: remote.bill_number,
        title: remote.title,
        description: remote.description,
        jurisdiction: remote.state,
        session: remote.session?.session_title || '',
        status: remote.status,
        statusDate: remote.status_date,
        lastActionDate: remote.last_action_date,
        lastAction: remote.last_action,
        url: remote.url,
        stateLink: remote.state_link,
        sponsors: remote.sponsors || [],
        history: remote.history || [],
        votes: remote.votes || [],
        subjects: remote.subjects || [],
        legiscanTexts: remote.texts || [],
        changeHash: remote.change_hash
      };
    }

    // Fetch text for each version if available
    const versions = [];
    const textsArray = bill.legiscanTexts || [];
    
    if (textsArray.length > 0) {
      // Only fetch text for the first 3 versions to save API calls
      for (const textInfo of textsArray.slice(0, 3)) {
        try {
          // 1. Try to load historically ingested formatted plain text
          const localText = await loadTextVersion(session.workspaceId, bill.id, textInfo.doc_id);
          if (localText) {
            versions.push({
              docId: textInfo.doc_id,
              date: textInfo.date,
              type: textInfo.type,
              mimeId: textInfo.mime,
              url: textInfo.state_link || textInfo.url,
              text: localText.text,
            });
            continue;
          }

          // 2. Fallback to live extraction for unknown PDFs
          const textData = await getBillText(session.workspaceId, textInfo.doc_id);
          let finalText = null;
          let mimeId = textInfo.mime;
          
          if (textData && textData.doc) {
            mimeId = textData.mime || textInfo.mime;
            const decoded = decodeText(textData.doc);
            if (isPdfContent(decoded)) {
              const pdfBuffer = Buffer.from(textData.doc, 'base64');
              finalText = await extractPdfText(pdfBuffer);
            } else {
              finalText = stripHtml(decoded);
            }
          }

          versions.push({
            docId: textInfo.doc_id,
            date: textInfo.date,
            type: textInfo.type,
            mimeId: mimeId,
            url: textInfo.state_link || textInfo.url,
            text: finalText,
          });
        } catch {
          versions.push({
            docId: textInfo.doc_id,
            date: textInfo.date,
            type: textInfo.type,
            url: textInfo.state_link || textInfo.url,
            text: null,
            error: 'Could not fetch text',
          });
        }
      }
    }

    return NextResponse.json({
      bill: {
        id: bill.id,
        number: bill.number,
        title: bill.title,
        description: bill.description,
        jurisdiction: bill.jurisdiction,
        session: bill.session,
        status: bill.status,
        statusDate: bill.statusDate,
        introducedDate: bill.history?.[0]?.date || '',
        lastActionDate: bill.lastActionDate,
        lastAction: bill.lastAction,
        url: bill.url,
        stateLink: bill.stateLink,
        changeHash: bill.changeHash,
        sponsors: (bill.sponsors || []).map((s) => ({
          name: s.name,
          party: s.party,
          role: s.role,
          district: s.district,
        })),
        history: (bill.history || []).map((h) => ({
          date: h.date,
          action: h.action,
          chamber: h.chamber,
        })),
        votes: (bill.votes || []).map((v) => ({
          date: v.date,
          desc: v.desc,
          yea: v.yea,
          nay: v.nay,
          absent: v.absent,
        })),
        subjects: bill.subjects || [],
      },
      versions,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 200 });
  }
}

export const dynamic = 'force-dynamic';

