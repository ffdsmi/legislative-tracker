import { NextResponse } from 'next/server';
import { computeDiff, stripHtml } from '@/lib/diff-engine';
import { isPdfContent, extractPdfText } from '@/lib/pdf-extract';
import { listTextVersions, listDiffsForBill, saveTextVersion } from '@/lib/store';
import { getBillText, decodeText } from '@/lib/legiscan';
import { requireSession } from '@/lib/session';

/**
 * Clean stored text for diffing — handles both HTML and PDF content.
 * If stored text is PDF binary, re-fetch from LegiScan and extract with pdf-parse.
 */
async function cleanTextForDiff(workspaceId, version) {
  const text = version.text;
  if (!text) return '';
  
  // If it's not PDF content, just strip HTML
  if (!isPdfContent(text)) {
    return stripHtml(text);
  }

  // It's stored PDF binary — re-fetch from LegiScan to get a clean buffer for pdf extraction.
  try {
    const textData = await getBillText(workspaceId, version.docId);
    if (textData && textData.doc) {
      const pdfBuffer = Buffer.from(textData.doc, 'base64');
      const extracted = await extractPdfText(pdfBuffer);
      
      if (extracted && extracted.length > 50 && !extracted.includes('[PDF content - text extraction failed]')) {
        // Update the stored version with clean text for future use
        await saveTextVersion(workspaceId, version.billId, version.docId, extracted, {
          date: version.date,
          type: version.type,
          mime: version.mime,
        });
        return extracted;
      }
    }
  } catch (err) {
    console.error(`Failed to extract PDF text for docId ${version.docId}:`, err.message);
  }

  return '[Unable to extract readable text from this PDF version]';
}

// GET /api/diff?billId=123 — get diffs for a bill
// GET /api/diff?billId=123&oldDocId=456&newDocId=789 — compute diff between specific versions
export async function GET(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');

    if (!billId) {
      return NextResponse.json({ error: 'billId is required' }, { status: 400 });
    }

    const oldDocId = searchParams.get('oldDocId');
    const newDocId = searchParams.get('newDocId');

    if (oldDocId && newDocId) {
      // Compare specific versions
      const versions = await listTextVersions(session.workspaceId, billId);
      const oldVersion = versions.find(v => String(v.docId) === String(oldDocId));
      const newVersion = versions.find(v => String(v.docId) === String(newDocId));

      if (!oldVersion || !newVersion) {
        return NextResponse.json({ error: 'One or both text versions not found' }, { status: 404 });
      }

      // Clean text — extract from PDF if needed, strip HTML otherwise
      const oldClean = await cleanTextForDiff(session.workspaceId, oldVersion);
      const newClean = await cleanTextForDiff(session.workspaceId, newVersion);

      if (!oldClean && !newClean) {
        return NextResponse.json({
          diff: { lines: [], stats: { additions: 0, removals: 0, unchanged: 0 } },
          oldVersion: { docId: oldVersion.docId, type: oldVersion.type, date: oldVersion.date },
          newVersion: { docId: newVersion.docId, type: newVersion.type, date: newVersion.date },
          notice: 'Could not extract readable text from these versions.',
        });
      }

      const diffResult = computeDiff(oldClean, newClean);
      return NextResponse.json({
        diff: diffResult,
        oldVersion: { docId: oldVersion.docId, type: oldVersion.type, date: oldVersion.date },
        newVersion: { docId: newVersion.docId, type: newVersion.type, date: newVersion.date },
      });
    }

    // Return all stored diffs for this bill
    const diffs = await listDiffsForBill(session.workspaceId, billId);
    const versions = await listTextVersions(session.workspaceId, billId);

    return NextResponse.json({
      billId,
      versions: versions.map(v => ({ docId: v.docId, type: v.type, date: v.date })),
      diffs: diffs.map(d => ({
        oldDocId: d.oldDocId,
        newDocId: d.newDocId,
        stats: { additions: d.additions, deletions: d.deletions },
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

